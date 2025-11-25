/**
 * Recommendation Engine
 * Generates actionable recommendations based on similar profile patterns
 */

/**
 * Recommendation types
 */
export type RecommendationType = 'plan' | 'communication' | 'timing' | 'escalation';

/**
 * Plan recommendation
 */
export interface PlanRecommendation {
  planType: 'conservative' | 'moderate' | 'aggressive';
  suggestedDownPayment: number; // Percentage of total
  suggestedDuration: number; // Months
  suggestedFrequency: 'weekly' | 'biweekly' | 'monthly';
  monthlyPaymentRange: { min: number; max: number };
}

/**
 * Communication recommendation
 */
export interface CommunicationRecommendation {
  suggestedTone: 'warm' | 'professional' | 'formal';
  responseTimeTarget: string; // e.g., "within 4 hours"
  messageFrequency: string; // e.g., "2-3 times per week"
  keyApproaches: string[];
  phrasesToUse: string[];
  phrasesToAvoid: string[];
}

/**
 * Timing recommendation
 */
export interface TimingRecommendation {
  bestContactDays: string[];
  bestContactHours: string;
  followUpInterval: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  expectedResolutionDays: number;
}

/**
 * Escalation recommendation
 */
export interface EscalationRecommendation {
  shouldEscalate: boolean;
  escalationType?: 'supervisor' | 'legal' | 'defender';
  reason?: string;
  timing?: string;
  alternatives?: string[];
}

/**
 * Success factor in prediction
 */
export interface SuccessFactor {
  name: string;
  impact: number; // Positive or negative adjustment
  description: string;
}

/**
 * Success prediction
 */
export interface SuccessPrediction {
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceInterval: [number, number];
  factors: SuccessFactor[];
}

/**
 * Full recommendation with metadata
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  recommendation: PlanRecommendation | CommunicationRecommendation | TimingRecommendation | EscalationRecommendation;
  successPrediction: SuccessPrediction;
  explanation: string;
  similarProfilesUsed: number;
  avgSimilarityScore: number;
  abTestVariant?: string;
  createdAt: Date;
}

/**
 * Recommendation set response
 */
export interface RecommendationSet {
  recommendations: Recommendation[];
  context: {
    similarProfilesAnalyzed: number;
    patternConfidence: 'high' | 'medium' | 'low';
    generatedAt: string;
  };
}

/**
 * Profile context for generating recommendations
 */
export interface ProfileContext {
  profileId: string;
  debtAmount: number;
  debtRange: string;
  incomeRange: string;
  expenseRatio: number;
  cooperationLevel: number;
  stressLevel: number;
  engagementLevel: number;
  debtAgeMonths: number;
  hasEmployment: boolean;
}

/**
 * Similar profile summary
 */
export interface SimilarProfileSummary {
  similarity: number;
  outcome?: string;
  planType?: string;
  frequency?: string;
  resolutionDays?: number;
  completionRate?: number;
  cooperationLevel: number;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate mean
 */
function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Find mode (most common value)
 */
function findMode<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let maxCount = 0;
  let modeValue = values[0];
  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      modeValue = value;
    }
  }
  return modeValue;
}

/**
 * Generate plan recommendations from patterns
 */
function generatePlanRecommendation(
  context: ProfileContext,
  similarProfiles: SimilarProfileSummary[]
): PlanRecommendation {
  const successful = similarProfiles.filter((p) => p.outcome === 'resolved');

  // Find most common successful plan type
  const planTypes = successful.map((p) => p.planType).filter((p): p is string => !!p);
  const commonPlanType = findMode(planTypes) || 'moderate';

  // Find most common frequency
  const frequencies = successful.map((p) => p.frequency).filter((f): f is string => !!f);
  const commonFrequency = (findMode(frequencies) || 'monthly') as 'weekly' | 'biweekly' | 'monthly';

  // Calculate suggested down payment based on income range
  let suggestedDownPayment = 0.1; // 10% default
  if (context.incomeRange === 'low') {
    suggestedDownPayment = 0.05;
  } else if (context.incomeRange === 'high' || context.incomeRange === 'very_high') {
    suggestedDownPayment = 0.15;
  }

  // Calculate suggested duration based on debt amount
  let suggestedDuration = 12;
  if (context.debtRange === '0-1000') {
    suggestedDuration = 6;
  } else if (context.debtRange === '1000-5000') {
    suggestedDuration = 9;
  } else if (context.debtRange === '25000-50000' || context.debtRange === '50000+') {
    suggestedDuration = 24;
  }

  // Calculate payment range
  const afterDownPayment = context.debtAmount * (1 - suggestedDownPayment);
  const paymentsPerYear = commonFrequency === 'weekly' ? 52 : commonFrequency === 'biweekly' ? 26 : 12;
  const totalPayments = Math.ceil((suggestedDuration / 12) * paymentsPerYear);
  const basePayment = afterDownPayment / totalPayments;

  return {
    planType: commonPlanType as 'conservative' | 'moderate' | 'aggressive',
    suggestedDownPayment,
    suggestedDuration,
    suggestedFrequency: commonFrequency,
    monthlyPaymentRange: {
      min: Math.round(basePayment * 0.9),
      max: Math.round(basePayment * 1.1),
    },
  };
}

/**
 * Generate communication recommendations
 */
function generateCommunicationRecommendation(
  context: ProfileContext,
  similarProfiles: SimilarProfileSummary[]
): CommunicationRecommendation {
  // Determine tone based on stress and cooperation
  let suggestedTone: 'warm' | 'professional' | 'formal' = 'professional';
  if (context.stressLevel >= 4) {
    suggestedTone = 'warm';
  } else if (context.cooperationLevel < 0.3) {
    suggestedTone = 'formal';
  }

  // Determine response time target
  let responseTimeTarget = 'within 24 hours';
  if (context.engagementLevel >= 0.7) {
    responseTimeTarget = 'within 4 hours';
  } else if (context.engagementLevel < 0.3) {
    responseTimeTarget = 'within 48 hours';
  }

  return {
    suggestedTone,
    responseTimeTarget,
    messageFrequency: context.cooperationLevel >= 0.6 ? '2-3 times per week' : 'once per week',
    keyApproaches: [
      'Acknowledge their situation empathetically',
      'Focus on solutions rather than problems',
      'Provide clear, actionable next steps',
      'Maintain consistent communication schedule',
    ],
    phrasesToUse: [
      'I understand this may be challenging',
      "Let's work together to find a solution",
      'Here are your options',
      "We're here to help",
    ],
    phrasesToAvoid: [
      'You must...',
      'Failure to comply...',
      'Immediate action required',
      'Final notice',
    ],
  };
}

/**
 * Generate timing recommendations
 */
function generateTimingRecommendation(
  context: ProfileContext,
  similarProfiles: SimilarProfileSummary[]
): TimingRecommendation {
  const successful = similarProfiles.filter((p) => p.outcome === 'resolved');

  // Calculate expected resolution time
  const resolutionTimes = successful
    .map((p) => p.resolutionDays)
    .filter((d): d is number => d !== undefined);
  const avgResolution = resolutionTimes.length > 0 ? mean(resolutionTimes) : 60;

  // Determine urgency based on debt age
  let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';
  if (context.debtAgeMonths < 3) {
    urgencyLevel = 'low';
  } else if (context.debtAgeMonths > 12) {
    urgencyLevel = 'high';
  }

  return {
    bestContactDays: ['Tuesday', 'Wednesday', 'Thursday'],
    bestContactHours: '10:00 AM - 2:00 PM',
    followUpInterval: urgencyLevel === 'high' ? '3-5 days' : '5-7 days',
    urgencyLevel,
    expectedResolutionDays: Math.round(avgResolution),
  };
}

/**
 * Generate escalation recommendation
 */
function generateEscalationRecommendation(
  context: ProfileContext,
  similarProfiles: SimilarProfileSummary[]
): EscalationRecommendation {
  // Check if escalation is warranted
  const shouldEscalate = context.cooperationLevel < 0.2 && context.debtAgeMonths > 6;

  if (!shouldEscalate) {
    return {
      shouldEscalate: false,
      alternatives: [
        'Continue standard communication approach',
        'Consider offering additional flexibility in payment terms',
        'Request supervisor review if no progress in 30 days',
      ],
    };
  }

  return {
    shouldEscalate: true,
    escalationType: context.stressLevel >= 4 ? 'defender' : 'supervisor',
    reason: 'Low cooperation combined with aged debt indicates need for additional support',
    timing: 'Within next 2 weeks if no improvement',
    alternatives: ['Offer hardship program', 'Schedule call with specialist'],
  };
}

/**
 * Calculate success probability
 */
function calculateSuccessProbability(
  context: ProfileContext,
  similarProfiles: SimilarProfileSummary[]
): SuccessPrediction {
  const successful = similarProfiles.filter((p) => p.outcome === 'resolved');

  // Base rate from similar profiles
  const baseRate = successful.length > 0
    ? mean(successful.map((p) => p.completionRate || 0.7))
    : 0.6;

  const factors: SuccessFactor[] = [];

  // Factor 1: Match quality
  const avgSimilarity = mean(similarProfiles.map((p) => p.similarity));
  const similarityAdjustment = (avgSimilarity - 0.6) * 0.2;
  factors.push({
    name: 'Profile Similarity',
    impact: similarityAdjustment,
    description: `${Math.round(avgSimilarity * 100)}% average similarity to successful profiles`,
  });

  // Factor 2: Cooperation level
  const cooperationAdjustment = (context.cooperationLevel - 0.5) * 0.15;
  factors.push({
    name: 'Cooperation Level',
    impact: cooperationAdjustment,
    description: context.cooperationLevel >= 0.5 ? 'Good cooperation increases likelihood' : 'Low cooperation presents challenge',
  });

  // Factor 3: Employment stability
  if (context.hasEmployment) {
    factors.push({
      name: 'Employment Status',
      impact: 0.08,
      description: 'Employment provides income stability',
    });
  } else {
    factors.push({
      name: 'Employment Status',
      impact: -0.1,
      description: 'No employment creates payment risk',
    });
  }

  // Factor 4: Expense ratio
  if (context.expenseRatio < 0.7) {
    factors.push({
      name: 'Financial Capacity',
      impact: 0.05,
      description: 'Room in budget for payments',
    });
  } else if (context.expenseRatio > 0.9) {
    factors.push({
      name: 'Financial Capacity',
      impact: -0.08,
      description: 'High expense ratio limits payment ability',
    });
  }

  // Calculate final probability
  const totalAdjustment = factors.reduce((sum, f) => sum + f.impact, 0);
  const probability = Math.min(0.95, Math.max(0.15, baseRate + totalAdjustment));

  // Confidence based on sample size
  const confidence: 'high' | 'medium' | 'low' =
    similarProfiles.length >= 15 ? 'high' : similarProfiles.length >= 8 ? 'medium' : 'low';

  const margin = confidence === 'high' ? 0.05 : confidence === 'medium' ? 0.1 : 0.15;

  return {
    probability: Math.round(probability * 100) / 100,
    confidence,
    confidenceInterval: [
      Math.round(Math.max(0, probability - margin) * 100) / 100,
      Math.round(Math.min(1, probability + margin) * 100) / 100,
    ],
    factors,
  };
}

/**
 * Generate explanation for a recommendation
 */
function generateExplanation(
  type: RecommendationType,
  recommendation: Recommendation['recommendation'],
  context: ProfileContext,
  similarCount: number
): string {
  const baseExplanation = `Based on analysis of ${similarCount} similar profiles`;

  switch (type) {
    case 'plan':
      const plan = recommendation as PlanRecommendation;
      return `${baseExplanation}, a ${plan.planType} payment plan with ${plan.suggestedFrequency} payments over ${plan.suggestedDuration} months has shown the best results for profiles in the ${context.debtRange} debt range.`;

    case 'communication':
      const comm = recommendation as CommunicationRecommendation;
      return `${baseExplanation}, a ${comm.suggestedTone} communication approach with ${comm.messageFrequency} contact frequency has proven effective for debtors with similar stress and engagement levels.`;

    case 'timing':
      const timing = recommendation as TimingRecommendation;
      return `${baseExplanation}, similar cases typically resolve within ${timing.expectedResolutionDays} days. ${timing.urgencyLevel === 'high' ? 'Given the age of this debt, prompt action is recommended.' : 'Steady, consistent engagement is key.'}`;

    case 'escalation':
      const escalation = recommendation as EscalationRecommendation;
      return escalation.shouldEscalate
        ? `${baseExplanation} with similar cooperation levels, escalation to ${escalation.escalationType} has helped achieve resolution.`
        : `${baseExplanation}, continued standard approach is recommended as escalation hasn't shown better outcomes for similar profiles.`;

    default:
      return baseExplanation;
  }
}

/**
 * Generate all recommendations for a profile
 */
export async function generateRecommendations(
  context: ProfileContext,
  similarProfiles: SimilarProfileSummary[]
): Promise<RecommendationSet> {
  const recommendations: Recommendation[] = [];
  const avgSimilarity = mean(similarProfiles.map((p) => p.similarity));

  // Generate plan recommendation
  const planRec = generatePlanRecommendation(context, similarProfiles);
  const planPrediction = calculateSuccessProbability(context, similarProfiles);
  recommendations.push({
    id: generateId(),
    type: 'plan',
    recommendation: planRec,
    successPrediction: planPrediction,
    explanation: generateExplanation('plan', planRec, context, similarProfiles.length),
    similarProfilesUsed: similarProfiles.length,
    avgSimilarityScore: avgSimilarity,
    createdAt: new Date(),
  });

  // Generate communication recommendation
  const commRec = generateCommunicationRecommendation(context, similarProfiles);
  recommendations.push({
    id: generateId(),
    type: 'communication',
    recommendation: commRec,
    successPrediction: planPrediction, // Same prediction basis
    explanation: generateExplanation('communication', commRec, context, similarProfiles.length),
    similarProfilesUsed: similarProfiles.length,
    avgSimilarityScore: avgSimilarity,
    createdAt: new Date(),
  });

  // Generate timing recommendation
  const timingRec = generateTimingRecommendation(context, similarProfiles);
  recommendations.push({
    id: generateId(),
    type: 'timing',
    recommendation: timingRec,
    successPrediction: planPrediction,
    explanation: generateExplanation('timing', timingRec, context, similarProfiles.length),
    similarProfilesUsed: similarProfiles.length,
    avgSimilarityScore: avgSimilarity,
    createdAt: new Date(),
  });

  // Generate escalation recommendation
  const escalationRec = generateEscalationRecommendation(context, similarProfiles);
  recommendations.push({
    id: generateId(),
    type: 'escalation',
    recommendation: escalationRec,
    successPrediction: planPrediction,
    explanation: generateExplanation('escalation', escalationRec, context, similarProfiles.length),
    similarProfilesUsed: similarProfiles.length,
    avgSimilarityScore: avgSimilarity,
    createdAt: new Date(),
  });

  return {
    recommendations,
    context: {
      similarProfilesAnalyzed: similarProfiles.length,
      patternConfidence: similarProfiles.length >= 10 ? 'high' : similarProfiles.length >= 5 ? 'medium' : 'low',
      generatedAt: new Date().toISOString(),
    },
  };
}

export default {
  generateRecommendations,
  calculateSuccessProbability,
};
