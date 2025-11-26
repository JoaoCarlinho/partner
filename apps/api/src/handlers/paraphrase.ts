/**
 * Paraphrase Handler
 * API endpoints for demand letter paraphrasing (debtor access)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { paraphraseDemandLetter } from '../services/ai/paraphraser.js';
import { extractKeyInfo } from '../services/ai/keyInfoExtractor.js';
import { validateReadability } from '../services/text/readability.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { logger } from '../middleware/logger.js';
import { prisma } from '../lib/prisma.js';

// Audit action for paraphrasing (to be added to @steno/shared)
const AUDIT_ACTION_DEMAND_LETTER_PARAPHRASED = 'DEMAND_LETTER_PARAPHRASED';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/demands/:demandId/paraphrase
 * Paraphrase a demand letter into plain English
 * Required role: DEBTOR (own case only) or FIRM_ADMIN/ATTORNEY/PARALEGAL
 */
router.post(
  '/:demandId/paraphrase',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const organizationId = req.user!.organizationId;

      // Get the demand letter
      const demandLetter = await prisma.demandLetter.findFirst({
        where: {
          id: demandId,
          organizationId,
        },
        include: {
          case: true,
        },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // For debtors, verify they own the case
      if (userRole === 'DEBTOR') {
        if (demandLetter.case.debtorUserId !== userId) {
          res.status(403).json(errorResponse('Access denied', 'FORBIDDEN'));
          return;
        }
      }

      // Check if already paraphrased
      if (demandLetter.paraphrasedContent) {
        logger.info('Returning cached paraphrased content', { demandId });

        // Extract key info from original
        const keyInfoResult = await extractKeyInfo(demandLetter.content);

        // Calculate days remaining if deadline exists
        let daysRemaining: number | undefined;
        if (keyInfoResult.keyInfo?.responseDeadline) {
          const deadline = new Date(keyInfoResult.keyInfo.responseDeadline);
          daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }

        res.json(
          successResponse({
            demandId,
            originalContent: demandLetter.content,
            paraphrasedContent: demandLetter.paraphrasedContent,
            readabilityScore: validateReadability(demandLetter.paraphrasedContent),
            keyInfo: keyInfoResult.keyInfo,
            displayInfo: keyInfoResult.displayInfo,
            generatedAt: demandLetter.updatedAt.toISOString(),
          })
        );
        return;
      }

      // Generate paraphrase
      logger.info('Starting paraphrase generation', { demandId });

      // Extract key info first
      const keyInfoResult = await extractKeyInfo(demandLetter.content);

      // Build summary context from extracted info
      const summaryContext = keyInfoResult.keyInfo
        ? {
            totalAmount: keyInfoResult.keyInfo.totalAmount.total,
            creditorName: keyInfoResult.keyInfo.creditorName,
            deadline: keyInfoResult.keyInfo.responseDeadline || undefined,
            daysRemaining: keyInfoResult.displayInfo?.timeline.daysRemaining || undefined,
          }
        : undefined;

      // Generate paraphrase
      const paraphraseResult = await paraphraseDemandLetter(
        demandLetter.content,
        summaryContext
      );

      if (!paraphraseResult.success || !paraphraseResult.paraphrasedContent) {
        res.status(500).json(
          errorResponse(
            paraphraseResult.errorMessage || 'Paraphrasing failed',
            paraphraseResult.errorCode || 'PARAPHRASE_ERROR'
          )
        );
        return;
      }

      // Store paraphrased content
      await prisma.demandLetter.update({
        where: { id: demandId },
        data: {
          paraphrasedContent: paraphraseResult.paraphrasedContent,
        },
      });

      // Audit log
      logAuditEvent(req, {
        action: AUDIT_ACTION_DEMAND_LETTER_PARAPHRASED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          caseId: demandLetter.caseId,
          readabilityGrade: paraphraseResult.readability?.grade,
          readabilityPasses: paraphraseResult.readability?.passes,
        },
      });

      logger.info('Paraphrase generated and stored', {
        demandId,
        readabilityGrade: paraphraseResult.readability?.grade,
      });

      res.json(
        successResponse({
          demandId,
          originalContent: demandLetter.content,
          paraphrasedContent: paraphraseResult.paraphrasedContent,
          readabilityScore: paraphraseResult.readability,
          keyInfo: keyInfoResult.keyInfo,
          displayInfo: keyInfoResult.displayInfo,
          whatThisMeans: paraphraseResult.whatThisMeans,
          generatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Paraphrase endpoint error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:demandId/paraphrased
 * Get cached paraphrased content
 */
router.get(
  '/:demandId/paraphrased',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const organizationId = req.user!.organizationId;

      // Get the demand letter
      const demandLetter = await prisma.demandLetter.findFirst({
        where: {
          id: demandId,
          organizationId,
        },
        include: {
          case: true,
        },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // For debtors, verify they own the case
      if (userRole === 'DEBTOR') {
        if (demandLetter.case.debtorUserId !== userId) {
          res.status(403).json(errorResponse('Access denied', 'FORBIDDEN'));
          return;
        }
      }

      if (!demandLetter.paraphrasedContent) {
        res.status(404).json(
          errorResponse('Paraphrased content not available', 'NOT_PARAPHRASED')
        );
        return;
      }

      // Extract key info
      const keyInfoResult = await extractKeyInfo(demandLetter.content);

      res.json(
        successResponse({
          demandId,
          originalContent: demandLetter.content,
          paraphrasedContent: demandLetter.paraphrasedContent,
          readabilityScore: validateReadability(demandLetter.paraphrasedContent),
          keyInfo: keyInfoResult.keyInfo,
          displayInfo: keyInfoResult.displayInfo,
          generatedAt: demandLetter.updatedAt.toISOString(),
        })
      );
    } catch (error) {
      logger.error('Get paraphrased endpoint error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:demandId/key-info
 * Get extracted key information from demand letter
 */
router.get(
  '/:demandId/key-info',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const organizationId = req.user!.organizationId;

      // Get the demand letter
      const demandLetter = await prisma.demandLetter.findFirst({
        where: {
          id: demandId,
          organizationId,
        },
        include: {
          case: true,
        },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // For debtors, verify they own the case
      if (userRole === 'DEBTOR') {
        if (demandLetter.case.debtorUserId !== userId) {
          res.status(403).json(errorResponse('Access denied', 'FORBIDDEN'));
          return;
        }
      }

      // Extract key info
      const result = await extractKeyInfo(demandLetter.content);

      if (!result.success) {
        res.status(500).json(
          errorResponse(
            result.errorMessage || 'Failed to extract key information',
            result.errorCode || 'EXTRACTION_FAILED'
          )
        );
        return;
      }

      res.json(
        successResponse({
          demandId,
          keyInfo: result.keyInfo,
          displayInfo: result.displayInfo,
        })
      );
    } catch (error) {
      logger.error('Key info endpoint error', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
);

export default router;
