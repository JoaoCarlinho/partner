/**
 * Payment Plans API Handlers
 * Endpoints for creating and managing payment plans
 */

import { Router, Request, Response } from 'express';
import {
  calculatePlanDetails,
  generatePaymentSchedule,
  validatePlanInput,
  suggestPaymentAmount,
  Frequency,
  PlanStatus,
  PlanInput,
  ScheduledPayment,
} from '../services/plans/planCalculator';
import {
  calculateAffordability,
  suggestAffordablePayment,
  FinancialAssessment,
  AffordabilityResult,
} from '../services/plans/affordabilityCalculator';

const router = Router();

/**
 * Payment plan interface
 */
interface PaymentPlan {
  id: string;
  caseId: string;
  debtorId: string;
  totalAmount: number;
  downPayment: number;
  remainingBalance: number;
  paymentAmount: number;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  numPayments: number;
  status: PlanStatus;
  proposedBy: string;
  schedule: ScheduledPayment[];
  affordability: AffordabilityResult | null;
  createdAt: string;
  updatedAt: string;
}

// In-memory store (would use database in production)
const plansStore: Map<string, PaymentPlan> = new Map();
const assessmentsStore: Map<string, FinancialAssessment> = new Map();

/**
 * Generate unique plan ID
 */
function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create mock assessment for demo
 */
function getAssessment(debtorId: string): FinancialAssessment {
  const existing = assessmentsStore.get(debtorId);
  if (existing) return existing;

  // Create default assessment for demo
  const defaultAssessment: FinancialAssessment = {
    monthlyIncome: 4000,
    incomeRange: { min: 3500, max: 4500, midpoint: 4000 },
    monthlyExpenses: 2800,
    expenseCategories: {
      housing: 1200,
      utilities: 200,
      food: 400,
      transportation: 300,
      healthcare: 100,
      other: 600,
    },
    hasEmergencyFund: false,
    dependents: 1,
  };

  assessmentsStore.set(debtorId, defaultAssessment);
  return defaultAssessment;
}

/**
 * POST /api/v1/cases/:caseId/plans
 * Create a new payment plan proposal
 */
router.post('/cases/:caseId/plans', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const {
      totalAmount,
      downPayment = 0,
      paymentAmount,
      frequency,
      startDate,
      debtorId,
      proposedBy,
    } = req.body;

    // Validate required fields
    if (!totalAmount || !paymentAmount || !frequency || !startDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: totalAmount, paymentAmount, frequency, startDate',
      });
    }

    // Parse and validate input
    const planInput: PlanInput = {
      totalAmount: parseFloat(totalAmount),
      downPayment: parseFloat(downPayment),
      paymentAmount: parseFloat(paymentAmount),
      frequency: frequency as Frequency,
      startDate: new Date(startDate),
    };

    const validation = validatePlanInput(planInput);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan parameters',
        details: validation.errors,
      });
    }

    // Calculate plan details
    const calculation = calculatePlanDetails(planInput);

    // Get financial assessment for affordability check
    const assessment = getAssessment(debtorId || 'default');
    const affordability = calculateAffordability(
      planInput.paymentAmount,
      planInput.frequency,
      assessment
    );

    // Create plan
    const planId = generatePlanId();
    const now = new Date().toISOString();

    const plan: PaymentPlan = {
      id: planId,
      caseId,
      debtorId: debtorId || 'default',
      totalAmount: planInput.totalAmount,
      downPayment: planInput.downPayment,
      remainingBalance: calculation.remainingBalance,
      paymentAmount: planInput.paymentAmount,
      frequency: planInput.frequency,
      startDate: planInput.startDate.toISOString(),
      endDate: calculation.endDate.toISOString(),
      numPayments: calculation.numPayments,
      status: PlanStatus.PROPOSED,
      proposedBy: proposedBy || debtorId || 'default',
      schedule: calculation.schedule,
      affordability,
      createdAt: now,
      updatedAt: now,
    };

    plansStore.set(planId, plan);

    return res.status(201).json({
      success: true,
      data: {
        ...plan,
        durationMonths: calculation.durationMonths,
        durationWeeks: calculation.durationWeeks,
      },
    });
  } catch (error) {
    console.error('Create plan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment plan',
    });
  }
});

/**
 * GET /api/v1/cases/:caseId/plans
 * Get all payment plans for a case
 */
router.get('/cases/:caseId/plans', (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;

    const casePlans = Array.from(plansStore.values())
      .filter((p) => p.caseId === caseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: casePlans,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get payment plans',
    });
  }
});

/**
 * GET /api/v1/plans/:planId
 * Get a specific payment plan with full details
 */
router.get('/plans/:planId', (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const plan = plansStore.get(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Get plan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get payment plan',
    });
  }
});

/**
 * POST /api/v1/plans/calculate
 * Calculate plan details without creating (preview)
 */
router.post('/plans/calculate', (req: Request, res: Response) => {
  try {
    const { totalAmount, downPayment = 0, paymentAmount, frequency, startDate, debtorId } = req.body;

    if (!totalAmount || !paymentAmount || !frequency || !startDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const planInput: PlanInput = {
      totalAmount: parseFloat(totalAmount),
      downPayment: parseFloat(downPayment),
      paymentAmount: parseFloat(paymentAmount),
      frequency: frequency as Frequency,
      startDate: new Date(startDate),
    };

    const validation = validatePlanInput(planInput);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: validation.errors,
      });
    }

    const calculation = calculatePlanDetails(planInput);

    // Get affordability if debtor provided
    let affordability: AffordabilityResult | null = null;
    if (debtorId) {
      const assessment = getAssessment(debtorId);
      affordability = calculateAffordability(planInput.paymentAmount, planInput.frequency, assessment);
    }

    return res.json({
      success: true,
      data: {
        remainingBalance: calculation.remainingBalance,
        numPayments: calculation.numPayments,
        endDate: calculation.endDate.toISOString(),
        durationMonths: calculation.durationMonths,
        durationWeeks: calculation.durationWeeks,
        schedule: calculation.schedule,
        affordability,
      },
    });
  } catch (error) {
    console.error('Calculate plan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate plan',
    });
  }
});

/**
 * GET /api/v1/plans/suggest
 * Get suggested payment amounts
 */
router.get('/plans/suggest', (req: Request, res: Response) => {
  try {
    const { totalAmount, downPayment = '0', frequency, targetMonths, debtorId } = req.query;

    if (!totalAmount || !frequency) {
      return res.status(400).json({
        success: false,
        error: 'totalAmount and frequency are required',
      });
    }

    const total = parseFloat(totalAmount as string);
    const down = parseFloat(downPayment as string);
    const freq = frequency as Frequency;
    const months = targetMonths ? parseInt(targetMonths as string, 10) : 12;

    // Suggest based on target duration
    const durationBased = suggestPaymentAmount(total, down, freq, months);

    // Suggest based on affordability if debtor provided
    let affordabilityBased: number | null = null;
    let affordability: AffordabilityResult | null = null;

    if (debtorId) {
      const assessment = getAssessment(debtorId as string);
      affordabilityBased = suggestAffordablePayment(assessment, freq, 'low');
      affordability = calculateAffordability(affordabilityBased, freq, assessment);
    }

    return res.json({
      success: true,
      data: {
        suggestions: [
          {
            type: 'duration_based',
            amount: durationBased,
            description: `Pay off in ~${months} months`,
          },
          affordabilityBased
            ? {
                type: 'affordability_based',
                amount: affordabilityBased,
                description: 'Based on your financial assessment (low risk)',
                affordability,
              }
            : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Suggest payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to suggest payment amounts',
    });
  }
});

/**
 * PUT /api/v1/plans/:planId/status
 * Update plan status
 */
router.put('/plans/:planId/status', (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { status } = req.body;

    const plan = plansStore.get(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    if (!Object.values(PlanStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    plan.status = status;
    plan.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Update plan status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update plan status',
    });
  }
});

export default router;
