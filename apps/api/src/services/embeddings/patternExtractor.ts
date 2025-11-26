/**
 * Pattern Extractor Service
 * Extracts common patterns from similar profiles for recommendations
 */

/**
 * Profile metadata for pattern analysis
 */
export interface ProfileMetadata {
  debtRange: string;
  incomeRange: string;
  outcome?: string;
  resolutionDays?: number;
  planType?: string;
  completionRate?: number;
  stressLevel: number;
  cooperationLevel: number;
  frequency?: string;
  engagementLevel?: number;
  communicationFrequency?: string;
}

/**
 * Extracted pattern with statistics
 */
export interface ExtractedPattern<T> {
  value: T;
  frequency: number; // 0-1, percentage of profiles with this value
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Numerical pattern with statistics
 */
export interface NumericalPattern {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  quartiles: [number, number, number]; // Q1, Q2, Q3
}

/**
 * Comprehensive pattern analysis result
 */
export interface PatternAnalysis {
  sampleSize: number;
  overallConfidence: 'high' | 'medium' | 'low';

  // Categorical patterns
  planTypePattern: ExtractedPattern<string> | null;
  frequencyPattern: ExtractedPattern<string> | null;
  debtRangePattern: ExtractedPattern<string> | null;
  incomeRangePattern: ExtractedPattern<string> | null;

  // Numerical patterns
  resolutionTimePattern: NumericalPattern | null;
  completionRatePattern: NumericalPattern | null;
  cooperationPattern: NumericalPattern | null;
  stressPattern: NumericalPattern | null;

  // Correlations and insights
  correlations: PatternCorrelation[];
  successFactors: SuccessFactor[];
  recommendations: string[];
}

/**
 * Correlation between factors
 */
export interface PatternCorrelation {
  factor1: string;
  factor2: string;
  correlation: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative';
  description: string;
}

/**
 * Success factor analysis
 */
export interface SuccessFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

/**
 * Calculate mean
 */
function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculate median
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function stdDev(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = mean(numbers);
  const squareDiffs = numbers.map((n) => Math.pow(n - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate quartiles
 */
function quartiles(numbers: number[]): [number, number, number] {
  if (numbers.length === 0) return [0, 0, 0];
  const sorted = [...numbers].sort((a, b) => a - b);
  const q2 = median(sorted);

  const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const upperHalf = sorted.slice(Math.ceil(sorted.length / 2));

  return [median(lowerHalf), q2, median(upperHalf)];
}

/**
 * Find mode (most common value)
 */
function findMode<T>(values: T[]): ExtractedPattern<T> | null {
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

  const frequency = maxCount / values.length;

  return {
    value: modeValue,
    frequency,
    confidence: frequency >= 0.7 ? 'high' : frequency >= 0.4 ? 'medium' : 'low',
  };
}

/**
 * Extract numerical pattern from values
 */
function extractNumericalPattern(values: number[]): NumericalPattern | null {
  if (values.length === 0) return null;

  return {
    mean: mean(values),
    median: median(values),
    stdDev: stdDev(values),
    min: Math.min(...values),
    max: Math.max(...values),
    quartiles: quartiles(values),
  };
}

/**
 * Analyze correlation between cooperation and success
 */
function analyzeCooperationCorrelation(profiles: ProfileMetadata[]): PatternCorrelation | null {
  const successful = profiles.filter((p) => p.outcome === 'resolved');
  if (successful.length < 3) return null;

  const avgCooperation = mean(successful.map((p) => p.cooperationLevel));

  let correlation: PatternCorrelation['correlation'];
  let description: string;

  if (avgCooperation >= 0.8) {
    correlation = 'strong_positive';
    description = 'High cooperation strongly correlates with successful resolution';
  } else if (avgCooperation >= 0.6) {
    correlation = 'moderate_positive';
    description = 'Good cooperation moderately correlates with success';
  } else {
    correlation = 'weak';
    description = 'Cooperation shows weak correlation with outcomes';
  }

  return {
    factor1: 'cooperation',
    factor2: 'resolution_success',
    correlation,
    description,
  };
}

/**
 * Analyze stress level correlation
 */
function analyzeStressCorrelation(profiles: ProfileMetadata[]): PatternCorrelation | null {
  const successful = profiles.filter((p) => p.outcome === 'resolved');
  if (successful.length < 3) return null;

  const avgStress = mean(successful.map((p) => p.stressLevel));

  let correlation: PatternCorrelation['correlation'];
  let description: string;

  if (avgStress <= 2) {
    correlation = 'moderate_negative';
    description = 'Lower stress levels correlate with better outcomes';
  } else if (avgStress <= 3) {
    correlation = 'weak';
    description = 'Stress shows weak correlation with outcomes';
  } else {
    correlation = 'moderate_positive';
    description = 'Higher stress may indicate complex situations requiring attention';
  }

  return {
    factor1: 'stress_level',
    factor2: 'resolution_success',
    correlation,
    description,
  };
}

/**
 * Identify success factors from patterns
 */
function identifySuccessFactors(profiles: ProfileMetadata[]): SuccessFactor[] {
  const factors: SuccessFactor[] = [];
  const successful = profiles.filter((p) => p.outcome === 'resolved');

  if (successful.length === 0) return factors;

  // Cooperation factor
  const avgCooperation = mean(successful.map((p) => p.cooperationLevel));
  if (avgCooperation >= 0.7) {
    factors.push({
      factor: 'Debtor Cooperation',
      impact: 'high',
      description: `${Math.round(avgCooperation * 100)}% average cooperation level in successful cases`,
      recommendation: 'Prioritize building rapport and maintaining positive communication',
    });
  }

  // Plan type factor
  const planTypes = successful.map((p) => p.planType).filter((p): p is string => p !== undefined);
  const commonPlan = findMode(planTypes);
  if (commonPlan && commonPlan.frequency >= 0.5) {
    factors.push({
      factor: 'Payment Plan Type',
      impact: 'medium',
      description: `${commonPlan.value} plans used in ${Math.round(commonPlan.frequency * 100)}% of successful resolutions`,
      recommendation: `Consider offering ${commonPlan.value} plan as primary option`,
    });
  }

  // Resolution time factor
  const resolutionTimes = successful
    .map((p) => p.resolutionDays)
    .filter((d): d is number => d !== undefined);
  if (resolutionTimes.length > 0) {
    const avgTime = mean(resolutionTimes);
    factors.push({
      factor: 'Resolution Timeline',
      impact: avgTime <= 60 ? 'high' : 'medium',
      description: `Average resolution in ${Math.round(avgTime)} days`,
      recommendation:
        avgTime <= 60
          ? 'Quick engagement leads to faster resolution'
          : 'Allow adequate time for debtor financial recovery',
    });
  }

  return factors;
}

/**
 * Generate recommendations from patterns
 */
function generateRecommendations(
  patterns: Partial<PatternAnalysis>,
  profiles: ProfileMetadata[]
): string[] {
  const recommendations: string[] = [];
  const successful = profiles.filter((p) => p.outcome === 'resolved');

  if (successful.length === 0) {
    return ['Insufficient data to generate recommendations'];
  }

  // Plan type recommendation
  if (patterns.planTypePattern && patterns.planTypePattern.frequency >= 0.4) {
    recommendations.push(
      `Consider ${patterns.planTypePattern.value} payment plan - used in ${Math.round(patterns.planTypePattern.frequency * 100)}% of similar successful cases`
    );
  }

  // Frequency recommendation
  if (patterns.frequencyPattern && patterns.frequencyPattern.frequency >= 0.4) {
    recommendations.push(
      `${patterns.frequencyPattern.value} payment frequency shows best results for similar profiles`
    );
  }

  // Resolution time recommendation
  if (patterns.resolutionTimePattern) {
    const avgDays = Math.round(patterns.resolutionTimePattern.mean);
    recommendations.push(
      `Target resolution within ${avgDays} days based on similar successful cases`
    );
  }

  // Engagement recommendation
  const avgCooperation = mean(successful.map((p) => p.cooperationLevel));
  if (avgCooperation >= 0.6) {
    recommendations.push(
      'Maintain consistent, empathetic communication to build cooperation'
    );
  }

  // Completion rate insight
  if (patterns.completionRatePattern) {
    const avgCompletion = Math.round(patterns.completionRatePattern.mean * 100);
    recommendations.push(
      `Similar profiles achieve ${avgCompletion}% plan completion on average`
    );
  }

  return recommendations;
}

/**
 * Extract comprehensive patterns from profile matches
 */
export function extractPatterns(profiles: ProfileMetadata[]): PatternAnalysis {
  if (profiles.length === 0) {
    return {
      sampleSize: 0,
      overallConfidence: 'low',
      planTypePattern: null,
      frequencyPattern: null,
      debtRangePattern: null,
      incomeRangePattern: null,
      resolutionTimePattern: null,
      completionRatePattern: null,
      cooperationPattern: null,
      stressPattern: null,
      correlations: [],
      successFactors: [],
      recommendations: ['No similar profiles found to analyze'],
    };
  }

  // Extract categorical patterns
  const planTypes = profiles.map((p) => p.planType).filter((p): p is string => p !== undefined);
  const frequencies = profiles.map((p) => p.frequency).filter((f): f is string => f !== undefined);
  const debtRanges = profiles.map((p) => p.debtRange);
  const incomeRanges = profiles.map((p) => p.incomeRange);

  // Extract numerical patterns
  const resolutionTimes = profiles
    .map((p) => p.resolutionDays)
    .filter((d): d is number => d !== undefined);
  const completionRates = profiles
    .map((p) => p.completionRate)
    .filter((r): r is number => r !== undefined);
  const cooperationLevels = profiles.map((p) => p.cooperationLevel);
  const stressLevels = profiles.map((p) => p.stressLevel);

  const patterns: Partial<PatternAnalysis> = {
    sampleSize: profiles.length,
    planTypePattern: findMode(planTypes),
    frequencyPattern: findMode(frequencies),
    debtRangePattern: findMode(debtRanges),
    incomeRangePattern: findMode(incomeRanges),
    resolutionTimePattern: extractNumericalPattern(resolutionTimes),
    completionRatePattern: extractNumericalPattern(completionRates),
    cooperationPattern: extractNumericalPattern(cooperationLevels),
    stressPattern: extractNumericalPattern(stressLevels),
  };

  // Analyze correlations
  const correlations: PatternCorrelation[] = [];
  const cooperationCorr = analyzeCooperationCorrelation(profiles);
  if (cooperationCorr) correlations.push(cooperationCorr);
  const stressCorr = analyzeStressCorrelation(profiles);
  if (stressCorr) correlations.push(stressCorr);

  // Identify success factors
  const successFactors = identifySuccessFactors(profiles);

  // Generate recommendations
  const recommendations = generateRecommendations(patterns, profiles);

  // Determine overall confidence
  let overallConfidence: PatternAnalysis['overallConfidence'];
  if (profiles.length >= 10) {
    overallConfidence = 'high';
  } else if (profiles.length >= 5) {
    overallConfidence = 'medium';
  } else {
    overallConfidence = 'low';
  }

  return {
    sampleSize: profiles.length,
    overallConfidence,
    planTypePattern: patterns.planTypePattern || null,
    frequencyPattern: patterns.frequencyPattern || null,
    debtRangePattern: patterns.debtRangePattern || null,
    incomeRangePattern: patterns.incomeRangePattern || null,
    resolutionTimePattern: patterns.resolutionTimePattern || null,
    completionRatePattern: patterns.completionRatePattern || null,
    cooperationPattern: patterns.cooperationPattern || null,
    stressPattern: patterns.stressPattern || null,
    correlations,
    successFactors,
    recommendations,
  };
}

/**
 * Quick pattern summary for API response
 */
export function getQuickSummary(analysis: PatternAnalysis): {
  topInsights: string[];
  recommendedPlan: string | null;
  expectedResolutionDays: number | null;
  confidenceLevel: string;
} {
  return {
    topInsights: analysis.recommendations.slice(0, 3),
    recommendedPlan: analysis.planTypePattern?.value || null,
    expectedResolutionDays: analysis.resolutionTimePattern
      ? Math.round(analysis.resolutionTimePattern.mean)
      : null,
    confidenceLevel: analysis.overallConfidence,
  };
}

export default {
  extractPatterns,
  getQuickSummary,
};
