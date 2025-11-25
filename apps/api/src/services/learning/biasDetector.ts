/**
 * Bias Detection Service
 * Detects and mitigates bias in recommendations
 */

// In-memory stores (use database in production)
const biasAuditStore: BiasAuditLog[] = [];
const segmentConfigStore = new Map<string, SegmentConfig>();

export interface BiasMetrics {
  segment: string;
  sampleSize: number;
  resolutionRate: number;
  avgRecommendationScore: number;
  avgCollectionRate: number;
  zScore: number;
  hasBias: boolean;
  biasDirection: 'underperforming' | 'overperforming' | 'none';
}

export interface BiasAuditLog {
  id: string;
  segment: string;
  detectedAt: Date;
  zScore: number;
  resolutionRate: number;
  mitigationApplied: boolean;
  mitigationDetails?: MitigationDetails;
  createdAt: Date;
}

export interface MitigationDetails {
  type: 'THRESHOLD_ADJUSTMENT' | 'WEIGHT_REBALANCE' | 'SAMPLE_SIZE_INCREASE' | 'MANUAL_REVIEW';
  parameters: Record<string, unknown>;
  appliedAt: Date;
}

export interface SegmentConfig {
  segment: string;
  similarityThreshold: number;
  minSampleSize: number;
  maxWeight: number;
  updatedAt: Date;
}

export interface OutcomeRecord {
  debtorProfileId: string;
  profileSnapshot: {
    debt_range?: string;
    income_range?: string;
    engagement_level?: string;
  };
  outcomeType: string;
  collectionRate: number;
  recommendationScore?: number;
}

// Segment definitions
const SEGMENT_DEFINITIONS = [
  { name: 'debt_low', filter: { debt_range: '0-1000' } },
  { name: 'debt_medium', filter: { debt_range: '1000-5000' } },
  { name: 'debt_high', filter: { debt_range: '5000-10000' } },
  { name: 'debt_very_high', filter: { debt_range: '10000+' } },
  { name: 'income_low', filter: { income_range: 'low' } },
  { name: 'income_medium', filter: { income_range: 'medium' } },
  { name: 'income_high', filter: { income_range: 'high' } },
  { name: 'engagement_low', filter: { engagement_level: 'minimal' } },
  { name: 'engagement_high', filter: { engagement_level: 'frequent' } },
];

// Bias detection thresholds
const BIAS_THRESHOLD = 2; // Z-score threshold (95% confidence)
const SEVERE_BIAS_THRESHOLD = 3; // Z-score threshold (99.7% confidence)

// Default segment configuration
const DEFAULT_SEGMENT_CONFIG: Omit<SegmentConfig, 'segment' | 'updatedAt'> = {
  similarityThreshold: 0.75,
  minSampleSize: 10,
  maxWeight: 0.5,
};

/**
 * Detect bias across all segments
 */
export async function detectBias(outcomes: OutcomeRecord[]): Promise<BiasMetrics[]> {
  if (outcomes.length === 0) {
    return [];
  }

  // Calculate overall metrics
  const overallMetrics = calculateOverallMetrics(outcomes);
  const biasMetrics: BiasMetrics[] = [];

  for (const segment of SEGMENT_DEFINITIONS) {
    const segmentOutcomes = filterOutcomesBySegment(outcomes, segment.filter);

    if (segmentOutcomes.length < 5) {
      // Skip segments with too few samples
      continue;
    }

    const resolutionRate = calculateResolutionRate(segmentOutcomes);
    const avgRecommendationScore = mean(
      segmentOutcomes.map((o) => o.recommendationScore || 0)
    );
    const avgCollectionRate = mean(segmentOutcomes.map((o) => o.collectionRate));

    // Calculate z-score against overall population
    const zScore =
      overallMetrics.stdDev > 0
        ? (resolutionRate - overallMetrics.resolutionRate) / overallMetrics.stdDev
        : 0;

    const hasBias = Math.abs(zScore) > BIAS_THRESHOLD;
    let biasDirection: 'underperforming' | 'overperforming' | 'none' = 'none';
    if (zScore < -BIAS_THRESHOLD) biasDirection = 'underperforming';
    else if (zScore > BIAS_THRESHOLD) biasDirection = 'overperforming';

    biasMetrics.push({
      segment: segment.name,
      sampleSize: segmentOutcomes.length,
      resolutionRate,
      avgRecommendationScore,
      avgCollectionRate,
      zScore,
      hasBias,
      biasDirection,
    });
  }

  return biasMetrics;
}

/**
 * Filter outcomes by segment
 */
function filterOutcomesBySegment(
  outcomes: OutcomeRecord[],
  filter: Record<string, string>
): OutcomeRecord[] {
  return outcomes.filter((outcome) => {
    for (const [key, value] of Object.entries(filter)) {
      const snapshotValue = (outcome.profileSnapshot as Record<string, unknown>)[key];
      if (snapshotValue !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Calculate overall metrics
 */
function calculateOverallMetrics(outcomes: OutcomeRecord[]): {
  resolutionRate: number;
  stdDev: number;
} {
  const resolutionRates = outcomes.map((o) =>
    o.outcomeType === 'COMPLETED' || o.outcomeType === 'PARTIAL' ? 1 : 0
  );
  const resolutionRate = mean(resolutionRates);
  const stdDev = Math.sqrt(
    mean(resolutionRates.map((r) => Math.pow(r - resolutionRate, 2)))
  );

  return { resolutionRate, stdDev };
}

/**
 * Calculate resolution rate for a set of outcomes
 */
function calculateResolutionRate(outcomes: OutcomeRecord[]): number {
  const resolved = outcomes.filter(
    (o) => o.outcomeType === 'COMPLETED' || o.outcomeType === 'PARTIAL'
  ).length;
  return outcomes.length > 0 ? resolved / outcomes.length : 0;
}

/**
 * Mitigate detected bias
 */
export async function mitigateBias(biasedSegments: BiasMetrics[]): Promise<{
  mitigated: number;
  actions: { segment: string; action: string }[];
}> {
  const actions: { segment: string; action: string }[] = [];
  let mitigated = 0;

  for (const segment of biasedSegments) {
    if (!segment.hasBias) continue;

    const mitigation = determineMitigation(segment);

    // Apply mitigation
    await applyMitigation(segment.segment, mitigation);

    // Log audit entry
    const auditLog: BiasAuditLog = {
      id: generateId(),
      segment: segment.segment,
      detectedAt: new Date(),
      zScore: segment.zScore,
      resolutionRate: segment.resolutionRate,
      mitigationApplied: true,
      mitigationDetails: mitigation,
      createdAt: new Date(),
    };

    biasAuditStore.push(auditLog);
    actions.push({ segment: segment.segment, action: describeMitigation(mitigation) });
    mitigated++;
  }

  return { mitigated, actions };
}

/**
 * Determine appropriate mitigation for a biased segment
 */
function determineMitigation(segment: BiasMetrics): MitigationDetails {
  if (segment.biasDirection === 'underperforming') {
    if (Math.abs(segment.zScore) > SEVERE_BIAS_THRESHOLD) {
      // Severe underperformance - require manual review
      return {
        type: 'MANUAL_REVIEW',
        parameters: {
          zScore: segment.zScore,
          resolutionRate: segment.resolutionRate,
          urgency: 'high',
        },
        appliedAt: new Date(),
      };
    }
    // Moderate underperformance - increase threshold and sample size
    return {
      type: 'THRESHOLD_ADJUSTMENT',
      parameters: {
        similarityThreshold: 0.85,
        minSampleSize: 15,
      },
      appliedAt: new Date(),
    };
  } else if (segment.biasDirection === 'overperforming') {
    // Overperforming - cap influence weight
    return {
      type: 'WEIGHT_REBALANCE',
      parameters: {
        maxWeight: 0.3,
      },
      appliedAt: new Date(),
    };
  }

  // No bias - return no-op
  return {
    type: 'THRESHOLD_ADJUSTMENT',
    parameters: {},
    appliedAt: new Date(),
  };
}

/**
 * Apply mitigation to segment configuration
 */
async function applyMitigation(
  segment: string,
  mitigation: MitigationDetails
): Promise<void> {
  const currentConfig = segmentConfigStore.get(segment) || {
    segment,
    ...DEFAULT_SEGMENT_CONFIG,
    updatedAt: new Date(),
  };

  switch (mitigation.type) {
    case 'THRESHOLD_ADJUSTMENT':
      if (mitigation.parameters.similarityThreshold !== undefined) {
        currentConfig.similarityThreshold = mitigation.parameters
          .similarityThreshold as number;
      }
      if (mitigation.parameters.minSampleSize !== undefined) {
        currentConfig.minSampleSize = mitigation.parameters.minSampleSize as number;
      }
      break;

    case 'WEIGHT_REBALANCE':
      if (mitigation.parameters.maxWeight !== undefined) {
        currentConfig.maxWeight = mitigation.parameters.maxWeight as number;
      }
      break;

    case 'SAMPLE_SIZE_INCREASE':
      currentConfig.minSampleSize = Math.max(
        currentConfig.minSampleSize,
        (mitigation.parameters.minSampleSize as number) || 20
      );
      break;

    case 'MANUAL_REVIEW':
      // Flag for manual review - send alert
      await sendBiasAlert(segment, mitigation.parameters);
      break;
  }

  currentConfig.updatedAt = new Date();
  segmentConfigStore.set(segment, currentConfig);
}

/**
 * Send bias alert (mock implementation)
 */
async function sendBiasAlert(
  segment: string,
  details: Record<string, unknown>
): Promise<void> {
  console.warn(`BIAS ALERT: Segment "${segment}" requires manual review`, details);
  // In production, send to alerting system (SNS, PagerDuty, etc.)
}

/**
 * Describe mitigation action for logging
 */
function describeMitigation(mitigation: MitigationDetails): string {
  switch (mitigation.type) {
    case 'THRESHOLD_ADJUSTMENT':
      return `Adjusted thresholds: ${JSON.stringify(mitigation.parameters)}`;
    case 'WEIGHT_REBALANCE':
      return `Rebalanced weights: maxWeight=${mitigation.parameters.maxWeight}`;
    case 'SAMPLE_SIZE_INCREASE':
      return `Increased min sample size to ${mitigation.parameters.minSampleSize}`;
    case 'MANUAL_REVIEW':
      return 'Flagged for manual review';
    default:
      return 'Unknown mitigation';
  }
}

/**
 * Get segment configuration
 */
export async function getSegmentConfig(segment: string): Promise<SegmentConfig> {
  return (
    segmentConfigStore.get(segment) || {
      segment,
      ...DEFAULT_SEGMENT_CONFIG,
      updatedAt: new Date(),
    }
  );
}

/**
 * Get all segment configurations
 */
export async function getAllSegmentConfigs(): Promise<SegmentConfig[]> {
  const configs: SegmentConfig[] = [];
  for (const segment of SEGMENT_DEFINITIONS) {
    configs.push(await getSegmentConfig(segment.name));
  }
  return configs;
}

/**
 * Get bias audit history
 */
export async function getBiasAuditHistory(options?: {
  segment?: string;
  limit?: number;
  startDate?: Date;
}): Promise<BiasAuditLog[]> {
  let logs = [...biasAuditStore];

  if (options?.segment) {
    logs = logs.filter((l) => l.segment === options.segment);
  }

  if (options?.startDate) {
    logs = logs.filter((l) => l.detectedAt >= options.startDate!);
  }

  logs.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

/**
 * Generate bias report
 */
export function generateBiasReport(metrics: BiasMetrics[]): {
  summary: string;
  alerts: { segment: string; severity: 'warning' | 'critical'; message: string }[];
  recommendations: string[];
} {
  const biasedSegments = metrics.filter((m) => m.hasBias);
  const alerts: { segment: string; severity: 'warning' | 'critical'; message: string }[] = [];
  const recommendations: string[] = [];

  for (const segment of biasedSegments) {
    const severity = Math.abs(segment.zScore) > SEVERE_BIAS_THRESHOLD ? 'critical' : 'warning';
    const direction = segment.biasDirection === 'underperforming' ? 'lower' : 'higher';

    alerts.push({
      segment: segment.segment,
      severity,
      message: `${segment.segment} has ${direction} resolution rate (${(
        segment.resolutionRate * 100
      ).toFixed(1)}%) with z-score ${segment.zScore.toFixed(2)}`,
    });

    if (segment.biasDirection === 'underperforming') {
      recommendations.push(
        `Consider increasing similarity threshold for ${segment.segment} to ensure higher quality matches`
      );
    } else {
      recommendations.push(
        `Cap the influence of ${segment.segment} profiles to prevent over-reliance`
      );
    }
  }

  const summary =
    biasedSegments.length === 0
      ? 'No significant bias detected across segments'
      : `Detected bias in ${biasedSegments.length} segment(s): ${biasedSegments
          .map((s) => s.segment)
          .join(', ')}`;

  return { summary, alerts, recommendations };
}

/**
 * Calculate fairness metrics
 */
export function calculateFairnessMetrics(metrics: BiasMetrics[]): {
  overallFairness: number;
  maxDisparity: number;
  disparityRatio: number;
  segmentsAnalyzed: number;
} {
  if (metrics.length === 0) {
    return {
      overallFairness: 1,
      maxDisparity: 0,
      disparityRatio: 1,
      segmentsAnalyzed: 0,
    };
  }

  const resolutionRates = metrics.map((m) => m.resolutionRate);
  const maxRate = Math.max(...resolutionRates);
  const minRate = Math.min(...resolutionRates);

  const maxDisparity = maxRate - minRate;
  const disparityRatio = minRate > 0 ? maxRate / minRate : Infinity;

  // Fairness score (1 = perfect fairness, 0 = maximum disparity)
  const overallFairness = 1 - maxDisparity;

  return {
    overallFairness,
    maxDisparity,
    disparityRatio: Math.min(disparityRatio, 10), // Cap at 10 for display
    segmentsAnalyzed: metrics.length,
  };
}

// Utility functions
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function generateId(): string {
  return `bias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
