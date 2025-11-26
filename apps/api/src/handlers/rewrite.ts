/**
 * Message Rewrite API Handlers
 * Endpoints for AI-powered message rewriting suggestions
 */

import { Router, Request, Response } from 'express';
import { suggestRewrites, shouldOfferSuggestions } from '../services/ai/messageRewriter';
import { analyzeTone, ToneAnalysisResult } from '../services/ai/toneAnalyzer';
import { trackRewriteRequest, recordAcceptance, getAcceptanceStats } from '../services/ai/rewriteTracker';

const router = Router();

/**
 * POST /api/v1/messages/rewrite
 * Get rewrite suggestions for a message
 */
router.post('/rewrite', async (req: Request, res: Response) => {
  try {
    const { content, userId, userRole = 'DEBTOR' } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    // First analyze the tone
    const toneAnalysis = await analyzeTone(content, userRole);

    // Check if suggestions are needed
    if (!shouldOfferSuggestions(toneAnalysis)) {
      return res.json({
        success: true,
        data: {
          original: content,
          originalScore: toneAnalysis.warmthScore,
          suggestions: [],
          message: 'Message tone is appropriate, no suggestions needed',
        },
      });
    }

    // Generate rewrite suggestions
    const rewriteResponse = await suggestRewrites(content, toneAnalysis);

    // Track the request for learning
    if (userId && rewriteResponse.suggestions.length > 0) {
      trackRewriteRequest(userId, userRole, content, rewriteResponse.suggestions);
    }

    return res.json({
      success: true,
      data: {
        original: rewriteResponse.original,
        originalScore: rewriteResponse.originalScore,
        suggestions: rewriteResponse.suggestions,
        toneAnalysis: {
          warmthScore: toneAnalysis.warmthScore,
          toneCategory: toneAnalysis.toneCategory,
          concerns: toneAnalysis.concerns,
          recommendation: toneAnalysis.recommendation,
        },
      },
    });
  } catch (error) {
    console.error('Rewrite suggestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate rewrite suggestions',
    });
  }
});

/**
 * POST /api/v1/messages/accept-rewrite
 * Record when a user accepts a suggested rewrite
 */
router.post('/accept-rewrite', async (req: Request, res: Response) => {
  try {
    const { originalContent, acceptedSuggestionId, acceptedText, userId } = req.body;

    if (!originalContent || !acceptedSuggestionId || !acceptedText) {
      return res.status(400).json({
        success: false,
        error: 'originalContent, acceptedSuggestionId, and acceptedText are required',
      });
    }

    const result = recordAcceptance(originalContent, acceptedSuggestionId, acceptedText, userId || 'anonymous');

    return res.json({
      success: true,
      data: {
        tracked: result.tracked,
        wasEdited: result.wasEdited,
      },
    });
  } catch (error) {
    console.error('Accept rewrite error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record rewrite acceptance',
    });
  }
});

/**
 * POST /api/v1/messages/analyze-and-suggest
 * Combined endpoint: analyze tone and get suggestions if needed
 */
router.post('/analyze-and-suggest', async (req: Request, res: Response) => {
  try {
    const { content, userId, userRole = 'DEBTOR' } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    // Analyze tone
    const toneAnalysis = await analyzeTone(content, userRole);

    // Prepare response
    const response: {
      success: boolean;
      data: {
        canSend: boolean;
        toneAnalysis: ToneAnalysisResult;
        suggestions?: {
          original: string;
          originalScore: number;
          suggestions: Array<{
            id: string;
            suggestedText: string;
            warmthImprovement: number;
            changes: string[];
          }>;
        };
      };
    } = {
      success: true,
      data: {
        canSend: toneAnalysis.recommendation !== 'block',
        toneAnalysis,
      },
    };

    // Add suggestions if needed
    if (shouldOfferSuggestions(toneAnalysis)) {
      const rewriteResponse = await suggestRewrites(content, toneAnalysis);

      if (userId && rewriteResponse.suggestions.length > 0) {
        trackRewriteRequest(userId, userRole, content, rewriteResponse.suggestions);
      }

      response.data.suggestions = {
        original: rewriteResponse.original,
        originalScore: rewriteResponse.originalScore,
        suggestions: rewriteResponse.suggestions.map((s) => ({
          id: s.id,
          suggestedText: s.suggestedText,
          warmthImprovement: s.warmthImprovement,
          changes: s.changes,
        })),
      };
    }

    return res.json(response);
  } catch (error) {
    console.error('Analyze and suggest error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze message',
    });
  }
});

/**
 * GET /api/v1/messages/rewrite-stats
 * Get acceptance statistics (admin only)
 */
router.get('/rewrite-stats', async (_req: Request, res: Response) => {
  try {
    const stats = getAcceptanceStats();

    return res.json({
      success: true,
      data: {
        totalRequests: stats.totalRequests,
        acceptedCount: stats.acceptedCount,
        editedCount: stats.editedCount,
        acceptanceRate: Math.round(stats.acceptanceRate * 100) / 100,
        topPatterns: stats.mostEffectivePatterns.slice(0, 5).map((p) => ({
          pattern: p.originalPattern,
          acceptanceCount: p.acceptanceCount,
          averageImprovement: Math.round(p.averageWarmthImprovement),
        })),
      },
    });
  } catch (error) {
    console.error('Rewrite stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get rewrite statistics',
    });
  }
});

export default router;
