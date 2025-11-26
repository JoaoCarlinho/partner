/**
 * Public Invitations Handler
 * API endpoints for invitation validation (no authentication required)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../lib/response.js';
import { validateInvitationToken, redeemInvitation } from '../services/invitation/invitationService.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { AuditAction } from '@steno/shared';
import { logger } from '../middleware/logger.js';

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

export default router;
