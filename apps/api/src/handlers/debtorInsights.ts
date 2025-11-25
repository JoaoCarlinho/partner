/**
 * Debtor Insights API Handlers
 * Endpoints for debtor comfort/intention assessment
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDebtorInsights, processInteraction, getComfortAssessment } from '../services/comfort/comfortTracker';
import {
  checkEscalationTriggers,
  getEscalationResponse,
  CRISIS_RESOURCES,
} from '../services/comfort/escalationService';

const router = Router();

// Audit action constants
const AUDIT_ACTION_SENTIMENT_ANALYZED = 'SENTIMENT_ANALYZED';
const AUDIT_ACTION_ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED';

/**
 * GET /api/v1/cases/:caseId/debtor-insights
 * Get debtor insights for creditor view
 * Required role: ATTORNEY, PARALEGAL
 */
router.get('/:caseId/debtor-insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    // In a real implementation, get debtorProfileId from case
    const debtorProfileId = `debtor_${caseId}`;

    const insights = getDebtorInsights(debtorProfileId);

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/internal/analyze-sentiment
 * Internal endpoint for sentiment analysis (called by other services)
 */
router.post('/internal/analyze-sentiment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, context, debtorProfileId } = req.body;

    if (!text || !debtorProfileId) {
      return res.status(400).json({
        success: false,
        error: 'Text and debtorProfileId are required',
      });
    }

    const { assessment, escalation } = await processInteraction(debtorProfileId, {
      type: context || 'message',
      content: text,
      timestamp: new Date(),
    });

    // Log audit event
    console.log(`[AUDIT] ${AUDIT_ACTION_SENTIMENT_ANALYZED}`, {
      debtorProfileId,
      stressLevel: assessment.currentStressLevel,
      intention: assessment.intention.primaryIntention,
      timestamp: new Date().toISOString(),
    });

    // Log escalation if triggered
    if (escalation?.triggered) {
      console.log(`[AUDIT] ${AUDIT_ACTION_ESCALATION_TRIGGERED}`, {
        debtorProfileId,
        type: escalation.type,
        severity: escalation.severity,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentStressLevel: assessment.currentStressLevel,
        intention: assessment.intention.primaryIntention,
        readinessScore: assessment.readinessScore,
      },
      escalation: escalation?.triggered
        ? {
            triggered: true,
            type: escalation.type,
            severity: escalation.severity,
            response: getEscalationResponse(escalation),
            resources: escalation.crisisResources,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/debtors/crisis-resources
 * Get crisis resources (publicly accessible)
 */
router.get('/crisis-resources', async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      resources: CRISIS_RESOURCES,
      message: "If you're struggling, help is available. These resources are free and confidential.",
    },
  });
});

/**
 * POST /api/v1/debtors/check-message
 * Check message for escalation triggers (debtor-side)
 * Returns appropriate response if escalation detected
 */
router.post('/check-message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, debtorProfileId, caseId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const escalation = checkEscalationTriggers(message);

    if (escalation.triggered) {
      // Process the interaction to update assessment
      if (debtorProfileId) {
        await processInteraction(debtorProfileId, {
          type: 'message',
          content: message,
          timestamp: new Date(),
        });
      }

      // Log escalation
      console.log(`[AUDIT] ${AUDIT_ACTION_ESCALATION_TRIGGERED}`, {
        debtorProfileId,
        caseId,
        type: escalation.type,
        severity: escalation.severity,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        data: {
          escalation: true,
          type: escalation.type,
          severity: escalation.severity,
          response: getEscalationResponse(escalation),
          resources: escalation.crisisResources || CRISIS_RESOURCES,
          pauseAI: escalation.actions.includes('pause_ai'),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        escalation: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/debtors/comfort-status
 * Get own comfort assessment status (for debtor)
 */
router.get('/comfort-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get debtor profile ID from authenticated user
    const debtorProfileId = (req as any).user?.debtorProfileId || 'mock-debtor-id';

    const assessment = getComfortAssessment(debtorProfileId);

    // Return limited data - don't expose stress levels to debtor
    res.status(200).json({
      success: true,
      data: {
        readinessScore: assessment.readinessScore,
        lastActivity: assessment.lastAssessed.toISOString(),
        // Don't expose stress level or intention to debtor
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
