/**
 * Assessment API Handlers
 * Endpoints for AI-guided financial assessment
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  startAssessmentSession,
  processResponse,
  getSessionStatus,
  completeAssessment,
  type AssessmentStage,
  type ResponseType,
} from '../services/ai/assessmentConversation';

const router = Router();

// Audit action constant
const AUDIT_ACTION_ASSESSMENT_STARTED = 'ASSESSMENT_STARTED';
const AUDIT_ACTION_ASSESSMENT_RESPONDED = 'ASSESSMENT_RESPONDED';
const AUDIT_ACTION_ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED';

// Request interfaces
interface StartAssessmentRequest {
  caseId: string;
  debtAmount: number;
  creditorName: string;
}

interface RespondRequest {
  sessionId: string;
  stage: AssessmentStage;
  response: {
    type: ResponseType;
    value: string | string[];
  };
}

interface CompleteRequest {
  sessionId: string;
}

/**
 * POST /api/v1/debtors/assessment/start
 * Begin a new assessment session
 */
router.post(
  '/start',
  async (req: Request<object, object, StartAssessmentRequest>, res: Response, next: NextFunction) => {
    try {
      const { caseId, debtAmount, creditorName } = req.body;

      // Get debtor profile ID from authenticated user
      const debtorProfileId = (req as any).user?.debtorProfileId || 'mock-debtor-id';

      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: 'Case ID is required',
        });
      }

      const { sessionId, response } = await startAssessmentSession(debtorProfileId, caseId, {
        debtAmount: debtAmount || 0,
        creditorName: creditorName || 'Unknown Creditor',
      });

      // Log audit event
      console.log(`[AUDIT] ${AUDIT_ACTION_ASSESSMENT_STARTED}`, {
        debtorProfileId,
        caseId,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          currentStage: response.nextStage,
          message: response.message,
          options: response.options,
          inputType: response.inputType,
          allowSkip: response.allowSkip,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/debtors/assessment/respond
 * Submit a response to the current assessment stage
 */
router.post('/respond', async (req: Request<object, object, RespondRequest>, res: Response, next: NextFunction) => {
  try {
    const { sessionId, response } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    if (!response || !response.type) {
      return res.status(400).json({
        success: false,
        error: 'Response is required',
      });
    }

    const stageResponse = await processResponse(sessionId, response);

    // Log audit event
    console.log(`[AUDIT] ${AUDIT_ACTION_ASSESSMENT_RESPONDED}`, {
      sessionId,
      stage: req.body.stage,
      responseType: response.type,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        nextStage: stageResponse.nextStage,
        message: stageResponse.message,
        followUpMessage: stageResponse.followUpMessage,
        options: stageResponse.options,
        inputType: stageResponse.inputType,
        allowSkip: stageResponse.allowSkip,
        complete: stageResponse.complete,
        escalate: stageResponse.escalate,
        resources: stageResponse.resources,
      },
    });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({
        success: false,
        error: 'Assessment session not found',
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/debtors/assessment/status
 * Get current assessment progress
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    const status = getSessionStatus(sessionId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Assessment session not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentStage: status.currentStage,
        progress: status.progress,
        responses: status.responses,
        conversationHistory: status.conversationHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/debtors/assessment/complete
 * Finalize assessment and save results
 */
router.post(
  '/complete',
  async (req: Request<object, object, CompleteRequest>, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
      }

      const result = await completeAssessment(sessionId);

      // Log audit event
      console.log(`[AUDIT] ${AUDIT_ACTION_ASSESSMENT_COMPLETED}`, {
        sessionId,
        assessmentId: result.assessmentId,
        debtorProfileId: result.debtorProfileId,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: {
          assessmentId: result.assessmentId,
          summary: result.summary,
          message: 'Thank you for sharing. This will help us find the right options for you.',
          nextSteps: ['View payment options', 'Continue to dashboard'],
        },
      });
    } catch (error: any) {
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Assessment session not found',
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/debtors/assessment/skip-stage
 * Skip the current stage
 */
router.post('/skip-stage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    // Process as a skip response
    const stageResponse = await processResponse(sessionId, {
      type: 'skip',
      value: '',
    });

    res.status(200).json({
      success: true,
      data: {
        nextStage: stageResponse.nextStage,
        message: stageResponse.message,
        options: stageResponse.options,
        inputType: stageResponse.inputType,
        allowSkip: stageResponse.allowSkip,
        complete: stageResponse.complete,
      },
    });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({
        success: false,
        error: 'Assessment session not found',
      });
    }
    next(error);
  }
});

export default router;
