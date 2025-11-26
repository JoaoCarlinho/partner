/**
 * Invitation Redemption Service
 * Business logic for debtor identity verification and account registration
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../middleware/logger.js';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { validateInvitationToken, redeemInvitation } from './invitationService.js';
import { extractTokenId } from './tokenGenerator.js';

// Constants
const MAX_VERIFICATION_ATTEMPTS = 3;
const LOCKOUT_DURATION_MINUTES = 30;
const VERIFICATION_TOKEN_EXPIRY_MINUTES = 15;
const PASSWORD_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

/**
 * Verification request data
 */
export interface VerificationRequest {
  lastFourSSN?: string;
  dateOfBirth?: string; // YYYY-MM-DD format
  accountNumber?: string;
}

/**
 * Case preview returned after successful verification
 */
export interface CasePreview {
  debtorFirstName: string;
  creditorName: string;
  referenceNumber?: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  verified: boolean;
  casePreview?: CasePreview;
  verificationToken?: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Registration request data
 */
export interface RegistrationRequest {
  verificationToken: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

/**
 * Registration result
 */
export interface RegistrationResult {
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  caseId?: string;
  token?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Verify debtor identity against case data
 */
export async function verifyDebtorIdentity(
  invitationToken: string,
  verification: VerificationRequest,
  options: { ipAddress?: string; userAgent?: string } = {}
): Promise<VerificationResult> {
  // Validate the invitation token first
  const tokenValidation = await validateInvitationToken(invitationToken, options);
  if (!tokenValidation.valid) {
    return {
      verified: false,
      errorCode: tokenValidation.errorCode,
      errorMessage: tokenValidation.errorMessage,
    };
  }

  // Extract token ID to get case
  const tokenId = extractTokenId(invitationToken);
  if (!tokenId) {
    return {
      verified: false,
      errorCode: 'INVALID_TOKEN',
      errorMessage: 'Invalid invitation link',
    };
  }

  // Get demand letter and case
  const demandLetter = await prisma.demandLetter.findFirst({
    where: { invitationTokenId: tokenId },
    include: {
      case: true,
    },
  });

  if (!demandLetter || !demandLetter.case) {
    return {
      verified: false,
      errorCode: 'CASE_NOT_FOUND',
      errorMessage: 'Case not found',
    };
  }

  const caseData = demandLetter.case;

  // Check if verification is locked
  if (caseData.verificationLockedUntil && caseData.verificationLockedUntil > new Date()) {
    return {
      verified: false,
      lockedUntil: caseData.verificationLockedUntil.toISOString(),
      errorCode: 'VERIFICATION_LOCKED',
      errorMessage: 'Too many failed attempts. Please try again later.',
    };
  }

  // Check if debtor already registered
  const existingProfile = await prisma.debtorProfile.findUnique({
    where: { caseId: caseData.id },
  });

  if (existingProfile) {
    return {
      verified: false,
      errorCode: 'ALREADY_REGISTERED',
      errorMessage: 'An account already exists for this case. Please log in instead.',
    };
  }

  // Perform verification
  let verified = false;

  // Method 1: SSN (last 4) + DOB verification
  if (verification.lastFourSSN && verification.dateOfBirth && caseData.debtorSsnHash) {
    const ssnMatch = await bcrypt.compare(verification.lastFourSSN, caseData.debtorSsnHash);
    const dobMatch = caseData.debtorDob &&
      formatDate(caseData.debtorDob) === verification.dateOfBirth;
    verified = ssnMatch && dobMatch;
  }

  // Method 2: Account number verification (alternative)
  if (!verified && verification.accountNumber && caseData.accountNumber) {
    verified = verification.accountNumber === caseData.accountNumber;
  }

  // Update verification attempts
  if (!verified) {
    const newAttempts = (caseData.verificationAttempts || 0) + 1;
    const shouldLock = newAttempts >= MAX_VERIFICATION_ATTEMPTS;

    await prisma.case.update({
      where: { id: caseData.id },
      data: {
        verificationAttempts: newAttempts,
        verificationLockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
          : null,
      },
    });

    logger.warn('Verification failed', {
      caseId: caseData.id,
      attempts: newAttempts,
      locked: shouldLock,
      ipAddress: options.ipAddress,
    });

    if (shouldLock) {
      return {
        verified: false,
        attemptsRemaining: 0,
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString(),
        errorCode: 'VERIFICATION_LOCKED',
        errorMessage: 'Too many failed attempts. Please try again later.',
      };
    }

    return {
      verified: false,
      attemptsRemaining: MAX_VERIFICATION_ATTEMPTS - newAttempts,
      errorCode: 'VERIFICATION_FAILED',
      errorMessage: "The information provided doesn't match our records.",
    };
  }

  // Reset verification attempts on success
  await prisma.case.update({
    where: { id: caseData.id },
    data: {
      verificationAttempts: 0,
      verificationLockedUntil: null,
    },
  });

  // Generate short-lived verification token for registration step
  const verificationTokenPayload = {
    caseId: caseData.id,
    demandLetterId: demandLetter.id,
    invitationTokenId: tokenId,
    exp: Math.floor(Date.now() / 1000) + (VERIFICATION_TOKEN_EXPIRY_MINUTES * 60),
  };

  const verificationToken = jwt.sign(verificationTokenPayload, JWT_SECRET);

  // Extract first name from debtor name
  const debtorFirstName = caseData.debtorName?.split(' ')[0] || 'Valued Customer';

  logger.info('Verification successful', {
    caseId: caseData.id,
    ipAddress: options.ipAddress,
  });

  return {
    verified: true,
    casePreview: {
      debtorFirstName,
      creditorName: caseData.creditorName,
      referenceNumber: caseData.referenceNumber || undefined,
    },
    verificationToken,
  };
}

/**
 * Register a debtor account after successful verification
 */
export async function registerDebtor(
  invitationToken: string,
  registration: RegistrationRequest,
  options: { ipAddress?: string; userAgent?: string } = {}
): Promise<RegistrationResult> {
  // Validate terms acceptance
  if (!registration.acceptedTerms) {
    return {
      success: false,
      errorCode: 'TERMS_NOT_ACCEPTED',
      errorMessage: 'You must accept the terms of service to continue.',
    };
  }

  // Validate invitation token is still valid
  const tokenValidation = await validateInvitationToken(invitationToken, options);
  if (!tokenValidation.valid) {
    return {
      success: false,
      errorCode: tokenValidation.errorCode,
      errorMessage: tokenValidation.errorMessage,
    };
  }

  // Verify the verification token
  let verificationPayload: { caseId: string; demandLetterId: string; invitationTokenId: string };
  try {
    verificationPayload = jwt.verify(registration.verificationToken, JWT_SECRET) as typeof verificationPayload;
  } catch {
    return {
      success: false,
      errorCode: 'INVALID_VERIFICATION_TOKEN',
      errorMessage: 'Your verification has expired. Please start over.',
    };
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: registration.email.toLowerCase() },
  });

  if (existingUser) {
    return {
      success: false,
      errorCode: 'EMAIL_EXISTS',
      errorMessage: 'An account with this email already exists. Please log in instead.',
    };
  }

  // Get case to determine organization
  const caseData = await prisma.case.findUnique({
    where: { id: verificationPayload.caseId },
  });

  if (!caseData) {
    return {
      success: false,
      errorCode: 'CASE_NOT_FOUND',
      errorMessage: 'Case not found.',
    };
  }

  // Check if debtor profile already exists
  const existingProfile = await prisma.debtorProfile.findUnique({
    where: { caseId: caseData.id },
  });

  if (existingProfile) {
    return {
      success: false,
      errorCode: 'ALREADY_REGISTERED',
      errorMessage: 'An account already exists for this case.',
    };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(registration.password, PASSWORD_SALT_ROUNDS);

  // Create user, debtor profile, and session in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user with DEBTOR role
    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        organizationId: caseData.organizationId,
        email: registration.email.toLowerCase(),
        passwordHash,
        role: 'DEBTOR',
        emailVerified: true, // Verified via invitation process
      },
    });

    // Create debtor profile
    await tx.debtorProfile.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        caseId: caseData.id,
        invitationTokenUsed: invitationToken,
        termsAcceptedAt: new Date(),
        termsAcceptedIp: options.ipAddress,
        termsVersion: '1.0', // TODO: Make configurable
      },
    });

    // Link user to case
    await tx.case.update({
      where: { id: caseData.id },
      data: { debtorUserId: user.id },
    });

    // Create session
    const sessionId = randomUUID();
    const csrfToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await tx.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: sessionId, // In production, this should be hashed
        csrfToken,
        expiresAt,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    });

    return { user, sessionId };
  });

  // Redeem the invitation (increment usage count)
  await redeemInvitation(invitationToken, options);

  // Generate JWT for authentication
  const authToken = jwt.sign(
    {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      organizationId: result.user.organizationId,
      sessionId: result.sessionId,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  logger.info('Debtor registered', {
    userId: result.user.id,
    caseId: caseData.id,
    ipAddress: options.ipAddress,
  });

  return {
    success: true,
    userId: result.user.id,
    email: result.user.email,
    role: 'DEBTOR',
    caseId: caseData.id,
    token: authToken,
  };
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Custom error class for redemption errors
 */
export class RedemptionError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'RedemptionError';
    this.code = code;
  }
}
