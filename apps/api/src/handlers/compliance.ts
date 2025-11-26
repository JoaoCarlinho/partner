/**
 * Compliance API Handlers
 * Endpoints for FDCPA compliance validation and disclosure generation
 */

import { Router, Request, Response, NextFunction } from 'express';
import { successResponse } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { validate } from '../middleware/validate.js';
import { logAuditEvent } from '../services/audit/auditLogger.js';
import { AuditAction } from '@steno/shared';
import {
  complianceValidateSchema,
  disclosureGenerateSchema,
} from '@steno/shared';
import {
  validateDemandLetter,
  getAvailableRules,
} from '../services/compliance/fdcpaValidator.js';
import {
  getRequiredDisclosures,
  generateCompleteDisclosure,
} from '../services/compliance/disclosureGenerator.js';
import {
  getCommunicationLogs,
  getComplianceFlags,
  getComplianceSummary,
  resolveComplianceFlag,
  exportComplianceData,
  performPreSendChecks,
  CommunicationDirection,
} from '../services/compliance/complianceLogger.js';
import { checkFrequencyCompliance, getFrequencyStatus } from '../services/compliance/frequencyTracker.js';
import { isWithinAllowedHours, getRestrictionMessage } from '../services/compliance/timeRestriction.js';
import { checkCeaseDesist, registerCeaseDesist, acknowledgeCeaseDesist } from '../services/compliance/ceaseDesist.js';
import { FlagSeverity, ComplianceFlag } from '../services/compliance/complianceRules.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

/**
 * POST /api/v1/compliance/validate
 * Validate letter content against FDCPA requirements
 */
router.post(
  '/validate',
  authorize('demands:create'),
  validate({ body: complianceValidateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { content, state, debtDetails } = req.body;

      const result = validateDemandLetter(content, {
        state,
        debtDetails,
      });

      // Audit log compliance check
      logAuditEvent(req, {
        action: AuditAction.DEMAND_CREATED,
        metadata: {
          state,
          isCompliant: result.isCompliant,
          score: result.score,
          missingCount: result.missingRequirements.length,
        },
      });

      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/compliance/rules
 * Get list of all available compliance rules
 */
router.get(
  '/rules',
  authorize('demands:view'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rules = getAvailableRules();
      successResponse(res, { rules });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/compliance/disclosures
 * Generate required disclosure blocks for a letter
 */
router.post(
  '/disclosures',
  authorize('demands:create'),
  validate({ body: disclosureGenerateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { state, debtDetails, blocks } = req.body;

      const context = { state, debtDetails };
      let disclosures = getRequiredDisclosures(context);

      // Filter to specific blocks if requested
      if (blocks && blocks.length > 0) {
        disclosures = disclosures.filter((d) => blocks.includes(d.id));
      }

      successResponse(res, {
        disclosures,
        completeText: generateCompleteDisclosure(context),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/compliance/flags
 * List compliance flags with filters
 */
router.get('/flags', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId, resolved, severity, flagType, page = '1', limit = '20' } = req.query;

    const flags = getComplianceFlags({
      caseId: caseId as string | undefined,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      severity: severity as FlagSeverity | undefined,
      flagType: flagType as ComplianceFlag | undefined,
    });

    // Paginate
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const start = (pageNum - 1) * limitNum;
    const paginatedFlags = flags.slice(start, start + limitNum);

    successResponse(res, paginatedFlags, 200);
    res.json({
      meta: {
        total: flags.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(flags.length / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/compliance/flags/:flagId/resolve
 * Resolve a compliance flag
 */
router.put('/flags/:flagId/resolve', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { flagId } = req.params;
    const { resolutionNotes, resolvedBy } = req.body;

    if (!resolutionNotes) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Resolution notes are required',
        },
      });
      return;
    }

    const resolved = resolveComplianceFlag(flagId, resolutionNotes, resolvedBy || 'system');

    if (!resolved) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Flag not found',
        },
      });
      return;
    }

    successResponse(res, resolved);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/compliance/export
 * Export compliance data for audit
 */
router.get('/export', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId, startDate, endDate, includeFlags = 'true', format = 'json' } = req.query;

    const exportData = exportComplianceData({
      caseId: caseId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      includeFlags: includeFlags === 'true',
    });

    if (format === 'csv') {
      // Generate CSV
      const csvLines: string[] = [];
      csvLines.push(
        'timestamp,case_id,debtor_id,direction,channel,content_preview,tone_score,compliant,flags'
      );

      for (const log of exportData.communications) {
        const contentPreview = log.content
          ? `"${log.content.substring(0, 50).replace(/"/g, '""')}..."`
          : '';
        const flags = log.complianceIssues.map((i) => i.type).join(';');
        csvLines.push(
          `${log.timestamp.toISOString()},${log.caseId},${log.debtorId},${log.direction},${log.channel},${contentPreview},${log.toneScore || ''},${log.compliant},${flags}`
        );
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=compliance-export-${Date.now()}.csv`);
      res.send(csvLines.join('\n'));
      return;
    }

    successResponse(res, exportData);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/compliance/cases/:caseId/communication-log
 * Get communication log for a case
 */
router.get('/cases/:caseId/communication-log', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { startDate, endDate, direction, compliantOnly, page = '1', limit = '50' } = req.query;

    const directionFilter = direction === 'inbound' || direction === 'outbound'
      ? direction as CommunicationDirection
      : undefined;

    const logs = getCommunicationLogs(caseId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      direction: directionFilter,
      compliantOnly: compliantOnly === 'true' ? true : compliantOnly === 'false' ? false : undefined,
    });

    // Paginate
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const start = (pageNum - 1) * limitNum;
    const paginatedLogs = logs.slice(start, start + limitNum);

    successResponse(res, paginatedLogs, 200);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/compliance/cases/:caseId/status
 * Get current compliance status for a case
 */
router.get('/cases/:caseId/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { debtorId } = req.query;

    if (!debtorId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'debtorId query parameter is required',
        },
      });
      return;
    }

    // Get frequency status
    const frequencyResult = checkFrequencyCompliance(debtorId as string, caseId);

    // Get time restriction status
    const timeResult = isWithinAllowedHours(debtorId as string);

    // Get cease and desist status
    const ceaseDesistResult = checkCeaseDesist(caseId);

    // Get flag count
    const flags = getComplianceFlags({ caseId, resolved: false });

    // Get last violation
    const allFlags = getComplianceFlags({ caseId, severity: FlagSeverity.VIOLATION });
    const lastViolation = allFlags.length > 0 ? allFlags[0].createdAt.toISOString() : null;

    successResponse(res, {
      frequencyUsed: frequencyResult.used,
      frequencyLimit: frequencyResult.limit,
      frequencyRemaining: frequencyResult.remaining,
      frequencyWarning: frequencyResult.warningThreshold,
      timeRestricted: !timeResult.allowed,
      timeRestrictionMessage: !timeResult.allowed ? getRestrictionMessage(debtorId as string) : null,
      nextAllowedTime: timeResult.nextAllowedTime?.toISOString() || null,
      ceaseDesistActive: ceaseDesistResult.active,
      activeFlags: flags.length,
      lastViolation,
      canSendMessage: performPreSendChecks(caseId, debtorId as string, '').allowed,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/compliance/cases/:caseId/cease-desist
 * Register a cease and desist request
 */
router.post('/cases/:caseId/cease-desist', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { debtorId, requestMethod, notes } = req.body;

    if (!debtorId || !requestMethod) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'debtorId and requestMethod are required',
        },
      });
      return;
    }

    const record = registerCeaseDesist(caseId, debtorId, requestMethod, notes);

    successResponse(res, record, 201);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/compliance/cases/:caseId/cease-desist/acknowledge
 * Acknowledge a cease and desist request
 */
router.post('/cases/:caseId/cease-desist/acknowledge', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { acknowledgedBy } = req.body;

    const record = acknowledgeCeaseDesist(caseId, acknowledgedBy || 'system');

    if (!record) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No cease and desist found for this case',
        },
      });
      return;
    }

    successResponse(res, record);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/compliance/check-before-send
 * Pre-send compliance check
 */
router.post('/check-before-send', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId, debtorId, creditorId } = req.body;

    if (!caseId || !debtorId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'caseId and debtorId are required',
        },
      });
      return;
    }

    const result = performPreSendChecks(caseId, debtorId, creditorId || '');

    successResponse(res, {
      allowed: result.allowed,
      issues: result.issues,
      warnings: result.warnings,
      blockReason: result.blockReason,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/compliance/summary
 * Get overall compliance summary
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { caseId } = req.query;

    if (caseId) {
      const summary = getComplianceSummary(caseId as string);
      successResponse(res, summary);
      return;
    }

    // Return aggregate summary across all cases
    const allFlags = getComplianceFlags({});
    const unresolvedFlags = allFlags.filter((f) => !f.resolved);
    const violations = allFlags.filter((f) => f.severity === FlagSeverity.VIOLATION);

    successResponse(res, {
      totalFlags: allFlags.length,
      unresolvedFlags: unresolvedFlags.length,
      violations: violations.length,
      recentViolations: violations.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
