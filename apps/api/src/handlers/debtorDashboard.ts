/**
 * Debtor Dashboard Handler
 * API endpoint for debtor case dashboard data
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { logger } from '../middleware/logger.js';
import { prisma } from '../lib/prisma.js';
import { AuditAction } from '@steno/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Use the proper enum value
const AUDIT_ACTION_DASHBOARD_VIEWED = AuditAction.DEBTOR_DASHBOARD_VIEWED;

/**
 * Format currency amount for display
 */
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Mask account number to show only last 4 digits
 */
function maskAccountNumber(accountNumber: string | null | undefined): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `****${accountNumber.slice(-4)}`;
}

/**
 * Calculate countdown and urgency from deadline
 */
function calculateCountdown(deadline: Date | null | undefined): {
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  displayText: string;
} {
  if (!deadline) {
    return {
      daysRemaining: -1,
      hoursRemaining: -1,
      isExpired: false,
      urgencyLevel: 'low',
      displayText: 'No deadline set',
    };
  }

  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      isExpired: true,
      urgencyLevel: 'critical',
      displayText: 'Response deadline has passed',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  if (days > 14) urgencyLevel = 'low';
  else if (days > 7) urgencyLevel = 'medium';
  else if (days > 3) urgencyLevel = 'high';
  else urgencyLevel = 'critical';

  const displayText = days > 0
    ? `${days} day${days !== 1 ? 's' : ''} remaining`
    : `${hours} hour${hours !== 1 ? 's' : ''} remaining`;

  return { daysRemaining: days, hoursRemaining: hours, isExpired: false, urgencyLevel, displayText };
}

/**
 * GET /api/v1/debtors/dashboard
 * Get debtor's case dashboard data
 * Required role: DEBTOR
 */
router.get(
  '/dashboard',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const organizationId = req.user!.organizationId;

      // Only debtors can access this endpoint
      if (userRole !== 'DEBTOR') {
        res.status(403).json(errorResponse('Access denied. Debtor role required.', 'FORBIDDEN'));
        return;
      }

      // Get debtor's profile and case
      const debtorProfile = await prisma.debtorProfile.findUnique({
        where: { userId },
        include: {
          case: {
            include: {
              demandLetters: {
                where: { status: 'SENT' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!debtorProfile || !debtorProfile.case) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      const caseData = debtorProfile.case;
      const latestLetter = caseData.demandLetters[0];

      // Calculate amounts
      const debtAmount = Number(caseData.debtAmount);
      // In a real implementation, these would come from a debt calculation service
      // For now, we'll use placeholder breakdown
      const principal = debtAmount * 0.82; // ~82% principal
      const interest = debtAmount * 0.12;  // ~12% interest
      const fees = debtAmount * 0.06;      // ~6% fees

      // Calculate deadline (30 days from letter sent, or case-specific deadline)
      let responseDeadline: Date | null = null;
      if (latestLetter?.invitationExpiresAt) {
        responseDeadline = latestLetter.invitationExpiresAt;
      } else if (latestLetter?.sentAt) {
        responseDeadline = new Date(latestLetter.sentAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const countdown = calculateCountdown(responseDeadline);

      // Determine available options based on case state
      const disputeWindowOpen = countdown.daysRemaining > 0 || !countdown.isExpired;
      const options = {
        canPay: caseData.status === 'ACTIVE',
        canDispute: caseData.status === 'ACTIVE' && disputeWindowOpen,
        canNegotiate: caseData.status === 'ACTIVE',
        disputeWindowOpen,
      };

      // Check if paraphrase is available
      const paraphraseAvailable = !!latestLetter?.paraphrasedContent;

      // Audit log
      logAuditEvent(req, {
        action: AUDIT_ACTION_DASHBOARD_VIEWED,
        resourceType: 'Case',
        resourceId: caseData.id,
        metadata: {
          caseStatus: caseData.status,
          urgencyLevel: countdown.urgencyLevel,
        },
      });

      logger.info('Dashboard data retrieved', {
        userId,
        caseId: caseData.id,
        status: caseData.status,
      });

      res.json(
        successResponse({
          caseId: caseData.id,
          status: caseData.status.toLowerCase() as 'active' | 'resolved' | 'disputed',
          amount: {
            total: debtAmount,
            principal: Math.round(principal * 100) / 100,
            interest: Math.round(interest * 100) / 100,
            fees: Math.round(fees * 100) / 100,
            currency: 'USD',
            formatted: {
              total: formatCurrency(debtAmount),
              principal: formatCurrency(principal),
              interest: formatCurrency(interest),
              fees: formatCurrency(fees),
            },
          },
          creditor: {
            name: caseData.creditorName,
            originalCreditor: caseData.creditorName, // In real impl, might be different
            accountNumber: maskAccountNumber(caseData.accountNumber),
          },
          timeline: {
            debtOriginDate: caseData.createdAt.toISOString(),
            responseDeadline: responseDeadline?.toISOString() || null,
            daysRemaining: countdown.daysRemaining,
            hoursRemaining: countdown.hoursRemaining,
            isExpired: countdown.isExpired,
            urgencyLevel: countdown.urgencyLevel,
            displayText: countdown.displayText,
          },
          options,
          paraphraseAvailable,
          debtor: {
            firstName: caseData.debtorName?.split(' ')[0] || 'Customer',
            onboardingCompleted: debtorProfile.onboardingCompleted,
          },
        })
      );
    } catch (error) {
      logger.error('Dashboard endpoint error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/debtors/case-summary
 * Get a brief summary of the debtor's case (for mobile/compact views)
 */
router.get(
  '/case-summary',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== 'DEBTOR') {
        res.status(403).json(errorResponse('Access denied', 'FORBIDDEN'));
        return;
      }

      const debtorProfile = await prisma.debtorProfile.findUnique({
        where: { userId },
        include: {
          case: true,
        },
      });

      if (!debtorProfile || !debtorProfile.case) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      const caseData = debtorProfile.case;

      res.json(
        successResponse({
          caseId: caseData.id,
          totalOwed: formatCurrency(Number(caseData.debtAmount)),
          creditor: caseData.creditorName,
          status: caseData.status.toLowerCase(),
        })
      );
    } catch (error) {
      logger.error('Case summary endpoint error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

export default router;
