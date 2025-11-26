/**
 * Debtors Handler
 * API endpoints for debtor-specific functionality (welcome, opt-out, etc.)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../lib/response.js';
import {
  generateWelcomeMessage,
  buildWelcomeResponse,
  formatAmountRange,
} from '../services/ai/welcomeGenerator.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { AuditAction } from '@steno/shared';
import { logger } from '../middleware/logger.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// Opt-out request schema
const optOutSchema = z.object({
  optOutType: z.enum(['no_digital_contact', 'verify_debt', 'other']),
  reason: z.string().max(1000).optional(),
});

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/v1/debtors/welcome
 * Get personalized welcome message for debtor
 * Required role: DEBTOR
 */
router.get(
  '/welcome',
  authorize('cases:view:own'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Get debtor profile with case info
      const debtorProfile = await prisma.debtorProfile.findUnique({
        where: { userId },
        include: {
          case: {
            select: {
              id: true,
              creditorName: true,
              debtorName: true,
              debtAmount: true,
              metadata: true,
            },
          },
          user: {
            select: {
              organization: {
                select: {
                  name: true,
                  settings: true,
                },
              },
            },
          },
        },
      });

      if (!debtorProfile) {
        res.status(404).json(errorResponse('Debtor profile not found', 'PROFILE_NOT_FOUND'));
        return;
      }

      // Determine if this is first visit
      const isFirstVisit = !debtorProfile.welcomeShownAt;

      // Extract first name from debtor name
      const debtorFirstName = debtorProfile.case.debtorName?.split(' ')[0] || 'there';

      // Extract debt amount
      const debtAmount = Number(debtorProfile.case.debtAmount);
      const amountRange = formatAmountRange(debtAmount);

      // Generate welcome message
      const welcomeResult = await generateWelcomeMessage(debtorFirstName, {
        creditorName: debtorProfile.case.creditorName,
        amountRange,
        isFirstVisit,
      });

      // Extract organization contact info from settings
      const orgSettings = debtorProfile.user.organization.settings as {
        contactPhone?: string;
        contactEmail?: string;
        contactAddress?: string;
      } | null;

      const welcomeResponse = buildWelcomeResponse(
        welcomeResult,
        debtorFirstName,
        isFirstVisit,
        {
          phone: orgSettings?.contactPhone,
          email: orgSettings?.contactEmail,
          address: orgSettings?.contactAddress,
        }
      );

      // Update welcome_shown_at if first visit
      if (isFirstVisit) {
        await prisma.debtorProfile.update({
          where: { userId },
          data: { welcomeShownAt: new Date() },
        });
      }

      // Log the welcome view
      logAuditEvent(req, {
        action: AuditAction.DEBTOR_DATA_ACCESSED,
        resourceType: 'DebtorProfile',
        resourceId: debtorProfile.id,
        metadata: {
          type: 'welcome_view',
          isFirstVisit,
          warmth: welcomeResult.toneAnalysis.warmth,
          isAiGenerated: welcomeResult.isAiGenerated,
        },
      });

      logger.info('Welcome page viewed', {
        userId,
        caseId: debtorProfile.caseId,
        isFirstVisit,
        warmth: welcomeResult.toneAnalysis.warmth,
      });

      res.json(successResponse(welcomeResponse));
    } catch (error) {
      logger.error('Welcome generation error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/debtors/opt-out
 * Request to opt out of digital communications
 * Required role: DEBTOR
 */
router.post(
  '/opt-out',
  authorize('cases:view:own'),
  validate({ body: optOutSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { optOutType, reason } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Get debtor profile
      const debtorProfile = await prisma.debtorProfile.findUnique({
        where: { userId },
        include: {
          case: {
            select: {
              id: true,
              creditorName: true,
              organizationId: true,
              metadata: true,
            },
          },
        },
      });

      if (!debtorProfile) {
        res.status(404).json(errorResponse('Debtor profile not found', 'PROFILE_NOT_FOUND'));
        return;
      }

      // Store opt-out request in case metadata or separate table
      // For now, we'll update the case metadata
      const currentMetadata = (debtorProfile.case.metadata || {}) as Record<string, unknown>;
      const optOutRequests = (currentMetadata.optOutRequests || []) as Array<{
        type: string;
        reason?: string;
        timestamp: string;
        ipAddress?: string;
      }>;

      optOutRequests.push({
        type: optOutType,
        reason,
        timestamp: new Date().toISOString(),
        ipAddress,
      });

      // Update case metadata with opt-out request
      await prisma.case.update({
        where: { id: debtorProfile.caseId },
        data: {
          metadata: {
            ...currentMetadata,
            optOutRequests,
            hasOptedOut: optOutType === 'no_digital_contact',
          },
        },
      });

      // Log the opt-out request
      logAuditEvent(req, {
        action: AuditAction.DEBTOR_PROFILE_UPDATED,
        resourceType: 'DebtorProfile',
        resourceId: debtorProfile.id,
        metadata: {
          type: 'opt_out_request',
          optOutType,
          reason,
        },
      });

      logger.info('Opt-out request received', {
        userId,
        caseId: debtorProfile.caseId,
        optOutType,
      });

      // Return appropriate next steps based on opt-out type
      let nextSteps: string;
      switch (optOutType) {
        case 'no_digital_contact':
          nextSteps = `Your request has been recorded. You will no longer receive digital communications. ` +
            `Any required notices will be sent to you by mail. You can still access this platform if you change your mind.`;
          break;
        case 'verify_debt':
          nextSteps = `Your request for debt verification has been recorded. ` +
            `${debtorProfile.case.creditorName} will send written verification within 30 days.`;
          break;
        default:
          nextSteps = `Your request has been recorded. A representative will contact you within 2-3 business days.`;
      }

      res.json(
        successResponse({
          message: 'Your request has been recorded.',
          nextSteps,
          requestType: optOutType,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Opt-out request error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/debtors/profile
 * Get debtor profile and case overview
 * Required role: DEBTOR
 */
router.get(
  '/profile',
  authorize('cases:view:own'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const debtorProfile = await prisma.debtorProfile.findUnique({
        where: { userId },
        include: {
          case: {
            select: {
              id: true,
              creditorName: true,
              debtorName: true,
              debtAmount: true,
              status: true,
              createdAt: true,
            },
          },
          user: {
            select: {
              email: true,
              createdAt: true,
            },
          },
        },
      });

      if (!debtorProfile) {
        res.status(404).json(errorResponse('Debtor profile not found', 'PROFILE_NOT_FOUND'));
        return;
      }

      // Log the profile view
      logAuditEvent(req, {
        action: AuditAction.DEBTOR_DATA_ACCESSED,
        resourceType: 'DebtorProfile',
        resourceId: debtorProfile.id,
        metadata: {
          type: 'profile_view',
        },
      });

      res.json(
        successResponse({
          id: debtorProfile.id,
          email: debtorProfile.user.email,
          firstName: debtorProfile.case.debtorName?.split(' ')[0] || 'Guest',
          onboardingCompleted: debtorProfile.onboardingCompleted,
          case: {
            id: debtorProfile.case.id,
            creditorName: debtorProfile.case.creditorName,
            amount: Number(debtorProfile.case.debtAmount),
            status: debtorProfile.case.status,
          },
          memberSince: debtorProfile.user.createdAt.toISOString(),
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
