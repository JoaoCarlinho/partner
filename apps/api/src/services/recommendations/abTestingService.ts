/**
 * A/B Testing Service
 * Manages experiments and variant assignments for recommendations
 */

/**
 * A/B Test definition
 */
export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: string[];
  trafficSplit: number[]; // Must sum to 1
  metrics: string[];
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
}

/**
 * A/B Test assignment
 */
export interface ABTestAssignment {
  id: string;
  testId: string;
  profileId: string;
  variant: string;
  assignedAt: Date;
}

/**
 * A/B Test result
 */
export interface ABTestResult {
  id: string;
  testId: string;
  profileId: string;
  variant: string;
  metricName: string;
  metricValue: number;
  recordedAt: Date;
}

/**
 * Aggregated test results
 */
export interface AggregatedTestResults {
  testId: string;
  testName: string;
  status: string;
  variants: Array<{
    name: string;
    sampleSize: number;
    metrics: Record<string, {
      mean: number;
      stdDev: number;
      min: number;
      max: number;
    }>;
  }>;
  winner?: string;
  significance: number;
  lastUpdated: Date;
}

/**
 * In-memory stores (production would use database)
 */
const testsStore = new Map<string, ABTest>();
const assignmentsStore = new Map<string, ABTestAssignment>();
const resultsStore: ABTestResult[] = [];

/**
 * Generate unique ID
 */
function generateId(): string {
  return `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simple hash function for consistent variant assignment
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Create a new A/B test
 */
export async function createTest(
  name: string,
  description: string,
  variants: string[],
  trafficSplit: number[],
  metrics: string[]
): Promise<ABTest> {
  // Validate traffic split
  const total = trafficSplit.reduce((sum, s) => sum + s, 0);
  if (Math.abs(total - 1) > 0.001) {
    throw new Error('Traffic split must sum to 1');
  }
  if (variants.length !== trafficSplit.length) {
    throw new Error('Variants and traffic split must have same length');
  }

  const test: ABTest = {
    id: generateId(),
    name,
    description,
    variants,
    trafficSplit,
    metrics,
    startDate: new Date(),
    status: 'active',
    createdAt: new Date(),
  };

  testsStore.set(test.id, test);
  return test;
}

/**
 * Get active tests
 */
export async function getActiveTests(): Promise<ABTest[]> {
  const tests: ABTest[] = [];
  for (const test of testsStore.values()) {
    if (test.status === 'active') {
      tests.push(test);
    }
  }
  return tests;
}

/**
 * Get test by ID
 */
export async function getTest(testId: string): Promise<ABTest | null> {
  return testsStore.get(testId) || null;
}

/**
 * Get test by name
 */
export async function getTestByName(name: string): Promise<ABTest | null> {
  for (const test of testsStore.values()) {
    if (test.name === name) {
      return test;
    }
  }
  return null;
}

/**
 * Assign variant to a profile for a test
 * Uses consistent hashing for deterministic assignment
 */
export async function assignVariant(
  testId: string,
  profileId: string
): Promise<string | null> {
  const test = testsStore.get(testId);
  if (!test || test.status !== 'active') {
    return null;
  }

  // Check for existing assignment
  const assignmentKey = `${testId}:${profileId}`;
  const existing = assignmentsStore.get(assignmentKey);
  if (existing) {
    return existing.variant;
  }

  // Generate consistent assignment using hash
  const hash = hashCode(assignmentKey);
  const normalized = Math.abs(hash) / 2147483647; // Normalize to [0, 1]

  // Find variant based on traffic split
  let cumulative = 0;
  let selectedVariant = test.variants[test.variants.length - 1];
  for (let i = 0; i < test.variants.length; i++) {
    cumulative += test.trafficSplit[i];
    if (normalized < cumulative) {
      selectedVariant = test.variants[i];
      break;
    }
  }

  // Store assignment
  const assignment: ABTestAssignment = {
    id: generateId(),
    testId,
    profileId,
    variant: selectedVariant,
    assignedAt: new Date(),
  };
  assignmentsStore.set(assignmentKey, assignment);

  return selectedVariant;
}

/**
 * Get assignment for a profile in a test
 */
export async function getAssignment(
  testId: string,
  profileId: string
): Promise<ABTestAssignment | null> {
  const key = `${testId}:${profileId}`;
  return assignmentsStore.get(key) || null;
}

/**
 * Record a metric result for an A/B test
 */
export async function recordResult(
  testId: string,
  profileId: string,
  metricName: string,
  metricValue: number
): Promise<ABTestResult | null> {
  const assignment = await getAssignment(testId, profileId);
  if (!assignment) {
    return null;
  }

  const result: ABTestResult = {
    id: generateId(),
    testId,
    profileId,
    variant: assignment.variant,
    metricName,
    metricValue,
    recordedAt: new Date(),
  };

  resultsStore.push(result);
  return result;
}

/**
 * Calculate mean
 */
function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
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
 * Calculate z-score for significance testing
 */
function calculateSignificance(
  mean1: number,
  std1: number,
  n1: number,
  mean2: number,
  std2: number,
  n2: number
): number {
  if (n1 < 2 || n2 < 2) return 0;

  const pooledStdErr = Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2);
  if (pooledStdErr === 0) return 0;

  const zScore = Math.abs(mean1 - mean2) / pooledStdErr;

  // Convert z-score to p-value approximation
  // This is a simplified calculation
  const significance = Math.min(0.99, 1 - Math.exp(-0.5 * zScore * zScore));

  return Math.round(significance * 100) / 100;
}

/**
 * Get aggregated results for a test
 */
export async function getTestResults(testId: string): Promise<AggregatedTestResults | null> {
  const test = testsStore.get(testId);
  if (!test) return null;

  // Group results by variant
  const testResults = resultsStore.filter((r) => r.testId === testId);
  const variantResults = new Map<string, Map<string, number[]>>();

  for (const variant of test.variants) {
    variantResults.set(variant, new Map());
    for (const metric of test.metrics) {
      variantResults.get(variant)!.set(metric, []);
    }
  }

  for (const result of testResults) {
    const variantMetrics = variantResults.get(result.variant);
    if (variantMetrics) {
      const metricValues = variantMetrics.get(result.metricName);
      if (metricValues) {
        metricValues.push(result.metricValue);
      }
    }
  }

  // Calculate aggregates
  const variants: AggregatedTestResults['variants'] = [];
  for (const [variant, metricsMap] of variantResults) {
    const metrics: Record<string, { mean: number; stdDev: number; min: number; max: number }> = {};
    let sampleSize = 0;

    for (const [metricName, values] of metricsMap) {
      if (values.length > 0) {
        sampleSize = Math.max(sampleSize, values.length);
        metrics[metricName] = {
          mean: mean(values),
          stdDev: stdDev(values),
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    }

    variants.push({ name: variant, sampleSize, metrics });
  }

  // Determine winner (simplified - just compare first metric)
  let winner: string | undefined;
  let significance = 0;

  if (variants.length >= 2 && test.metrics.length > 0) {
    const primaryMetric = test.metrics[0];
    const v1 = variants[0];
    const v2 = variants[1];

    if (v1.metrics[primaryMetric] && v2.metrics[primaryMetric]) {
      significance = calculateSignificance(
        v1.metrics[primaryMetric].mean,
        v1.metrics[primaryMetric].stdDev,
        v1.sampleSize,
        v2.metrics[primaryMetric].mean,
        v2.metrics[primaryMetric].stdDev,
        v2.sampleSize
      );

      if (significance >= 0.95) {
        winner =
          v1.metrics[primaryMetric].mean > v2.metrics[primaryMetric].mean
            ? v1.name
            : v2.name;
      }
    }
  }

  return {
    testId,
    testName: test.name,
    status: test.status,
    variants,
    winner,
    significance,
    lastUpdated: new Date(),
  };
}

/**
 * Complete a test
 */
export async function completeTest(testId: string): Promise<ABTest | null> {
  const test = testsStore.get(testId);
  if (!test) return null;

  test.status = 'completed';
  test.endDate = new Date();
  testsStore.set(testId, test);

  return test;
}

/**
 * Pause a test
 */
export async function pauseTest(testId: string): Promise<ABTest | null> {
  const test = testsStore.get(testId);
  if (!test) return null;

  test.status = 'paused';
  testsStore.set(testId, test);

  return test;
}

/**
 * Get all tests with their results
 */
export async function getAllTestsWithResults(): Promise<AggregatedTestResults[]> {
  const results: AggregatedTestResults[] = [];
  for (const test of testsStore.values()) {
    const testResults = await getTestResults(test.id);
    if (testResults) {
      results.push(testResults);
    }
  }
  return results;
}

/**
 * Initialize default recommendation A/B tests
 */
export async function initializeDefaultTests(): Promise<void> {
  // Test 1: Plan recommendation style
  await createTest(
    'plan_recommendation_style',
    'Test whether showing 3 vs 4 plan options improves acceptance',
    ['three_options', 'four_options'],
    [0.5, 0.5],
    ['acceptance_rate', 'completion_rate', 'time_to_decision']
  );

  // Test 2: Explanation verbosity
  await createTest(
    'explanation_verbosity',
    'Test concise vs detailed explanations',
    ['concise', 'detailed'],
    [0.5, 0.5],
    ['acceptance_rate', 'user_engagement', 'time_on_page']
  );
}

export default {
  createTest,
  getActiveTests,
  getTest,
  getTestByName,
  assignVariant,
  getAssignment,
  recordResult,
  getTestResults,
  completeTest,
  pauseTest,
  getAllTestsWithResults,
  initializeDefaultTests,
};
