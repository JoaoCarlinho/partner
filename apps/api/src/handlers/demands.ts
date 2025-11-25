/**
 * Demands Handler
 * API endpoints for demand letter generation and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { generateLetterSchema, createCaseSchema, AuditAction } from '@steno/shared';
import { generateLetter, generateLetterStream, LetterGenerationError } from '../services/ai/letterGenerator.js';
import { refineLetter, RefinementError } from '../services/ai/letterRefiner.js';
import { COMMON_REFINEMENT_SUGGESTIONS } from '../services/ai/prompts/letterRefinement.js';
import { generateDiff } from '../services/diff/textDiff.js';
import { logger } from '../middleware/logger.js';
import { prisma } from '../lib/prisma.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { z } from 'zod';

// Refinement request schema
const refineLetterSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required').max(1000, 'Instruction too long'),
});

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/v1/demands/generate
 * Generate a demand letter using AI
 */
router.post(
  '/generate',
  authorize('demands:create'),
  validate({ body: generateLetterSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { templateId, caseId, caseDetails, options } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      // Verify case exists and belongs to organization
      const existingCase = await prisma.case.findFirst({
        where: {
          id: caseId,
          organizationId,
        },
      });

      if (!existingCase) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      // Load template if provided
      let templateContent: string | undefined;
      if (templateId) {
        const template = await prisma.template.findFirst({
          where: {
            id: templateId,
            organizationId,
            isActive: true,
          },
        });

        if (!template) {
          res.status(404).json(errorResponse('Template not found', 'NOT_FOUND'));
          return;
        }

        templateContent = template.content;
      }

      // Handle streaming response
      if (options?.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullContent = '';

        for await (const chunk of generateLetterStream(caseDetails, templateContent)) {
          if (chunk.type === 'content') {
            fullContent += chunk.content;
            res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
          } else if (chunk.type === 'compliance') {
            res.write(`data: ${JSON.stringify({ type: 'compliance', result: chunk.complianceResult })}\n\n`);
          } else if (chunk.type === 'done') {
            // Save the generated letter
            const demandLetter = await prisma.demandLetter.create({
              data: {
                organizationId,
                caseId,
                templateId,
                content: fullContent,
                status: 'DRAFT',
                complianceResult: chunk.complianceResult as object,
              },
            });

            res.write(`data: ${JSON.stringify({ type: 'done', id: demandLetter.id })}\n\n`);

            // Audit log
            logAuditEvent(req, {
              action: AuditAction.DEMAND_LETTER_GENERATED,
              resourceType: 'DemandLetter',
              resourceId: demandLetter.id,
              metadata: { caseId, templateId, streaming: true },
            });
          } else if (chunk.type === 'error') {
            res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
          }
        }

        res.end();
        return;
      }

      // Non-streaming response
      const result = await generateLetter(caseDetails, templateContent);

      // Save the generated letter
      const demandLetter = await prisma.demandLetter.create({
        data: {
          organizationId,
          caseId,
          templateId,
          content: result.content,
          status: 'DRAFT',
          complianceResult: result.complianceResult as object,
        },
      });

      // Audit log
      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_GENERATED,
        resourceType: 'DemandLetter',
        resourceId: demandLetter.id,
        metadata: {
          caseId,
          templateId,
          isCompliant: result.complianceResult.isCompliant,
          score: result.complianceResult.score,
          tokensUsed: result.metadata.totalTokens,
          latencyMs: result.metadata.latencyMs,
        },
      });

      logger.info('Demand letter generated', {
        demandLetterId: demandLetter.id,
        caseId,
        isCompliant: result.complianceResult.isCompliant,
      });

      res.status(201).json(
        successResponse({
          id: demandLetter.id,
          content: result.content,
          templateId,
          caseId,
          status: 'DRAFT',
          complianceResult: result.complianceResult,
          createdAt: demandLetter.createdAt.toISOString(),
        })
      );
    } catch (error) {
      if (error instanceof LetterGenerationError) {
        logger.error('Letter generation failed', { error: error.message });
        res.status(503).json(
          errorResponse('Letter generation service unavailable', 'SERVICE_UNAVAILABLE')
        );
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:id
 * Get a demand letter by ID
 */
router.get(
  '/:id',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const demandLetter = await prisma.demandLetter.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          case: {
            select: {
              id: true,
              creditorName: true,
              debtorName: true,
              status: true,
            },
          },
        },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      res.json(successResponse(demandLetter));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands
 * List demand letters for organization
 */
router.get(
  '/',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { caseId, status, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const where = {
        organizationId,
        ...(caseId && { caseId: caseId as string }),
        ...(status && { status: status as string }),
      };

      const [demandLetters, total] = await Promise.all([
        prisma.demandLetter.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            template: {
              select: { id: true, name: true },
            },
            case: {
              select: { id: true, creditorName: true, debtorName: true },
            },
          },
        }),
        prisma.demandLetter.count({ where }),
      ]);

      res.json(
        successResponse({
          items: demandLetters,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/demands/:id
 * Update a demand letter
 */
router.patch(
  '/:id',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { content, status } = req.body;
      const organizationId = req.user!.organizationId;

      const existing = await prisma.demandLetter.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // Prevent updates to sent letters
      if (existing.status === 'SENT') {
        res.status(400).json(
          errorResponse('Cannot update sent letters', 'INVALID_STATE')
        );
        return;
      }

      const updated = await prisma.demandLetter.update({
        where: { id },
        data: {
          ...(content && { content }),
          ...(status && { status }),
        },
      });

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: id,
        metadata: { status, contentUpdated: !!content },
      });

      res.json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/demands/:id
 * Delete a draft demand letter
 */
router.delete(
  '/:id',
  authorize('demands:delete'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const existing = await prisma.demandLetter.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // Only allow deleting drafts
      if (existing.status !== 'DRAFT') {
        res.status(400).json(
          errorResponse('Can only delete draft letters', 'INVALID_STATE')
        );
        return;
      }

      await prisma.demandLetter.delete({ where: { id } });

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_DELETED,
        resourceType: 'DemandLetter',
        resourceId: id,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/cases
 * Create a new case
 */
router.post(
  '/cases',
  authorize('cases:create'),
  validate({ body: createCaseSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { creditorName, debtAmount, debtorName, debtorEmail, metadata } = req.body;
      const organizationId = req.user!.organizationId;

      const newCase = await prisma.case.create({
        data: {
          organizationId,
          creditorName,
          debtAmount,
          debtorName,
          debtorEmail,
          metadata,
          status: 'ACTIVE',
        },
      });

      logAuditEvent(req, {
        action: AuditAction.CASE_CREATED,
        resourceType: 'Case',
        resourceId: newCase.id,
        metadata: { creditorName },
      });

      res.status(201).json(successResponse(newCase));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/cases
 * List cases for organization
 */
router.get(
  '/cases',
  authorize('cases:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { status, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const where = {
        organizationId,
        ...(status && { status: status as string }),
      };

      const [cases, total] = await Promise.all([
        prisma.case.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.case.count({ where }),
      ]);

      res.json(
        successResponse({
          items: cases,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/cases/:id
 * Get a case by ID
 */
router.get(
  '/cases/:id',
  authorize('cases:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const caseRecord = await prisma.case.findFirst({
        where: { id, organizationId },
        include: {
          demandLetters: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!caseRecord) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      res.json(successResponse(caseRecord));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/refine
 * Refine a demand letter using AI
 */
router.post(
  '/:demandId/refine',
  authorize('demands:update'),
  validate({ body: refineLetterSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const { instruction } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      // Get the demand letter
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
        include: {
          case: true,
        },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // Prevent refinement of sent letters
      if (demandLetter.status === 'SENT') {
        res.status(400).json(
          errorResponse('Cannot refine sent letters', 'INVALID_STATE')
        );
        return;
      }

      // Save current version before refinement
      const currentVersion = demandLetter.currentVersion;
      await prisma.demandLetterVersion.create({
        data: {
          demandLetterId: demandId,
          version: currentVersion,
          content: demandLetter.content,
          complianceResult: demandLetter.complianceResult as object,
          createdBy: userId,
        },
      });

      // Refine the letter
      const result = await refineLetter(
        demandLetter.content,
        instruction,
        {
          state: 'NY', // TODO: Get from case metadata
          debtDetails: {
            principal: Number(demandLetter.case.debtAmount),
            originDate: new Date().toISOString().split('T')[0],
            creditorName: demandLetter.case.creditorName,
          },
        }
      );

      // Update the demand letter with new content
      const newVersion = currentVersion + 1;
      await prisma.demandLetter.update({
        where: { id: demandId },
        data: {
          content: result.content,
          complianceResult: result.complianceResult as object,
          currentVersion: newVersion,
        },
      });

      // Save the new version
      await prisma.demandLetterVersion.create({
        data: {
          demandLetterId: demandId,
          version: newVersion,
          content: result.content,
          refinementInstruction: instruction,
          complianceResult: result.complianceResult as object,
          createdBy: userId,
        },
      });

      // Audit log
      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          refinementInstruction: instruction,
          fromVersion: currentVersion,
          toVersion: newVersion,
          isCompliant: result.complianceResult.isCompliant,
        },
      });

      logger.info('Letter refined', {
        demandLetterId: demandId,
        version: newVersion,
        isCompliant: result.complianceResult.isCompliant,
      });

      res.json(
        successResponse({
          id: demandId,
          content: result.content,
          version: newVersion,
          previousVersion: currentVersion,
          refinementInstruction: instruction,
          complianceResult: result.complianceResult,
          diff: result.diff,
          warnings: result.instructionWarnings,
        })
      );
    } catch (error) {
      if (error instanceof RefinementError) {
        logger.error('Letter refinement failed', { error: error.message });
        res.status(503).json(
          errorResponse('Letter refinement service unavailable', 'SERVICE_UNAVAILABLE')
        );
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/undo
 * Undo to previous version
 */
router.post(
  '/:demandId/undo',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      if (demandLetter.currentVersion <= 1) {
        res.status(400).json(errorResponse('No previous version to undo to', 'NO_UNDO'));
        return;
      }

      // Get previous version
      const previousVersion = await prisma.demandLetterVersion.findUnique({
        where: {
          demandLetterId_version: {
            demandLetterId: demandId,
            version: demandLetter.currentVersion - 1,
          },
        },
      });

      if (!previousVersion) {
        res.status(404).json(errorResponse('Previous version not found', 'NOT_FOUND'));
        return;
      }

      // Restore previous version
      await prisma.demandLetter.update({
        where: { id: demandId },
        data: {
          content: previousVersion.content,
          complianceResult: previousVersion.complianceResult as object,
          currentVersion: previousVersion.version,
        },
      });

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: { action: 'undo', restoredVersion: previousVersion.version },
      });

      res.json(
        successResponse({
          id: demandId,
          content: previousVersion.content,
          version: previousVersion.version,
          complianceResult: previousVersion.complianceResult,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/redo
 * Redo to next version
 */
router.post(
  '/:demandId/redo',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // Get next version
      const nextVersion = await prisma.demandLetterVersion.findUnique({
        where: {
          demandLetterId_version: {
            demandLetterId: demandId,
            version: demandLetter.currentVersion + 1,
          },
        },
      });

      if (!nextVersion) {
        res.status(400).json(errorResponse('No next version to redo to', 'NO_REDO'));
        return;
      }

      // Restore next version
      await prisma.demandLetter.update({
        where: { id: demandId },
        data: {
          content: nextVersion.content,
          complianceResult: nextVersion.complianceResult as object,
          currentVersion: nextVersion.version,
        },
      });

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: { action: 'redo', restoredVersion: nextVersion.version },
      });

      res.json(
        successResponse({
          id: demandId,
          content: nextVersion.content,
          version: nextVersion.version,
          complianceResult: nextVersion.complianceResult,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:demandId/diff
 * Get diff between two versions
 */
router.get(
  '/:demandId/diff',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const { v1, v2 } = req.query;
      const organizationId = req.user!.organizationId;

      // Verify access
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const version1 = parseInt(v1 as string, 10) || demandLetter.currentVersion - 1;
      const version2 = parseInt(v2 as string, 10) || demandLetter.currentVersion;

      // Get both versions
      const [ver1, ver2] = await Promise.all([
        prisma.demandLetterVersion.findUnique({
          where: {
            demandLetterId_version: { demandLetterId: demandId, version: version1 },
          },
        }),
        prisma.demandLetterVersion.findUnique({
          where: {
            demandLetterId_version: { demandLetterId: demandId, version: version2 },
          },
        }),
      ]);

      if (!ver1 || !ver2) {
        res.status(404).json(errorResponse('Version not found', 'NOT_FOUND'));
        return;
      }

      const diff = generateDiff(ver1.content, ver2.content);

      res.json(
        successResponse({
          version1,
          version2,
          diff,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:demandId/versions
 * List all versions of a demand letter
 */
router.get(
  '/:demandId/versions',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      // Verify access
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const versions = await prisma.demandLetterVersion.findMany({
        where: { demandLetterId: demandId },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          refinementInstruction: true,
          createdAt: true,
          creator: {
            select: { id: true, email: true },
          },
        },
      });

      res.json(
        successResponse({
          currentVersion: demandLetter.currentVersion,
          versions,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/refinement-suggestions
 * Get common refinement suggestions
 */
router.get(
  '/refinement-suggestions',
  authorize('demands:read'),
  async (_req: Request, res: Response): Promise<void> => {
    res.json(successResponse(COMMON_REFINEMENT_SUGGESTIONS));
  }
);

export default router;
