/**
 * Plan Recommendations API Handler
 * Endpoints for AI-powered payment plan recommendations
 */

import { Router, Request, Response } from 'express';
import {
  generatePlanRecommendations,
  refineRecommendation,
  comparePlans,
  PlanRecommendationInput,
  PlanRecommendation,
} from '../services/ai/planRecommender';

const router = Router();

/**
 * In-memory storage for recommendation sessions
 * In production, use Redis or database
 */
const recommendationSessions: Map<
  string,
  {
    input: PlanRecommendationInput;
    recommendations: PlanRecommendation[];
    selectedPlan?: string;
    refinedPlan?: PlanRecommendation;
    createdAt: Date;
  }
> = new Map();

/**
 * Generate new recommendations
 * POST /api/recommendations
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      existingDebtPayments = 0,
      preferredFrequency,
      maxDurationMonths,
      notes,
    } = req.body;

    // Validate required fields
    if (!totalDebt || totalDebt <= 0) {
      return res.status(400).json({ error: 'Total debt must be positive' });
    }
    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ error: 'Monthly income must be positive' });
    }
    if (monthlyExpenses === undefined || monthlyExpenses < 0) {
      return res.status(400).json({ error: 'Monthly expenses must be non-negative' });
    }

    const input: PlanRecommendationInput = {
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      existingDebtPayments,
      preferredFrequency,
      maxDurationMonths,
      notes,
    };

    const result = await generatePlanRecommendations(input);

    // Create session for follow-up interactions
    const sessionId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    recommendationSessions.set(sessionId, {
      input,
      recommendations: result.recommendations,
      createdAt: new Date(),
    });

    // Clean old sessions (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [key, session] of recommendationSessions.entries()) {
      if (session.createdAt < oneHourAgo) {
        recommendationSessions.delete(key);
      }
    }

    return res.json({
      sessionId,
      ...result,
    });
  } catch (error) {
    console.error('Recommendation generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get session recommendations
 * GET /api/recommendations/:sessionId
 */
router.get('/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = recommendationSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Recommendation session not found' });
  }

  return res.json({
    sessionId,
    input: session.input,
    recommendations: session.recommendations,
    selectedPlan: session.selectedPlan,
    refinedPlan: session.refinedPlan,
  });
});

/**
 * Select a recommended plan
 * POST /api/recommendations/:sessionId/select
 */
router.post('/:sessionId/select', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { planName } = req.body;

  const session = recommendationSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Recommendation session not found' });
  }

  const selectedPlan = session.recommendations.find(
    (r) => r.name.toLowerCase() === planName.toLowerCase()
  );
  if (!selectedPlan) {
    return res.status(400).json({
      error: 'Invalid plan name',
      validOptions: session.recommendations.map((r) => r.name),
    });
  }

  session.selectedPlan = planName;
  recommendationSessions.set(sessionId, session);

  return res.json({
    success: true,
    selectedPlan,
  });
});

/**
 * Refine a recommendation based on feedback
 * POST /api/recommendations/:sessionId/refine
 */
router.post('/:sessionId/refine', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { adjustments, concerns } = req.body;

    const session = recommendationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Recommendation session not found' });
    }

    const refined = await refineRecommendation(session.input, {
      selectedPlan: session.selectedPlan,
      adjustments,
      concerns,
    });

    session.refinedPlan = refined;
    recommendationSessions.set(sessionId, session);

    return res.json({
      success: true,
      refinedPlan: refined,
    });
  } catch (error) {
    console.error('Refinement error:', error);
    return res.status(500).json({
      error: 'Failed to refine recommendation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Compare two plans
 * POST /api/recommendations/:sessionId/compare
 */
router.post('/:sessionId/compare', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { plan1Name, plan2Name } = req.body;

  const session = recommendationSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Recommendation session not found' });
  }

  const allPlans = [...session.recommendations];
  if (session.refinedPlan) {
    allPlans.push(session.refinedPlan);
  }

  const plan1 = allPlans.find((r) => r.name.toLowerCase() === plan1Name.toLowerCase());
  const plan2 = allPlans.find((r) => r.name.toLowerCase() === plan2Name.toLowerCase());

  if (!plan1 || !plan2) {
    return res.status(400).json({
      error: 'Invalid plan names',
      validOptions: allPlans.map((r) => r.name),
    });
  }

  const comparison = comparePlans(plan1, plan2);

  return res.json({
    plan1: plan1Name,
    plan2: plan2Name,
    ...comparison,
  });
});

/**
 * Quick recommendation without session
 * POST /api/recommendations/quick
 */
router.post('/quick', async (req: Request, res: Response) => {
  try {
    const { totalDebt, monthlyIncome, monthlyExpenses, existingDebtPayments = 0 } = req.body;

    // Validate
    if (!totalDebt || !monthlyIncome) {
      return res.status(400).json({ error: 'Total debt and monthly income required' });
    }

    const disposable = monthlyIncome - (monthlyExpenses || 0) - existingDebtPayments;
    const suggestedMonthly = Math.max(50, Math.round(disposable * 0.35));

    // Quick calculation
    const remaining = totalDebt;
    const numPayments = Math.ceil(remaining / suggestedMonthly);
    const durationMonths = numPayments;

    return res.json({
      suggestedPayment: suggestedMonthly,
      suggestedFrequency: 'MONTHLY',
      estimatedPayments: numPayments,
      estimatedDurationMonths: durationMonths,
      paymentToIncomeRatio: Math.round((suggestedMonthly / monthlyIncome) * 1000) / 10,
      riskLevel:
        disposable > 500
          ? 'low'
          : disposable > 200
            ? 'medium'
            : 'high',
      note: 'This is a quick estimate. Use /api/recommendations for detailed analysis.',
    });
  } catch (error) {
    console.error('Quick recommendation error:', error);
    return res.status(500).json({ error: 'Failed to generate quick recommendation' });
  }
});

export default router;
