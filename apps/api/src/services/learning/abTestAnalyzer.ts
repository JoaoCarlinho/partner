/**
 * A/B Test Analyzer Service
 * Analyzes completed A/B tests and integrates winning variants
 */

// In-memory stores (use database in production)
const testAnalysisStore = new Map<string, ABTestAnalysis>();
const configStore = new Map<string, SystemConfig>();

export interface ABTestVariantMetrics {
  name: string;
  sampleSize: number;
  conversionRate: number;
  avgOutcomeScore: number;
  avgCollectionRate: number;
  successCount: number;
  failureCount: number;
}

export interface ABTestAnalysis {
  testId: string;
  testName: string;
  testType: string;
  variants: ABTestVariantMetrics[];
  winner: string | null;
  statisticallySignificant: boolean;
  pValue: number;
  effectSize: number;
  confidenceLevel: number;
  analyzedAt: Date;
}

export interface ABTestRecord {
  id: string;
  name: string;
  testType: string;
  config: Record<string, unknown>;
  status: 'RUNNING' | 'CONCLUDED' | 'CANCELLED';
  startedAt: Date;
  concludedAt?: Date;
  winningVariant?: string;
  finalPValue?: number;
}

export interface ABTestResultRecord {
  id: string;
  testId: string;
  variant: string;
  debtorProfileId: string;
  metricName: string;
  metricValue: number;
  planOutcome?: {
    outcomeType: string;
    collectionRate: number;
  };
  createdAt: Date;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  updatedAt: Date;
  source: string;
}

// Statistical significance threshold (95% confidence)
const SIGNIFICANCE_THRESHOLD = 0.05;
const MINIMUM_SAMPLE_SIZE = 30;

/**
 * Analyze an A/B test
 */
export async function analyzeABTest(
  test: ABTestRecord,
  results: ABTestResultRecord[]
): Promise<ABTestAnalysis> {
  // Group results by variant
  const variantGroups = groupBy(results, 'variant');

  const variants: ABTestVariantMetrics[] = Object.entries(variantGroups).map(
    ([variant, variantResults]) => {
      const withOutcome = variantResults.filter((r) => r.planOutcome);
      const successCount = withOutcome.filter(
        (r) => r.planOutcome?.outcomeType === 'COMPLETED'
      ).length;

      return {
        name: variant,
        sampleSize: variantResults.length,
        conversionRate: withOutcome.length > 0 ? successCount / withOutcome.length : 0,
        avgOutcomeScore: mean(variantResults.map((r) => r.metricValue)),
        avgCollectionRate: mean(
          withOutcome.map((r) => r.planOutcome?.collectionRate || 0)
        ),
        successCount,
        failureCount: withOutcome.length - successCount,
      };
    }
  );

  // Check minimum sample size
  const hasMinimumSamples = variants.every((v) => v.sampleSize >= MINIMUM_SAMPLE_SIZE);

  // Calculate statistical significance (chi-square test)
  let pValue = 1;
  let significant = false;
  let effectSize = 0;

  if (hasMinimumSamples && variants.length >= 2) {
    const chiSquareResult = performChiSquareTest(variants);
    pValue = chiSquareResult.pValue;
    significant = pValue < SIGNIFICANCE_THRESHOLD;
    effectSize = calculateCohensH(
      variants[0].conversionRate,
      variants[1].conversionRate
    );
  }

  // Determine winner
  let winner: string | null = null;
  if (significant && variants.length >= 2) {
    winner = variants.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    ).name;
  }

  const analysis: ABTestAnalysis = {
    testId: test.id,
    testName: test.name,
    testType: test.testType,
    variants,
    winner,
    statisticallySignificant: significant,
    pValue,
    effectSize,
    confidenceLevel: 1 - pValue,
    analyzedAt: new Date(),
  };

  testAnalysisStore.set(test.id, analysis);
  return analysis;
}

/**
 * Perform chi-square test for independence
 */
function performChiSquareTest(variants: ABTestVariantMetrics[]): {
  pValue: number;
  chiSquare: number;
} {
  // Build contingency table
  const observed: number[][] = variants.map((v) => [v.successCount, v.failureCount]);

  // Calculate totals
  const rowTotals = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = observed.reduce(
    (acc, row) => row.map((val, i) => (acc[i] || 0) + val),
    [] as number[]
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  if (grandTotal === 0) {
    return { pValue: 1, chiSquare: 0 };
  }

  // Calculate expected values and chi-square statistic
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / grandTotal;
      if (expected > 0) {
        chiSquare += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
  }

  // Degrees of freedom
  const df = (observed.length - 1) * (observed[0].length - 1);

  // Calculate p-value using chi-square distribution approximation
  const pValue = chiSquarePValue(chiSquare, df);

  return { pValue, chiSquare };
}

/**
 * Approximate chi-square p-value
 */
function chiSquarePValue(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;

  // Use Wilson-Hilferty approximation for large df
  if (df > 100) {
    const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
    const se = Math.sqrt(2 / (9 * df));
    return 1 - normalCDF(z / se);
  }

  // Simple approximation using incomplete gamma function
  return 1 - incompleteGamma(df / 2, x / 2);
}

/**
 * Incomplete gamma function (approximation)
 */
function incompleteGamma(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;

  // Series expansion for small x
  let sum = 0;
  let term = 1 / a;
  sum = term;

  for (let n = 1; n < 100; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }

  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/**
 * Log gamma function (Lanczos approximation)
 */
function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Standard normal CDF
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}

/**
 * Calculate Cohen's h (effect size for proportions)
 */
export function calculateCohensH(p1: number, p2: number): number {
  const phi1 = 2 * Math.asin(Math.sqrt(p1));
  const phi2 = 2 * Math.asin(Math.sqrt(p2));
  return Math.abs(phi1 - phi2);
}

/**
 * Get effect size interpretation
 */
export function interpretEffectSize(h: number): string {
  if (h < 0.2) return 'negligible';
  if (h < 0.5) return 'small';
  if (h < 0.8) return 'medium';
  return 'large';
}

/**
 * Integrate winning variant into system configuration
 */
export async function integrateWinningVariant(
  analysis: ABTestAnalysis,
  test: ABTestRecord
): Promise<{
  applied: boolean;
  message: string;
  configUpdates?: Record<string, unknown>;
}> {
  if (!analysis.winner || !analysis.statisticallySignificant) {
    return {
      applied: false,
      message: 'No statistically significant winner to apply',
    };
  }

  const configUpdates: Record<string, unknown> = {};

  // Apply configuration based on test type
  switch (test.testType) {
    case 'RECOMMENDATION_WEIGHTS':
      configUpdates['recommendation.weights'] = test.config[analysis.winner];
      await updateSystemConfig('recommendation.weights', test.config[analysis.winner], test.id);
      break;

    case 'SIMILARITY_THRESHOLD':
      const thresholdValue = test.config[analysis.winner] as number;
      configUpdates['similarity.threshold'] = thresholdValue;
      await updateSystemConfig('similarity.threshold', thresholdValue, test.id);
      break;

    case 'PLAN_DEFAULTS':
      configUpdates['plan.defaults'] = test.config[analysis.winner];
      await updateSystemConfig('plan.defaults', test.config[analysis.winner], test.id);
      break;

    case 'COMMUNICATION_FREQUENCY':
      configUpdates['communication.frequency'] = test.config[analysis.winner];
      await updateSystemConfig('communication.frequency', test.config[analysis.winner], test.id);
      break;

    default:
      return {
        applied: false,
        message: `Unknown test type: ${test.testType}`,
      };
  }

  return {
    applied: true,
    message: `Applied winning variant "${analysis.winner}" with ${(
      analysis.confidenceLevel * 100
    ).toFixed(1)}% confidence`,
    configUpdates,
  };
}

/**
 * Update system configuration
 */
async function updateSystemConfig(
  key: string,
  value: unknown,
  source: string
): Promise<void> {
  configStore.set(key, {
    key,
    value,
    updatedAt: new Date(),
    source: `ab_test:${source}`,
  });
}

/**
 * Get system configuration
 */
export async function getSystemConfig(key: string): Promise<SystemConfig | null> {
  return configStore.get(key) || null;
}

/**
 * Get all system configurations
 */
export async function getAllSystemConfigs(): Promise<SystemConfig[]> {
  return Array.from(configStore.values());
}

/**
 * Get analysis for a test
 */
export async function getTestAnalysis(testId: string): Promise<ABTestAnalysis | null> {
  return testAnalysisStore.get(testId) || null;
}

/**
 * Get all test analyses
 */
export async function getAllTestAnalyses(): Promise<ABTestAnalysis[]> {
  return Array.from(testAnalysisStore.values()).sort(
    (a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime()
  );
}

/**
 * Calculate required sample size for desired power
 */
export function calculateRequiredSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  power: number = 0.8,
  significance: number = 0.05
): number {
  // Using formula for two-proportion z-test
  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pBar = (p1 + p2) / 2;

  const zAlpha = 1.96; // For 95% confidence
  const zBeta = 0.84; // For 80% power

  const numerator = Math.pow(
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
    2
  );
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
}

/**
 * Generate test summary report
 */
export function generateTestSummary(analysis: ABTestAnalysis): string {
  const lines = [
    `A/B Test Analysis: ${analysis.testName}`,
    `Test Type: ${analysis.testType}`,
    '',
    'Variant Results:',
    ...analysis.variants.map(
      (v) =>
        `  ${v.name}: n=${v.sampleSize}, conversion=${(v.conversionRate * 100).toFixed(1)}%, ` +
        `avg_score=${v.avgOutcomeScore.toFixed(3)}`
    ),
    '',
    `Statistical Significance: ${analysis.statisticallySignificant ? 'YES' : 'NO'}`,
    `P-Value: ${analysis.pValue.toFixed(4)}`,
    `Effect Size (Cohen's h): ${analysis.effectSize.toFixed(3)} (${interpretEffectSize(
      analysis.effectSize
    )})`,
    `Confidence Level: ${(analysis.confidenceLevel * 100).toFixed(1)}%`,
    '',
    analysis.winner
      ? `Winner: ${analysis.winner}`
      : 'No statistically significant winner determined',
  ];

  return lines.join('\n');
}

// Utility functions
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
