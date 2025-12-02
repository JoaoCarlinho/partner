/**
 * Defenders Handler
 * API endpoints for managing public defender invitations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '../lib/response.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { AuditAction } from '@steno/shared';
import { logger } from '../middleware/logger.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { sendEmail } from '../services/email/sesClient.js';

const APP_URL = process.env.APP_URL || 'https://d13ip2cieye91r.cloudfront.net';

/**
 * Send defender invitation email via SES
 */
async function sendDefenderInvitationEmail(
  email: string,
  inviteCode: string,
  organizationName: string,
  expiresAt: Date
): Promise<void> {
  const inviteUrl = `${APP_URL}/defender/accept-invitation?token=${inviteCode}`;
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await sendEmail({
    to: email,
    subject: "You're Invited to Join Steno as a Public Defender",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #493087;">You're Invited!</h1>
        <p>You've been invited to join <strong>Steno</strong> as a public defender representing <strong>${organizationName}</strong>.</p>
        <p>Steno helps public defenders efficiently manage cases and communicate with clients through our secure platform.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="background-color: #493087; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666;">This invitation will expire on ${expiresFormatted}.</p>
        <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
    text: `You've been invited to join Steno as a public defender representing ${organizationName}.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation expires on ${expiresFormatted}.`,
  });
}

// Validation schemas
const sendInvitationSchema = z.object({
  email: z.string().email('Valid email is required'),
  organizationName: z.string().optional(),
});

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/v1/defenders/invitations
 * List all defender invitations for the organization
 */
router.get(
  '/invitations',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
        return;
      }

      const invitations = await prisma.organizationInvite.findMany({
        where: {
          organizationId: req.user.organizationId,
          role: 'PUBLIC_DEFENDER',
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      // Transform to match frontend expectations
      const transformedInvitations = invitations.map((inv: (typeof invitations)[number]) => ({
        id: inv.id,
        email: inv.email,
        token: inv.inviteCode,
        invitedBy: req.user!.email,
        organizationName: inv.organization.name,
        expiresAt: inv.expiresAt.toISOString(),
        redeemedAt: inv.acceptedAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
      }));

      logger.info('Fetched defender invitations', {
        organizationId: req.user.organizationId,
        count: transformedInvitations.length,
      });

      res.json(successResponse({ invitations: transformedInvitations }));
    } catch (error) {
      logger.error('Error fetching defender invitations', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/defenders/invitations
 * Create a new defender invitation
 */
router.post(
  '/invitations',
  validate({ body: sendInvitationSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
        return;
      }

      const { email } = req.body;

      // Check if an active invitation already exists for this email
      const existingInvite = await prisma.organizationInvite.findFirst({
        where: {
          organizationId: req.user.organizationId,
          email: email.toLowerCase(),
          role: 'PUBLIC_DEFENDER',
          acceptedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvite) {
        res.status(409).json(
          errorResponse('An active invitation already exists for this email', 'INVITATION_EXISTS')
        );
        return;
      }

      // Check if user already exists with this email
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(409).json(
          errorResponse('A user with this email already exists', 'USER_EXISTS')
        );
        return;
      }

      // Generate invitation code
      const inviteCode = uuidv4();

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await prisma.organizationInvite.create({
        data: {
          organizationId: req.user.organizationId,
          email: email.toLowerCase(),
          role: 'PUBLIC_DEFENDER',
          inviteCode,
          expiresAt,
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      // Log audit event
      logAuditEvent(req, {
        action: AuditAction.INVITATION_CREATED,
        resourceType: 'Invitation',
        resourceId: invitation.id,
        metadata: {
          email: email.toLowerCase(),
          role: 'PUBLIC_DEFENDER',
          expiresAt: expiresAt.toISOString(),
        },
      });

      logger.info('Created defender invitation', {
        invitationId: invitation.id,
        email: email.toLowerCase(),
        organizationId: req.user.organizationId,
      });

      // Send invitation email
      try {
        await sendDefenderInvitationEmail(
          email.toLowerCase(),
          inviteCode,
          invitation.organization.name,
          expiresAt
        );
        logger.info('Sent defender invitation email', {
          invitationId: invitation.id,
          email: email.toLowerCase(),
        });
      } catch (emailError) {
        logger.error('Failed to send defender invitation email', {
          invitationId: invitation.id,
          email: email.toLowerCase(),
          error: (emailError as Error).message,
        });
        // Don't fail the request if email fails - invitation is still created
      }

      // Transform response
      const response = {
        id: invitation.id,
        email: invitation.email,
        token: invitation.inviteCode,
        invitedBy: req.user.email,
        organizationName: invitation.organization.name,
        expiresAt: invitation.expiresAt.toISOString(),
        redeemedAt: null,
        createdAt: invitation.createdAt.toISOString(),
      };

      res.status(201).json(successResponse(response));
    } catch (error) {
      logger.error('Error creating defender invitation', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/defenders/invitations/:id/resend
 * Resend a defender invitation (extends expiration)
 */
router.post(
  '/invitations/:id/resend',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
        return;
      }

      const { id } = req.params;

      // Find the invitation
      const invitation = await prisma.organizationInvite.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
          role: 'PUBLIC_DEFENDER',
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!invitation) {
        res.status(404).json(errorResponse('Invitation not found', 'NOT_FOUND'));
        return;
      }

      if (invitation.acceptedAt) {
        res.status(400).json(
          errorResponse('Cannot resend an already accepted invitation', 'ALREADY_ACCEPTED')
        );
        return;
      }

      // Extend expiration by 7 days from now
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const updatedInvitation = await prisma.organizationInvite.update({
        where: { id },
        data: {
          expiresAt: newExpiresAt,
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      // Log audit event (use ORG_USER_INVITED for resend since INVITATION_RESENT doesn't exist)
      logAuditEvent(req, {
        action: AuditAction.ORG_USER_INVITED,
        resourceType: 'Invitation',
        resourceId: id,
        metadata: {
          email: invitation.email,
          newExpiresAt: newExpiresAt.toISOString(),
          action: 'resent',
        },
      });

      logger.info('Resent defender invitation', {
        invitationId: id,
        email: invitation.email,
        newExpiresAt: newExpiresAt.toISOString(),
      });

      // Resend invitation email
      try {
        await sendDefenderInvitationEmail(
          updatedInvitation.email,
          updatedInvitation.inviteCode,
          updatedInvitation.organization.name,
          newExpiresAt
        );
        logger.info('Sent defender invitation email (resend)', {
          invitationId: id,
          email: updatedInvitation.email,
        });
      } catch (emailError) {
        logger.error('Failed to send defender invitation email (resend)', {
          invitationId: id,
          email: updatedInvitation.email,
          error: (emailError as Error).message,
        });
      }

      // Transform response
      const response = {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        token: updatedInvitation.inviteCode,
        invitedBy: req.user.email,
        organizationName: updatedInvitation.organization.name,
        expiresAt: updatedInvitation.expiresAt.toISOString(),
        redeemedAt: null,
        createdAt: updatedInvitation.createdAt.toISOString(),
      };

      res.json(successResponse(response));
    } catch (error) {
      logger.error('Error resending defender invitation', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/defenders/invitations/:id
 * Revoke (delete) a defender invitation
 */
router.delete(
  '/invitations/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
        return;
      }

      const { id } = req.params;

      // Find the invitation
      const invitation = await prisma.organizationInvite.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
          role: 'PUBLIC_DEFENDER',
        },
      });

      if (!invitation) {
        res.status(404).json(errorResponse('Invitation not found', 'NOT_FOUND'));
        return;
      }

      if (invitation.acceptedAt) {
        res.status(400).json(
          errorResponse('Cannot revoke an already accepted invitation', 'ALREADY_ACCEPTED')
        );
        return;
      }

      // Delete the invitation
      await prisma.organizationInvite.delete({
        where: { id },
      });

      // Log audit event
      logAuditEvent(req, {
        action: AuditAction.INVITATION_REVOKED,
        resourceType: 'Invitation',
        resourceId: id,
        metadata: {
          email: invitation.email,
        },
      });

      logger.info('Revoked defender invitation', {
        invitationId: id,
        email: invitation.email,
      });

      res.json(successResponse({ message: 'Invitation revoked successfully' }));
    } catch (error) {
      logger.error('Error revoking defender invitation', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

export default router;
