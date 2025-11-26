/**
 * AI Plan Recommender Service
 * Generates personalized payment plan recommendations using AI
 */

import {
  PLAN_RECOMMENDATION_SYSTEM_PROMPT,
  generatePlanRecommendationPrompt,
  generateDefaultRecommendations,
} from './prompts/planRecommend';

/**
 * Plan recommendation input
 */
export interface PlanRecommendationInput {
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebtPayments: number;
  preferredFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  maxDurationMonths?: number;
  notes?: string;
}

/**
 * Individual plan recommendation
 */
export interface PlanRecommendation {
  name: string;
  downPayment: number;
  downPaymentPercent: number;
  paymentAmount: number;
  frequency: string;
  estimatedPayments: number;
  estimatedDurationMonths: number;
  paymentToIncomeRatio: number;
  disposableUsedPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  pros: string[];
  cons: string[];
  bestFor: string;
}

/**
 * Full recommendation response
 */
export interface PlanRecommendationResult {
  analysis: {
    affordabilityAssessment: string;
    riskFactors: string[];
    strengths: string[];
  };
  recommendations: PlanRecommendation[];
  suggestedPlan: string;
  suggestedReason: string;
  generatedBy: 'ai' | 'fallback';
}

/**
 * AWS Bedrock client configuration
 */
interface BedrockConfig {
  region: string;
  modelId: string;
}

const BEDROCK_CONFIG: BedrockConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
};

/**
 * Call AWS Bedrock for AI recommendations
 */
async function callBedrock(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    // Dynamic import for AWS SDK
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );

    const client = new BedrockRuntimeClient({ region: BEDROCK_CONFIG.region });

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: BEDROCK_CONFIG.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content?.[0]?.text || null;
  } catch (error) {
    console.error('Bedrock API error:', error);
    return null;
  }
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(response: string): PlanRecommendationResult | null {
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.analysis || !parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      return null;
    }

    return {
      ...parsed,
      generatedBy: 'ai',
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

/**
 * Generate payment plan recommendations
 */
export async function generatePlanRecommendations(
  input: PlanRecommendationInput
): Promise<PlanRecommendationResult> {
  // Validate input
  if (input.monthlyIncome <= 0) {
    throw new Error('Monthly income must be positive');
  }
  if (input.totalDebt <= 0) {
    throw new Error('Total debt must be positive');
  }

  // Try AI-powered recommendation
  const userPrompt = generatePlanRecommendationPrompt({
    totalDebt: input.totalDebt,
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingDebtPayments: input.existingDebtPayments,
    preferredFrequency: input.preferredFrequency,
    maxDurationMonths: input.maxDurationMonths,
    notes: input.notes,
  });

  const aiResponse = await callBedrock(PLAN_RECOMMENDATION_SYSTEM_PROMPT, userPrompt);

  if (aiResponse) {
    const parsed = parseAIResponse(aiResponse);
    if (parsed) {
      return parsed;
    }
  }

  // Fallback to algorithmic recommendations
  const fallback = generateDefaultRecommendations({
    totalDebt: input.totalDebt,
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingDebtPayments: input.existingDebtPayments,
  });

  return {
    ...fallback,
    generatedBy: 'fallback',
  } as PlanRecommendationResult;
}

/**
 * Refine recommendations based on user feedback
 */
export async function refineRecommendation(
  originalInput: PlanRecommendationInput,
  feedback: {
    selectedPlan?: string;
    adjustments?: {
      lowerPayment?: boolean;
      higherDownPayment?: boolean;
      differentFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      shorterDuration?: boolean;
    };
    concerns?: string;
  }
): Promise<PlanRecommendation> {
  const disposable =
    originalInput.monthlyIncome -
    originalInput.monthlyExpenses -
    originalInput.existingDebtPayments;

  // Start with balanced baseline
  let paymentAmount = Math.round(disposable * 0.4);
  let downPayment = Math.round(originalInput.totalDebt * 0.1);
  let frequency: string = originalInput.preferredFrequency || 'MONTHLY';

  // Apply adjustments
  if (feedback.adjustments?.lowerPayment) {
    paymentAmount = Math.round(paymentAmount * 0.75);
  }
  if (feedback.adjustments?.higherDownPayment) {
    downPayment = Math.round(downPayment * 1.5);
  }
  if (feedback.adjustments?.differentFrequency) {
    frequency = feedback.adjustments.differentFrequency;
  }
  if (feedback.adjustments?.shorterDuration) {
    paymentAmount = Math.round(paymentAmount * 1.25);
  }

  // Normalize to selected frequency
  if (frequency === 'WEEKLY') {
    paymentAmount = Math.round(paymentAmount / 4.33);
  } else if (frequency === 'BIWEEKLY') {
    paymentAmount = Math.round(paymentAmount / 2.17);
  }

  // Ensure minimums
  paymentAmount = Math.max(25, paymentAmount);
  downPayment = Math.max(0, downPayment);

  // Calculate metrics
  const monthlyEquivalent =
    frequency === 'WEEKLY'
      ? paymentAmount * 4.33
      : frequency === 'BIWEEKLY'
        ? paymentAmount * 2.17
        : paymentAmount;

  const remaining = originalInput.totalDebt - downPayment;
  const estimatedPayments = Math.ceil(remaining / paymentAmount);
  const frequencyDays = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30;
  const estimatedDurationMonths = Math.ceil((estimatedPayments * frequencyDays) / 30);

  const paymentToIncomeRatio = Math.round((monthlyEquivalent / originalInput.monthlyIncome) * 1000) / 10;
  const disposableUsedPercent = disposable > 0
    ? Math.round((monthlyEquivalent / disposable) * 1000) / 10
    : 100;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (disposableUsedPercent > 70 || paymentToIncomeRatio > 20) {
    riskLevel = 'high';
  } else if (disposableUsedPercent > 50 || paymentToIncomeRatio > 15) {
    riskLevel = 'medium';
  }

  return {
    name: 'Customized',
    downPayment,
    downPaymentPercent: Math.round((downPayment / originalInput.totalDebt) * 100),
    paymentAmount,
    frequency,
    estimatedPayments,
    estimatedDurationMonths,
    paymentToIncomeRatio,
    disposableUsedPercent,
    riskLevel,
    pros: ['Tailored to your preferences', 'Adjusted based on feedback'],
    cons: riskLevel === 'high'
      ? ['Higher risk profile', 'May be challenging to maintain']
      : ['May differ from optimal recommendations'],
    bestFor: 'Your specific situation and preferences',
  };
}

/**
 * Compare two plan options
 */
export function comparePlans(
  plan1: PlanRecommendation,
  plan2: PlanRecommendation
): {
  comparison: string;
  recommendation: string;
  factors: Array<{ factor: string; plan1Value: string; plan2Value: string; winner: string }>;
} {
  const factors: Array<{ factor: string; plan1Value: string; plan2Value: string; winner: string }> = [];

  // Duration comparison
  factors.push({
    factor: 'Duration',
    plan1Value: `${plan1.estimatedDurationMonths} months`,
    plan2Value: `${plan2.estimatedDurationMonths} months`,
    winner: plan1.estimatedDurationMonths < plan2.estimatedDurationMonths ? plan1.name : plan2.name,
  });

  // Monthly burden comparison
  factors.push({
    factor: 'Monthly Burden',
    plan1Value: `${plan1.paymentToIncomeRatio}% of income`,
    plan2Value: `${plan2.paymentToIncomeRatio}% of income`,
    winner: plan1.paymentToIncomeRatio < plan2.paymentToIncomeRatio ? plan1.name : plan2.name,
  });

  // Risk comparison
  const riskOrder = { low: 1, medium: 2, high: 3 };
  factors.push({
    factor: 'Risk Level',
    plan1Value: plan1.riskLevel,
    plan2Value: plan2.riskLevel,
    winner: riskOrder[plan1.riskLevel] < riskOrder[plan2.riskLevel] ? plan1.name : plan2.name,
  });

  // Down payment comparison
  factors.push({
    factor: 'Down Payment',
    plan1Value: `$${plan1.downPayment}`,
    plan2Value: `$${plan2.downPayment}`,
    winner: plan1.downPayment < plan2.downPayment ? plan1.name : plan2.name,
  });

  // Determine overall recommendation
  const plan1Wins = factors.filter((f) => f.winner === plan1.name).length;
  const plan2Wins = factors.filter((f) => f.winner === plan2.name).length;

  const recommendation =
    plan1Wins > plan2Wins
      ? `${plan1.name} is better in most categories`
      : plan2Wins > plan1Wins
        ? `${plan2.name} is better in most categories`
        : 'Both plans are comparable - choose based on your priorities';

  const comparison = `${plan1.name} offers ${plan1.estimatedDurationMonths}-month payoff with ${plan1.riskLevel} risk. ${plan2.name} offers ${plan2.estimatedDurationMonths}-month payoff with ${plan2.riskLevel} risk.`;

  return { comparison, recommendation, factors };
}
