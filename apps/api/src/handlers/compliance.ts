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
        action: AuditAction.DEMAND_CREATED, // Using existing action, could add COMPLIANCE_CHECK
        entityType: 'compliance_check',
        metadata: {
          state,
          isCompliant: result.isCompliant,
          score: result.score,
          missingCount: result.missingRequirements.length,
        },
      });

      res.json(successResponse(result));
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
      res.json(successResponse({ rules }));
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

      res.json(
        successResponse({
          disclosures,
          completeText: generateCompleteDisclosure(context),
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
