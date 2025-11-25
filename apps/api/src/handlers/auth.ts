import { Router, Request, Response, NextFunction } from 'express';
import {
  registerSchema,
  verifyEmailSchema,
  RegisterInput,
  Role
} from '@steno/shared';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import {
  generateEmailVerificationToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken
} from '../lib/tokens.js';
import { AppError, Errors } from '../lib/errors.js';
import { sendCreated, sendSuccess } from '../lib/response.js';
import { sendVerificationEmail } from '../services/email/sesClient.js';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 *
 * AC1: Email validation (format validation, uniqueness check)
 * AC2: Password requirements enforced (12+ chars, complexity)
 * AC3: Password hashed with bcrypt (cost factor 12)
 * AC4: Email verification flow with secure token
 * AC5: Organization association (via invite code or org creation)
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input with Zod schema (AC1, AC2)
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(err.message);
      });
      throw Errors.validation('Invalid registration data', fieldErrors);
    }

    const { email, password, organizationName, inviteCode } = validation.data;

    // Check email uniqueness (AC1)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw Errors.conflict('An account with this email already exists');
    }

    // Hash password with bcrypt (AC3)
    const passwordHash = await hashPassword(password);

    // Handle organization association (AC5)
    let organizationId: string;
    let userRole: Role = Role.PARALEGAL;

    if (inviteCode) {
      // Join existing organization via invite
      const invite = await prisma.organizationInvite.findUnique({
        where: { inviteCode },
        include: { organization: true },
      });

      if (!invite) {
        throw Errors.validation('Invalid invite code', { inviteCode: ['Invite code not found'] });
      }

      if (invite.expiresAt < new Date()) {
        throw Errors.validation('Invite code expired', { inviteCode: ['This invite has expired'] });
      }

      if (invite.acceptedAt) {
        throw Errors.validation('Invite already used', { inviteCode: ['This invite has already been used'] });
      }

      if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
        throw Errors.validation('Email mismatch', { email: ['This invite was sent to a different email address'] });
      }

      organizationId = invite.organizationId;
      userRole = invite.role;

      // Mark invite as used
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    } else if (organizationName) {
      // Create new organization
      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          settings: {},
        },
      });
      organizationId = organization.id;
      userRole = Role.FIRM_ADMIN; // Creator becomes admin
    } else {
      // This shouldn't happen due to Zod validation, but handle defensively
      throw Errors.validation('Organization required', {
        organizationName: ['Either organizationName or inviteCode is required']
      });
    }

    // Create user with email_verified=false (AC4)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        organizationId,
        role: userRole,
        emailVerified: false,
      },
    });

    // Generate email verification token (AC4)
    const { token, hash, expiresAt } = generateEmailVerificationToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      },
    });

    // Send verification email (AC4)
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      // Log but don't fail registration if email fails
      console.error('Failed to send verification email:', emailError);
    }

    // Return success response (AC5)
    sendCreated(res, {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/verify-email
 * Verify email address using token
 *
 * AC4: Email verification flow
 */
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      throw Errors.validation('Invalid token format');
    }

    const { token } = validation.data;
    const tokenHash = hashToken(token);

    // Find token
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    // Return same error for all failure cases to prevent enumeration
    if (!verificationToken) {
      throw Errors.validation('Invalid or expired verification token');
    }

    if (verificationToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw Errors.validation('Invalid or expired verification token');
    }

    // Update user email_verified status
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    });

    // Delete used token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/resend-verification
 * Resend email verification link
 */
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw Errors.validation('Email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || user.emailVerified) {
      sendSuccess(res, { message: 'If an unverified account exists, a verification email has been sent' });
      return;
    }

    // Delete any existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate new token
    const { token, hash, expiresAt } = generateEmailVerificationToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    sendSuccess(res, { message: 'If an unverified account exists, a verification email has been sent' });
  } catch (error) {
    next(error);
  }
});

export default router;
