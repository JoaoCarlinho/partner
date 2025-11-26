/**
 * Feedback API Handlers
 * Endpoints for debtor feedback submission and management
 */

import { Router, Request, Response } from 'express';
import {
  FeedbackCategory,
  FEEDBACK_TEMPLATES,
  getTemplateByCategory,
  getTemplateSummaries,
} from '../services/feedback/feedbackTemplates';
import { assistFeedback, coachTone } from '../services/ai/feedbackAssistant';
import { formatForCreditor, generateCreditorSummary } from '../services/feedback/feedbackFormatter';

const router = Router();

/**
 * In-memory feedback store (would use database in production)
 */
interface StoredFeedback {
  id: string;
  caseId: string;
  debtorId: string;
  category: FeedbackCategory;
  originalContent: string;
  formattedContent: string;
  aiAssisted: boolean;
  creditorAcknowledged: boolean;
  creditorResponse: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  respondedAt: Date | null;
}

const feedbackStore: Map<string, StoredFeedback> = new Map();

/**
 * Generate unique feedback ID
 */
function generateFeedbackId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * GET /api/v1/feedback/templates
 * Get all available feedback templates
 */
router.get('/templates', (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        summaries: getTemplateSummaries(),
        templates: FEEDBACK_TEMPLATES,
      },
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get feedback templates',
    });
  }
});

/**
 * GET /api/v1/feedback/templates/:category
 * Get specific template by category
 */
router.get('/templates/:category', (req: Request, res: Response) => {
  try {
    const category = req.params.category as FeedbackCategory;
    const template = getTemplateByCategory(category);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    return res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Get template error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get feedback template',
    });
  }
});

/**
 * POST /api/v1/cases/:caseId/feedback
 * Submit feedback for a case
 */
router.post('/cases/:caseId/feedback', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const { category, content, requestAiAssist = false, debtorId } = req.body;

    if (!category || !content) {
      return res.status(400).json({
        success: false,
        error: 'Category and content are required',
      });
    }

    // Validate category
    if (!Object.values(FeedbackCategory).includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback category',
      });
    }

    let formattedContent = content;
    let aiAssisted = false;

    // Apply AI assistance if requested
    if (requestAiAssist) {
      const assisted = await assistFeedback(content, category);
      formattedContent = assisted.structuredFeedback;
      aiAssisted = assisted.wasAssisted;
    }

    // Format for creditor view
    const formatted = formatForCreditor(formattedContent, category);

    // Store feedback
    const feedbackId = generateFeedbackId();
    const feedback: StoredFeedback = {
      id: feedbackId,
      caseId,
      debtorId: debtorId || 'anonymous',
      category,
      originalContent: content,
      formattedContent: generateCreditorSummary(formatted),
      aiAssisted,
      creditorAcknowledged: false,
      creditorResponse: null,
      createdAt: new Date(),
      acknowledgedAt: null,
      respondedAt: null,
    };

    feedbackStore.set(feedbackId, feedback);

    return res.json({
      success: true,
      data: {
        id: feedbackId,
        category,
        formattedContent: feedback.formattedContent,
        aiAssisted,
        status: 'submitted',
        createdAt: feedback.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
});

/**
 * GET /api/v1/cases/:caseId/feedback
 * Get all feedback for a case
 */
router.get('/cases/:caseId/feedback', (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;

    const caseFeedback = Array.from(feedbackStore.values())
      .filter((f) => f.caseId === caseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return res.json({
      success: true,
      data: caseFeedback.map((f) => ({
        id: f.id,
        category: f.category,
        originalContent: f.originalContent,
        formattedContent: f.formattedContent,
        aiAssisted: f.aiAssisted,
        status: getStatus(f),
        createdAt: f.createdAt.toISOString(),
        acknowledgedAt: f.acknowledgedAt?.toISOString() || null,
        respondedAt: f.respondedAt?.toISOString() || null,
        creditorResponse: f.creditorResponse,
      })),
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get feedback',
    });
  }
});

/**
 * POST /api/v1/feedback/:feedbackId/acknowledge
 * Creditor acknowledges viewing feedback
 */
router.post('/feedback/:feedbackId/acknowledge', (req: Request, res: Response) => {
  try {
    const { feedbackId } = req.params;

    const feedback = feedbackStore.get(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found',
      });
    }

    feedback.creditorAcknowledged = true;
    feedback.acknowledgedAt = new Date();

    return res.json({
      success: true,
      data: {
        id: feedbackId,
        status: 'acknowledged',
        acknowledgedAt: feedback.acknowledgedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Acknowledge feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to acknowledge feedback',
    });
  }
});

/**
 * POST /api/v1/feedback/:feedbackId/respond
 * Creditor responds to feedback
 */
router.post('/feedback/:feedbackId/respond', (req: Request, res: Response) => {
  try {
    const { feedbackId } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({
        success: false,
        error: 'Response is required',
      });
    }

    const feedback = feedbackStore.get(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found',
      });
    }

    feedback.creditorResponse = response;
    feedback.respondedAt = new Date();

    // Auto-acknowledge if not already
    if (!feedback.creditorAcknowledged) {
      feedback.creditorAcknowledged = true;
      feedback.acknowledgedAt = new Date();
    }

    return res.json({
      success: true,
      data: {
        id: feedbackId,
        status: 'responded',
        respondedAt: feedback.respondedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Respond to feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to respond to feedback',
    });
  }
});

/**
 * POST /api/v1/feedback/assist
 * Get AI assistance for feedback content
 */
router.post('/assist', async (req: Request, res: Response) => {
  try {
    const { content, category } = req.body;

    if (!content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Content and category are required',
      });
    }

    const assisted = await assistFeedback(content, category);

    return res.json({
      success: true,
      data: {
        structuredFeedback: assisted.structuredFeedback,
        keyPoints: assisted.keyPoints,
        suggestedTone: assisted.suggestedTone,
        proposedActions: assisted.proposedActions,
      },
    });
  } catch (error) {
    console.error('Assist feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assist with feedback',
    });
  }
});

/**
 * POST /api/v1/feedback/coach-tone
 * Get tone coaching for a message
 */
router.post('/coach-tone', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const coaching = await coachTone(message);

    return res.json({
      success: true,
      data: coaching,
    });
  } catch (error) {
    console.error('Coach tone error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to coach tone',
    });
  }
});

/**
 * Get status string for feedback
 */
function getStatus(feedback: StoredFeedback): string {
  if (feedback.creditorResponse) {
    return 'responded';
  }
  if (feedback.creditorAcknowledged) {
    return 'acknowledged';
  }
  return 'submitted';
}

export default router;
