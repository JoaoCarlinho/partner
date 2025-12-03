/**
 * Demands Handler
 * API endpoints for demand letter generation and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize, requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { generateLetterSchema, createCaseSchema, createInvitationSchema, AuditAction } from '@steno/shared';
import { generateLetter, generateLetterStream, LetterGenerationError } from '../services/ai/letterGenerator.js';
import { refineLetter, analyzeLetter, RefinementError } from '../services/ai/letterRefiner.js';
import { COMMON_REFINEMENT_SUGGESTIONS } from '../services/ai/prompts/letterRefinement.js';
import { generateDiff } from '../services/diff/textDiff.js';
import {
  createInvitationLink,
  getInvitationStatus,
  revokeInvitation,
  InvitationError,
} from '../services/invitation/invitationService.js';
import {
  submitForReview,
  approveLetter,
  rejectLetter,
  prepareForSending,
  markAsSent,
  getApprovalHistory,
  getLatestApproval,
  WorkflowError,
} from '../services/workflow/approvalWorkflow.js';
import { generateLetterPDF } from '../services/pdf/pdfGenerator.js';
import { logger } from '../middleware/logger.js';
import { prisma } from '../lib/prisma.js';
// Define enums locally to avoid Prisma client export issues
type CaseStatus = 'ACTIVE' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
type LetterStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'READY_TO_SEND' | 'SENT';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { z } from 'zod';

// Refinement request schema
const refineLetterSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required').max(1000, 'Instruction too long'),
});

// Approval schemas
const approveLetterSchema = z.object({
  signature: z.string().optional(),
});

const rejectLetterSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(2000, 'Reason too long'),
});

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ============================================
// CASE ENDPOINTS - MUST BE BEFORE /:id ROUTES
// (otherwise /cases matches /:id with id="cases")
// ============================================

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
        ...(status && { status: status as CaseStatus }),
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
 * GET /api/v1/demands/cases/:id/messages
 * Get messages for a case
 */
router.get(
  '/cases/:id/messages',
  authorize('cases:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      // Verify case belongs to organization
      const caseRecord = await prisma.case.findFirst({
        where: { id, organizationId },
      });

      if (!caseRecord) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      const messages = await prisma.message.findMany({
        where: { caseId: id },
        orderBy: { createdAt: 'asc' },
      });

      res.json(successResponse({ items: messages }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/cases/:id/messages
 * Create a new message for a case
 */
router.post(
  '/cases/:id/messages',
  authorize('cases:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const userRole = req.user!.role;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json(errorResponse('Message content is required', 'VALIDATION_ERROR'));
        return;
      }

      // Verify case belongs to organization
      const caseRecord = await prisma.case.findFirst({
        where: { id, organizationId },
      });

      if (!caseRecord) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      const message = await prisma.message.create({
        data: {
          caseId: id,
          senderId: userId,
          senderRole: userRole,
          content: content.trim(),
        },
      });

      res.status(201).json(successResponse(message));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/demands/cases/:id
 * Delete a case (ADMIN ONLY)
 * Only deletes cases with no associated demand letters
 */
router.delete(
  '/cases/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      // Find the case
      const caseRecord = await prisma.case.findFirst({
        where: { id, organizationId },
        include: {
          demandLetters: { select: { id: true } },
          messages: { select: { id: true } },
        },
      });

      if (!caseRecord) {
        res.status(404).json(errorResponse('Case not found', 'NOT_FOUND'));
        return;
      }

      // Check if case has any demand letters
      if (caseRecord.demandLetters.length > 0) {
        res.status(400).json(
          errorResponse(
            'Cannot delete case with existing demand letters. Delete the demand letters first.',
            'HAS_DEMAND_LETTERS'
          )
        );
        return;
      }

      // Delete associated messages first
      if (caseRecord.messages.length > 0) {
        await prisma.message.deleteMany({
          where: { caseId: id },
        });
      }

      // Delete the case
      await prisma.case.delete({ where: { id } });

      logAuditEvent(req, {
        action: AuditAction.CASE_DELETED,
        resourceType: 'Case',
        resourceId: id,
        metadata: {
          debtorName: caseRecord.debtorName,
          creditorName: caseRecord.creditorName,
        },
      });

      logger.info('Case deleted', {
        caseId: id,
        deletedBy: req.user!.id,
      });

      res.status(204).send();
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

// ============================================
// DEMAND LETTER ENDPOINTS
// ============================================

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

        // Send immediate heartbeat to prevent CloudFront 60s timeout
        res.write(`data: ${JSON.stringify({ type: 'started', message: 'Generating letter...' })}\n\n`);

        // Set up heartbeat interval to keep connection alive during AI processing
        const heartbeatInterval = setInterval(() => {
          res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
        }, 25000); // Send heartbeat every 25 seconds (before 60s timeout)

        let fullContent = '';

        try {
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
        } finally {
          clearInterval(heartbeatInterval);
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
        ...(status && { status: status as LetterStatus }),
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

      // Save current version before refinement (only if it doesn't already exist)
      const currentVersion = demandLetter.currentVersion;
      const existingVersion = await prisma.demandLetterVersion.findUnique({
        where: {
          demandLetterId_version: {
            demandLetterId: demandId,
            version: currentVersion,
          },
        },
      });

      if (!existingVersion) {
        await prisma.demandLetterVersion.create({
          data: {
            demandLetterId: demandId,
            version: currentVersion,
            content: demandLetter.content,
            complianceResult: demandLetter.complianceResult as object,
            createdBy: userId,
          },
        });
      }

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
 * POST /api/v1/demands/:demandId/analyze
 * Proactively analyze a demand letter and provide feedback
 */
router.post(
  '/:demandId/analyze',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
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

      // Analyze the letter
      const result = await analyzeLetter(
        demandLetter.content,
        {
          state: 'NY', // TODO: Get from case metadata
          debtDetails: {
            principal: Number(demandLetter.case.debtAmount),
            originDate: new Date().toISOString().split('T')[0],
            creditorName: demandLetter.case.creditorName,
          },
        }
      );

      logger.info('Letter analyzed', {
        demandLetterId: demandId,
        overallTone: result.overallTone,
        issueCount: result.issues.length,
      });

      res.json(
        successResponse({
          id: demandId,
          analysis: result.analysis,
          overallTone: result.overallTone,
          issues: result.issues,
          suggestedActions: result.suggestedActions,
        })
      );
    } catch (error) {
      if (error instanceof RefinementError) {
        logger.error('Letter analysis failed', { error: error.message });
        res.status(503).json(
          errorResponse('Letter analysis service unavailable', 'SERVICE_UNAVAILABLE')
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

// ============================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================

/**
 * GET /api/v1/demands/:demandId/preview
 * Generate a PDF preview of the demand letter
 */
router.get(
  '/:demandId/preview',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
        include: {
          case: {
            select: {
              creditorName: true,
              debtorName: true,
              debtorEmail: true,
              debtAmount: true,
            },
          },
        },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      // Get organization name for letterhead
      const organization = await prisma.organization.findUnique({
        where: { id: demandLetter.organizationId },
        select: { name: true },
      });

      // Get approval info if approved
      let approval;
      if (demandLetter.status === 'APPROVED' || demandLetter.status === 'SENT') {
        approval = await getLatestApproval(demandId);
      }

      // Generate PDF
      const pdfBuffer = await generateLetterPDF({
        content: demandLetter.content,
        metadata: {
          reference: `${demandLetter.case.debtorName} v. ${demandLetter.case.creditorName}`,
          date: demandLetter.createdAt.toISOString(),
          caseId: demandLetter.caseId,
        },
        letterhead: {
          firmName: organization?.name || 'Unknown Firm',
        },
        approval: approval ? {
          approverName: approval.actor.email,
          approverEmail: approval.actor.email,
          approvedAt: approval.createdAt.toISOString(),
          signature: (approval.signatureData as { signatureHash?: string })?.signatureHash,
        } : undefined,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="demand-letter-${demandId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/submit-for-review
 * Submit a demand letter for attorney review
 */
router.post(
  '/:demandId/submit-for-review',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Verify the letter belongs to the organization
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const result = await submitForReview(demandId, userId, ipAddress, userAgent);

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          action: 'submit_for_review',
          newStatus: result.status,
        },
      });

      res.json(
        successResponse({
          message: 'Letter submitted for review',
          status: result.status,
        })
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          INVALID_TRANSITION: 400,
          NOT_COMPLIANT: 400,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/approve
 * Approve a demand letter (attorney only)
 */
router.post(
  '/:demandId/approve',
  authorize('demands:approve'),
  validate({ body: approveLetterSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const { signature } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Verify the letter belongs to the organization
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const result = await approveLetter(demandId, userId, {
        signature,
        ipAddress,
        userAgent,
      });

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          action: 'approve',
          newStatus: result.status,
          approvalId: result.approvalId,
        },
      });

      res.json(
        successResponse({
          message: 'Letter approved',
          status: result.status,
          approvalId: result.approvalId,
        })
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          INVALID_TRANSITION: 400,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/reject
 * Reject a demand letter with reason
 */
router.post(
  '/:demandId/reject',
  authorize('demands:approve'),
  validate({ body: rejectLetterSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Verify the letter belongs to the organization
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const result = await rejectLetter(demandId, userId, reason, {
        ipAddress,
        userAgent,
      });

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          action: 'reject',
          newStatus: result.status,
          reason,
        },
      });

      res.json(
        successResponse({
          message: 'Letter rejected and returned to draft',
          status: result.status,
        })
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          INVALID_TRANSITION: 400,
          MISSING_REASON: 400,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/prepare-send
 * Prepare an approved letter for sending
 */
router.post(
  '/:demandId/prepare-send',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      // Verify the letter belongs to the organization
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const result = await prepareForSending(demandId, userId);

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_UPDATED,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          action: 'prepare_send',
          newStatus: result.status,
        },
      });

      res.json(
        successResponse({
          message: 'Letter ready to send',
          status: result.status,
        })
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          INVALID_TRANSITION: 400,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/demands/:demandId/send
 * Mark a letter as sent
 */
router.post(
  '/:demandId/send',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      // Verify the letter belongs to the organization
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const result = await markAsSent(demandId, userId);

      logAuditEvent(req, {
        action: AuditAction.DEMAND_LETTER_SENT,
        resourceType: 'DemandLetter',
        resourceId: demandId,
        metadata: {
          action: 'send',
          newStatus: result.status,
        },
      });

      res.json(
        successResponse({
          message: 'Letter marked as sent',
          status: result.status,
        })
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          INVALID_TRANSITION: 400,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:demandId/approvals
 * Get approval history for a demand letter
 */
router.get(
  '/:demandId/approvals',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      // Verify the letter belongs to the organization
      const demandLetter = await prisma.demandLetter.findFirst({
        where: { id: demandId, organizationId },
      });

      if (!demandLetter) {
        res.status(404).json(errorResponse('Demand letter not found', 'NOT_FOUND'));
        return;
      }

      const history = await getApprovalHistory(demandId);

      res.json(
        successResponse({
          currentStatus: demandLetter.status,
          history,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// INVITATION ENDPOINTS
// ============================================

/**
 * POST /api/v1/demands/:demandId/invitation
 * Generate an invitation link for a demand letter
 * Requires ATTORNEY or FIRM_ADMIN role
 */
router.post(
  '/:demandId/invitation',
  authorize('demands:update'),
  validate({ body: createInvitationSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const { expirationDays, usageLimit } = req.body;
      const organizationId = req.user!.organizationId;

      const result = await createInvitationLink(demandId, organizationId, {
        expirationDays,
        usageLimit,
      });

      logAuditEvent(req, {
        action: AuditAction.INVITATION_CREATED,
        resourceType: 'Invitation',
        resourceId: demandId,
        metadata: {
          expiresAt: result.expiresAt,
          usageLimit: result.usageLimit,
        },
      });

      logger.info('Invitation created', {
        demandLetterId: demandId,
        expiresAt: result.expiresAt,
        usageLimit: result.usageLimit,
      });

      res.status(201).json(successResponse(result));
    } catch (error) {
      if (error instanceof InvitationError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          INVITATION_EXISTS: 409,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/demands/:demandId/invitation
 * Get invitation status for a demand letter
 */
router.get(
  '/:demandId/invitation',
  authorize('demands:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      const status = await getInvitationStatus(demandId, organizationId);
      res.json(successResponse(status));
    } catch (error) {
      if (error instanceof InvitationError) {
        if (error.code === 'NOT_FOUND') {
          res.status(404).json(errorResponse(error.message, error.code));
          return;
        }
        res.status(400).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/demands/:demandId/invitation
 * Revoke an invitation for a demand letter
 * Requires ATTORNEY or FIRM_ADMIN role
 */
router.delete(
  '/:demandId/invitation',
  authorize('demands:update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { demandId } = req.params;
      const organizationId = req.user!.organizationId;

      const result = await revokeInvitation(demandId, organizationId);

      logAuditEvent(req, {
        action: AuditAction.INVITATION_REVOKED,
        resourceType: 'Invitation',
        resourceId: demandId,
        metadata: {
          revokedAt: result.revokedAt,
        },
      });

      logger.info('Invitation revoked', {
        demandLetterId: demandId,
        revokedAt: result.revokedAt,
      });

      res.json(
        successResponse({
          message: 'Invitation revoked successfully',
          revokedAt: result.revokedAt,
        })
      );
    } catch (error) {
      if (error instanceof InvitationError) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          NO_INVITATION: 404,
          ALREADY_REVOKED: 400,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json(errorResponse(error.message, error.code));
        return;
      }
      next(error);
    }
  }
);

export default router;
