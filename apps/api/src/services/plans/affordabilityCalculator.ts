/**
 * Affordability Calculator Service
 * Analyzes payment plan affordability based on financial assessment
 */

import { Frequency, normalizeToMonthly } from './planCalculator';

/**
 * Financial assessment data (from E3-S5)
 */
export interface FinancialAssessment {
  monthlyIncome: number;
  incomeRange: {
    min: number;
    max: number;
    midpoint: number;
  };
  monthlyExpenses: number;
  expenseCategories: Record<string, number>;
  hasEmergencyFund: boolean;
  dependents: number;
}

/**
 * Affordability result
 */
export interface AffordabilityResult {
  viabilityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  paymentToIncomeRatio: number;
  disposableIncomeUsed: number;
  disposableIncome: number;
  recommendation: 'recommended' | 'caution' | 'not_recommended';
  explanation: string;
  factors: AffordabilityFactor[];
}

/**
 * Individual affordability factor
 */
interface AffordabilityFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Affordability thresholds
 */
const THRESHOLDS = {
  LOW_RISK_MAX: 0.3, // <30% of disposable income
  MEDIUM_RISK_MAX: 0.5, // 30-50%
  // >50% is high risk

  INCOME_RATIO_CONCERN: 0.15, // >15% of gross income is concerning
  INCOME_RATIO_HIGH: 0.25, // >25% of gross income is high risk
};

/**
 * Calculate affordability for a payment plan
 */
export function calculateAffordability(
  paymentAmount: number,
  frequency: Frequency,
  assessment: FinancialAssessment
): AffordabilityResult {
  // Use midpoint of income range for calculation
  const monthlyIncome = assessment.incomeRange?.midpoint || assessment.monthlyIncome || 0;
  const monthlyExpenses = assessment.monthlyExpenses || 0;
  const disposableIncome = monthlyIncome - monthlyExpenses;

  // Normalize payment to monthly
  const monthlyPayment = normalizeToMonthly(paymentAmount, frequency);

  // Calculate ratios
  const disposableRatio = disposableIncome > 0 ? monthlyPayment / disposableIncome : 1;
  const incomeRatio = monthlyIncome > 0 ? monthlyPayment / monthlyIncome : 1;

  // Determine risk level
  let riskLevel: AffordabilityResult['riskLevel'];
  if (disposableRatio <= THRESHOLDS.LOW_RISK_MAX) {
    riskLevel = 'low';
  } else if (disposableRatio <= THRESHOLDS.MEDIUM_RISK_MAX) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  // Calculate viability score (0-100)
  let viabilityScore: number;
  if (disposableRatio <= 0) {
    viabilityScore = 0;
  } else if (disposableRatio >= 1) {
    viabilityScore = 0;
  } else {
    viabilityScore = Math.round((1 - disposableRatio) * 100);
  }
  viabilityScore = Math.max(0, Math.min(100, viabilityScore));

  // Determine recommendation
  let recommendation: AffordabilityResult['recommendation'];
  if (riskLevel === 'low' && incomeRatio < THRESHOLDS.INCOME_RATIO_CONCERN) {
    recommendation = 'recommended';
  } else if (riskLevel === 'high' || incomeRatio > THRESHOLDS.INCOME_RATIO_HIGH) {
    recommendation = 'not_recommended';
  } else {
    recommendation = 'caution';
  }

  // Analyze factors
  const factors = analyzeFactors(
    disposableRatio,
    incomeRatio,
    assessment,
    monthlyPayment
  );

  // Generate explanation
  const explanation = generateExplanation(
    recommendation,
    disposableRatio,
    incomeRatio,
    factors
  );

  return {
    viabilityScore,
    riskLevel,
    paymentToIncomeRatio: Math.round(incomeRatio * 100 * 10) / 10,
    disposableIncomeUsed: Math.round(disposableRatio * 100 * 10) / 10,
    disposableIncome: Math.round(disposableIncome * 100) / 100,
    recommendation,
    explanation,
    factors,
  };
}

/**
 * Analyze individual affordability factors
 */
function analyzeFactors(
  disposableRatio: number,
  incomeRatio: number,
  assessment: FinancialAssessment,
  monthlyPayment: number
): AffordabilityFactor[] {
  const factors: AffordabilityFactor[] = [];

  // Disposable income factor
  if (disposableRatio <= THRESHOLDS.LOW_RISK_MAX) {
    factors.push({
      name: 'Disposable Income',
      impact: 'positive',
      description: 'Payment is within a comfortable range of your disposable income',
    });
  } else if (disposableRatio <= THRESHOLDS.MEDIUM_RISK_MAX) {
    factors.push({
      name: 'Disposable Income',
      impact: 'neutral',
      description: 'Payment uses a moderate portion of your disposable income',
    });
  } else {
    factors.push({
      name: 'Disposable Income',
      impact: 'negative',
      description: 'Payment uses a high portion of your disposable income',
    });
  }

  // Income ratio factor
  if (incomeRatio > THRESHOLDS.INCOME_RATIO_HIGH) {
    factors.push({
      name: 'Income Ratio',
      impact: 'negative',
      description: 'Payment represents a significant portion of your gross income',
    });
  } else if (incomeRatio > THRESHOLDS.INCOME_RATIO_CONCERN) {
    factors.push({
      name: 'Income Ratio',
      impact: 'neutral',
      description: 'Payment is a moderate portion of your gross income',
    });
  }

  // Emergency fund factor
  if (assessment.hasEmergencyFund) {
    factors.push({
      name: 'Emergency Fund',
      impact: 'positive',
      description: 'Having savings provides a buffer for unexpected expenses',
    });
  } else {
    factors.push({
      name: 'Emergency Fund',
      impact: 'neutral',
      description: 'Building an emergency fund would provide additional security',
    });
  }

  // Dependents factor
  if (assessment.dependents > 2) {
    factors.push({
      name: 'Dependents',
      impact: 'negative',
      description: 'Multiple dependents increase financial responsibilities',
    });
  }

  return factors;
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  recommendation: AffordabilityResult['recommendation'],
  disposableRatio: number,
  incomeRatio: number,
  factors: AffordabilityFactor[]
): string {
  const percentUsed = Math.round(disposableRatio * 100);

  switch (recommendation) {
    case 'recommended':
      return `This payment plan uses ${percentUsed}% of your estimated disposable income, which is within a comfortable range. You should be able to maintain this payment while covering your regular expenses.`;

    case 'caution':
      return `This payment plan uses ${percentUsed}% of your estimated disposable income. While manageable, you may want to consider a lower payment amount to leave more room for unexpected expenses.`;

    case 'not_recommended':
      if (disposableRatio >= 1) {
        return `This payment amount exceeds your estimated disposable income. We recommend choosing a lower payment amount that fits within your budget.`;
      }
      return `This payment plan uses ${percentUsed}% of your estimated disposable income, which may be difficult to sustain. Consider a lower payment amount or discussing your situation with the creditor.`;

    default:
      return `Based on your financial assessment, this plan uses ${percentUsed}% of your disposable income.`;
  }
}

/**
 * Suggest affordable payment amount
 */
export function suggestAffordablePayment(
  assessment: FinancialAssessment,
  frequency: Frequency,
  targetRisk: 'low' | 'medium' = 'low'
): number {
  const monthlyIncome = assessment.incomeRange?.midpoint || assessment.monthlyIncome || 0;
  const monthlyExpenses = assessment.monthlyExpenses || 0;
  const disposableIncome = monthlyIncome - monthlyExpenses;

  // Target percentage of disposable income
  const targetRatio = targetRisk === 'low' ? 0.25 : 0.4;
  const targetMonthlyPayment = disposableIncome * targetRatio;

  // Convert to frequency amount
  switch (frequency) {
    case Frequency.WEEKLY:
      return Math.round(targetMonthlyPayment / 4.33);
    case Frequency.BIWEEKLY:
      return Math.round(targetMonthlyPayment / 2.17);
    case Frequency.MONTHLY:
      return Math.round(targetMonthlyPayment);
    default:
      return Math.round(targetMonthlyPayment);
  }
}

/**
 * Create default assessment for users without one
 */
export function createDefaultAssessment(): FinancialAssessment {
  return {
    monthlyIncome: 0,
    incomeRange: { min: 0, max: 0, midpoint: 0 },
    monthlyExpenses: 0,
    expenseCategories: {},
    hasEmergencyFund: false,
    dependents: 0,
  };
}
