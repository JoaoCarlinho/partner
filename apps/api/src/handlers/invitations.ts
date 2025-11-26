/**
 * Public Invitations Handler
 * API endpoints for invitation validation (no authentication required)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../lib/response.js';
import { validateInvitationToken, redeemInvitation } from '../services/invitation/invitationService.js';
import { verifyDebtorIdentity, registerDebtor } from '../services/invitation/invitationRedemption.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { AuditAction } from '@steno/shared';
import { logger } from '../middleware/logger.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

// Validation schemas
const verifyIdentitySchema = z.object({
  lastFourSSN: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits').optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format').optional(),
  accountNumber: z.string().min(1).max(50).optional(),
}).refine(
  (data) => (data.lastFourSSN && data.dateOfBirth) || data.accountNumber,
  { message: 'Provide either SSN + DOB or account number' }
);

const registerDebtorSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
  email: z.string().email('Valid email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
});

const router = Router();

/**
 * GET /api/v1/invitations/:token/validate
 * Validate an invitation token (public - no auth required)
 */
router.get(
  '/:token/validate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await validateInvitationToken(token, {
        ipAddress,
        userAgent,
      });

      if (result.valid) {
        // Log successful validation (no user ID since public)
        logAuditEvent(req, {
          action: AuditAction.INVITATION_VALIDATED,
          resourceType: 'Invitation',
          metadata: {
            valid: true,
            caseReference: result.caseReference,
          },
        });

        res.json(
          successResponse({
            valid: true,
            caseReference: result.caseReference,
            expiresAt: result.expiresAt,
            remainingUses: result.remainingUses,
          })
        );
      } else {
        // Log failed validation
        logAuditEvent(req, {
          action: AuditAction.INVITATION_VALIDATION_FAILED,
          resourceType: 'Invitation',
          metadata: {
            errorCode: result.errorCode,
            status: result.status,
          },
        });

        res.status(400).json(
          errorResponse(
            result.errorMessage || 'Invalid invitation',
            result.errorCode || 'INVALID_INVITATION'
          )
        );
      }
    } catch (error) {
      logger.error('Invitation validation error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/invitations/:token/redeem
 * Redeem an invitation (increment usage count)
 * Public endpoint - called when debtor completes registration
 */
router.post(
  '/:token/redeem',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await redeemInvitation(token, {
        ipAddress,
        userAgent,
      });

      if (result.success) {
        logAuditEvent(req, {
          action: AuditAction.INVITATION_REDEEMED,
          resourceType: 'Invitation',
          resourceId: result.demandLetterId,
          metadata: {
            caseId: result.caseId,
          },
        });

        res.json(
          successResponse({
            success: true,
            message: 'Invitation redeemed successfully',
          })
        );
      } else {
        res.status(400).json(
          errorResponse('Unable to redeem invitation', 'REDEMPTION_FAILED')
        );
      }
    } catch (error) {
      logger.error('Invitation redemption error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/invitations/:token/verify
 * Verify debtor identity to access case
 * Public endpoint - no auth required
 */
router.post(
  '/:token/verify',
  validate({ body: verifyIdentitySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const { lastFourSSN, dateOfBirth, accountNumber } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Log verification attempt
      logAuditEvent(req, {
        action: AuditAction.DEBTOR_VERIFICATION_ATTEMPTED,
        resourceType: 'Invitation',
        metadata: {
          method: accountNumber ? 'account_number' : 'ssn_dob',
        },
      });

      const result = await verifyDebtorIdentity(token, {
        lastFourSSN,
        dateOfBirth,
        accountNumber,
      }, { ipAddress, userAgent });

      if (result.verified) {
        logAuditEvent(req, {
          action: AuditAction.DEBTOR_VERIFICATION_SUCCESS,
          resourceType: 'Invitation',
          metadata: {
            casePreview: result.casePreview,
          },
        });

        res.json(
          successResponse({
            verified: true,
            casePreview: result.casePreview,
            verificationToken: result.verificationToken,
          })
        );
      } else {
        const action = result.errorCode === 'VERIFICATION_LOCKED'
          ? AuditAction.DEBTOR_VERIFICATION_LOCKED
          : AuditAction.DEBTOR_VERIFICATION_FAILED;

        logAuditEvent(req, {
          action,
          resourceType: 'Invitation',
          metadata: {
            errorCode: result.errorCode,
            attemptsRemaining: result.attemptsRemaining,
          },
        });

        const statusCode = result.errorCode === 'ALREADY_REGISTERED' ? 409 : 400;
        res.status(statusCode).json(
          errorResponse(
            result.errorMessage || 'Verification failed',
            result.errorCode || 'VERIFICATION_FAILED',
            result.attemptsRemaining !== undefined ? { attemptsRemaining: result.attemptsRemaining } : undefined
          )
        );
      }
    } catch (error) {
      logger.error('Identity verification error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/invitations/:token/register
 * Register debtor account after verification
 * Public endpoint - no auth required
 */
router.post(
  '/:token/register',
  validate({ body: registerDebtorSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const { verificationToken, email, password, acceptedTerms } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await registerDebtor(token, {
        verificationToken,
        email,
        password,
        acceptedTerms,
      }, { ipAddress, userAgent });

      if (result.success) {
        // Log terms acceptance
        logAuditEvent(req, {
          action: AuditAction.DEBTOR_TERMS_ACCEPTED,
          resourceType: 'User',
          resourceId: result.userId,
          metadata: {
            termsVersion: '1.0',
          },
        });

        // Log successful registration
        logAuditEvent(req, {
          action: AuditAction.DEBTOR_REGISTERED,
          resourceType: 'User',
          resourceId: result.userId,
          metadata: {
            caseId: result.caseId,
            email: result.email,
          },
        });

        logger.info('Debtor registration complete', {
          userId: result.userId,
          caseId: result.caseId,
        });

        res.status(201).json(
          successResponse({
            userId: result.userId,
            email: result.email,
            role: result.role,
            caseId: result.caseId,
          }, {
            token: result.token,
          })
        );
      } else {
        const statusMap: Record<string, number> = {
          EMAIL_EXISTS: 409,
          ALREADY_REGISTERED: 409,
          TERMS_NOT_ACCEPTED: 400,
          INVALID_VERIFICATION_TOKEN: 401,
          CASE_NOT_FOUND: 404,
        };
        const statusCode = statusMap[result.errorCode || ''] || 400;

        res.status(statusCode).json(
          errorResponse(
            result.errorMessage || 'Registration failed',
            result.errorCode || 'REGISTRATION_FAILED'
          )
        );
      }
    } catch (error) {
      logger.error('Debtor registration error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

export default router;
