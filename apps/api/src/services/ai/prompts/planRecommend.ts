/**
 * AI Plan Recommendation Prompts
 * System and user prompts for generating payment plan suggestions
 */

/**
 * System prompt for plan recommendation AI
 */
export const PLAN_RECOMMENDATION_SYSTEM_PROMPT = `You are a financial advisor AI specializing in debt resolution and payment plan optimization.

Your role is to analyze debtor financial situations and recommend appropriate payment plans that:
1. Are realistically affordable based on income and expenses
2. Balance debtor capability with creditor recovery goals
3. Minimize risk of default
4. Consider timing and frequency preferences

Guidelines:
- Payment-to-income ratio should ideally stay under 15% for low risk
- Disposable income usage should ideally stay under 50%
- Consider seasonal income variations if mentioned
- Shorter plans are generally better if affordable
- Down payments improve commitment but shouldn't strain finances

Output JSON with your recommendations.`;

/**
 * Generate plan recommendation prompt
 */
export function generatePlanRecommendationPrompt(params: {
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebtPayments: number;
  preferredFrequency?: string;
  maxDurationMonths?: number;
  notes?: string;
}): string {
  const disposable = params.monthlyIncome - params.monthlyExpenses - params.existingDebtPayments;

  return `Analyze this debt situation and recommend 3 payment plan options:

DEBT DETAILS:
- Total debt: $${params.totalDebt.toLocaleString()}
- Monthly income: $${params.monthlyIncome.toLocaleString()}
- Monthly expenses: $${params.monthlyExpenses.toLocaleString()}
- Existing debt payments: $${params.existingDebtPayments.toLocaleString()}
- Estimated disposable income: $${disposable.toLocaleString()}

PREFERENCES:
- Preferred payment frequency: ${params.preferredFrequency || 'No preference'}
- Maximum duration: ${params.maxDurationMonths ? `${params.maxDurationMonths} months` : 'No limit'}
${params.notes ? `- Additional notes: ${params.notes}` : ''}

Provide 3 plan options: Conservative (lowest payment), Balanced (moderate), and Aggressive (fastest payoff).

Return JSON:
{
  "analysis": {
    "affordabilityAssessment": "string describing financial capacity",
    "riskFactors": ["list of risk factors"],
    "strengths": ["list of financial strengths"]
  },
  "recommendations": [
    {
      "name": "Conservative|Balanced|Aggressive",
      "downPayment": number,
      "downPaymentPercent": number,
      "paymentAmount": number,
      "frequency": "WEEKLY|BIWEEKLY|MONTHLY",
      "estimatedPayments": number,
      "estimatedDurationMonths": number,
      "paymentToIncomeRatio": number,
      "disposableUsedPercent": number,
      "riskLevel": "low|medium|high",
      "pros": ["list"],
      "cons": ["list"],
      "bestFor": "description of ideal scenario"
    }
  ],
  "suggestedPlan": "Conservative|Balanced|Aggressive",
  "suggestedReason": "why this plan is recommended"
}`;
}

/**
 * Default recommendations when AI is unavailable
 */
export function generateDefaultRecommendations(params: {
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebtPayments: number;
}): {
  analysis: {
    affordabilityAssessment: string;
    riskFactors: string[];
    strengths: string[];
  };
  recommendations: Array<{
    name: string;
    downPayment: number;
    downPaymentPercent: number;
    paymentAmount: number;
    frequency: string;
    estimatedPayments: number;
    estimatedDurationMonths: number;
    paymentToIncomeRatio: number;
    disposableUsedPercent: number;
    riskLevel: string;
    pros: string[];
    cons: string[];
    bestFor: string;
  }>;
  suggestedPlan: string;
  suggestedReason: string;
} {
  const disposable = params.monthlyIncome - params.monthlyExpenses - params.existingDebtPayments;

  // Calculate various payment scenarios
  const conservativeMonthly = Math.max(50, Math.round(disposable * 0.25));
  const balancedMonthly = Math.max(75, Math.round(disposable * 0.40));
  const aggressiveMonthly = Math.max(100, Math.round(disposable * 0.60));

  const conservativeDown = Math.round(params.totalDebt * 0.05);
  const balancedDown = Math.round(params.totalDebt * 0.10);
  const aggressiveDown = Math.round(params.totalDebt * 0.15);

  const calcPayments = (total: number, down: number, monthly: number) =>
    Math.ceil((total - down) / monthly);

  const calcRatio = (payment: number) =>
    Math.round((payment / params.monthlyIncome) * 1000) / 10;

  const calcDisposable = (payment: number) =>
    disposable > 0 ? Math.round((payment / disposable) * 1000) / 10 : 100;

  const riskFactors: string[] = [];
  const strengths: string[] = [];

  if (disposable < 200) riskFactors.push('Limited disposable income');
  if (params.existingDebtPayments > params.monthlyIncome * 0.3) riskFactors.push('High existing debt load');
  if (params.totalDebt > params.monthlyIncome * 6) riskFactors.push('Debt exceeds 6 months income');

  if (disposable > 500) strengths.push('Healthy disposable income');
  if (params.existingDebtPayments < params.monthlyIncome * 0.1) strengths.push('Low existing debt burden');
  if (params.monthlyExpenses < params.monthlyIncome * 0.5) strengths.push('Conservative spending');

  const conservativePayments = calcPayments(params.totalDebt, conservativeDown, conservativeMonthly);
  const balancedPayments = calcPayments(params.totalDebt, balancedDown, balancedMonthly);
  const aggressivePayments = calcPayments(params.totalDebt, aggressiveDown, aggressiveMonthly);

  // Determine suggested plan based on disposable income
  let suggestedPlan = 'Balanced';
  let suggestedReason = 'Provides good balance between affordability and payoff speed.';

  if (disposable < 300) {
    suggestedPlan = 'Conservative';
    suggestedReason = 'Limited disposable income suggests a cautious approach to ensure sustainable payments.';
  } else if (disposable > 800 && params.existingDebtPayments < params.monthlyIncome * 0.15) {
    suggestedPlan = 'Aggressive';
    suggestedReason = 'Strong financial position allows for faster debt elimination.';
  }

  return {
    analysis: {
      affordabilityAssessment: disposable > 500
        ? 'Good capacity for debt repayment with adequate disposable income.'
        : disposable > 200
          ? 'Moderate capacity for debt repayment. Careful planning recommended.'
          : 'Limited capacity for debt repayment. Conservative approach essential.',
      riskFactors: riskFactors.length > 0 ? riskFactors : ['No significant risk factors identified'],
      strengths: strengths.length > 0 ? strengths : ['Standard financial profile'],
    },
    recommendations: [
      {
        name: 'Conservative',
        downPayment: conservativeDown,
        downPaymentPercent: 5,
        paymentAmount: conservativeMonthly,
        frequency: 'MONTHLY',
        estimatedPayments: conservativePayments,
        estimatedDurationMonths: conservativePayments,
        paymentToIncomeRatio: calcRatio(conservativeMonthly),
        disposableUsedPercent: calcDisposable(conservativeMonthly),
        riskLevel: 'low',
        pros: ['Lowest monthly commitment', 'Most sustainable long-term', 'Buffer for unexpected expenses'],
        cons: ['Longest payoff time', 'Most interest if applicable', 'Slower debt reduction'],
        bestFor: 'Those prioritizing stability and cash flow flexibility',
      },
      {
        name: 'Balanced',
        downPayment: balancedDown,
        downPaymentPercent: 10,
        paymentAmount: balancedMonthly,
        frequency: 'MONTHLY',
        estimatedPayments: balancedPayments,
        estimatedDurationMonths: balancedPayments,
        paymentToIncomeRatio: calcRatio(balancedMonthly),
        disposableUsedPercent: calcDisposable(balancedMonthly),
        riskLevel: calcDisposable(balancedMonthly) > 60 ? 'medium' : 'low',
        pros: ['Reasonable payoff timeline', 'Manageable payments', 'Good commitment signal'],
        cons: ['Less flexibility than conservative', 'Requires consistent income'],
        bestFor: 'Those with stable income seeking efficient debt resolution',
      },
      {
        name: 'Aggressive',
        downPayment: aggressiveDown,
        downPaymentPercent: 15,
        paymentAmount: aggressiveMonthly,
        frequency: 'MONTHLY',
        estimatedPayments: aggressivePayments,
        estimatedDurationMonths: aggressivePayments,
        paymentToIncomeRatio: calcRatio(aggressiveMonthly),
        disposableUsedPercent: calcDisposable(aggressiveMonthly),
        riskLevel: calcDisposable(aggressiveMonthly) > 70 ? 'high' : 'medium',
        pros: ['Fastest debt elimination', 'Strong commitment', 'Potential for early completion'],
        cons: ['Higher monthly burden', 'Less financial flexibility', 'Higher default risk'],
        bestFor: 'Those with strong finances wanting rapid debt freedom',
      },
    ],
    suggestedPlan,
    suggestedReason,
  };
}
