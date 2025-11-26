/**
 * Performance Tracker Service
 * Tracks model performance metrics over time
 */

// In-memory store for metrics (use database in production)
const metricsStore = new Map<string, ModelMetrics>();
const alertStore: PerformanceAlert[] = [];

export interface ModelMetrics {
  id: string;
  metricDate: Date;
  recommendationAccuracy: number;
  avgSimilarityScore: number;
  resolutionRate: number;
  recommendationAcceptanceRate: number;
  sampleSize: number;
  createdAt: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'MODEL_PERFORMANCE_DEGRADATION' | 'LOW_SAMPLE_SIZE' | 'HIGH_VARIANCE' | 'ANOMALY_DETECTED';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestedAction: string;
  metricDate: Date;
  acknowledged: boolean;
  createdAt: Date;
}

export interface RecommendationRecord {
  id: string;
  debtorProfileId: string;
  recommendationData: {
    successProbability: number;
    similarityScore: number;
  };
  wasAccepted: boolean;
  createdAt: Date;
}

export interface MetricsSummary {
  current: {
    accuracy: number;
    resolutionRate: number;
    acceptanceRate: number;
    date: string;
  };
  baseline: {
    accuracy: number;
    resolutionRate: number;
  };
  change: {
    accuracy: number;
    resolutionRate: number;
  };
  alerts: PerformanceAlert[];
  trend: 'improving' | 'stable' | 'declining';
}

// Default baseline metrics
const BASELINE_METRICS = {
  accuracy: 0.65,
  resolutionRate: 0.60,
};

// Thresholds for alerts
const THRESHOLDS = {
  accuracy: {
    warning: 0.55,
    critical: 0.45,
  },
  sampleSize: {
    minimum: 10,
  },
  variance: {
    maximum: 0.25,
  },
};

/**
 * Calculate daily metrics
 */
export async function calculateDailyMetrics(
  date: Date,
  recommendations: RecommendationRecord[],
  outcomes: { recommendationId: string; outcomeType: string; collectionRate: number }[]
): Promise<ModelMetrics> {
  const dateKey = formatDateKey(date);

  // Match recommendations with outcomes
  const outcomeMap = new Map(outcomes.map((o) => [o.recommendationId, o]));

  // Calculate accuracy: predicted success vs actual
  const accuracyScores: number[] = [];
  for (const rec of recommendations) {
    const outcome = outcomeMap.get(rec.id);
    if (outcome) {
      const predicted = rec.recommendationData.successProbability;
      const actual = outcome.outcomeType === 'COMPLETED' ? 1 : 0;
      accuracyScores.push(1 - Math.abs(predicted - actual));
    }
  }

  // Calculate acceptance rate
  const acceptedCount = recommendations.filter((r) => r.wasAccepted).length;

  // Calculate resolution rate
  const resolvedCount = outcomes.filter(
    (o) => o.outcomeType === 'COMPLETED' || o.outcomeType === 'PARTIAL'
  ).length;

  const metrics: ModelMetrics = {
    id: generateId(),
    metricDate: startOfDay(date),
    recommendationAccuracy: mean(accuracyScores) || 0,
    avgSimilarityScore: mean(recommendations.map((r) => r.recommendationData.similarityScore)) || 0,
    resolutionRate: outcomes.length > 0 ? resolvedCount / outcomes.length : 0,
    recommendationAcceptanceRate:
      recommendations.length > 0 ? acceptedCount / recommendations.length : 0,
    sampleSize: recommendations.length,
    createdAt: new Date(),
  };

  metricsStore.set(dateKey, metrics);

  // Check for performance alerts
  await trackPerformanceAlert(metrics);

  return metrics;
}

/**
 * Track performance alerts
 */
async function trackPerformanceAlert(metrics: ModelMetrics): Promise<void> {
  // Get recent metrics for rolling average
  const recentMetrics = await getRecentMetrics(7);

  if (recentMetrics.length < 3) {
    // Not enough data for alerts
    return;
  }

  const avgAccuracy = mean(recentMetrics.map((m) => m.recommendationAccuracy));

  // Check accuracy threshold
  if (avgAccuracy < THRESHOLDS.accuracy.critical) {
    await createAlert({
      type: 'MODEL_PERFORMANCE_DEGRADATION',
      message: `Critical: Model accuracy dropped to ${(avgAccuracy * 100).toFixed(1)}%`,
      severity: 'critical',
      suggestedAction: 'Immediate retraining recommended. Review recent data quality.',
      metricDate: metrics.metricDate,
    });
  } else if (avgAccuracy < THRESHOLDS.accuracy.warning) {
    await createAlert({
      type: 'MODEL_PERFORMANCE_DEGRADATION',
      message: `Warning: Model accuracy is ${(avgAccuracy * 100).toFixed(1)}%`,
      severity: 'warning',
      suggestedAction: 'Consider triggering retraining pipeline.',
      metricDate: metrics.metricDate,
    });
  }

  // Check sample size
  if (metrics.sampleSize < THRESHOLDS.sampleSize.minimum) {
    await createAlert({
      type: 'LOW_SAMPLE_SIZE',
      message: `Low sample size: only ${metrics.sampleSize} recommendations`,
      severity: 'info',
      suggestedAction: 'Metrics may not be statistically significant.',
      metricDate: metrics.metricDate,
    });
  }

  // Check for high variance
  const accuracies = recentMetrics.map((m) => m.recommendationAccuracy);
  const variance = calculateVariance(accuracies);
  if (variance > THRESHOLDS.variance.maximum) {
    await createAlert({
      type: 'HIGH_VARIANCE',
      message: `High variance detected in accuracy: ${(variance * 100).toFixed(1)}%`,
      severity: 'warning',
      suggestedAction: 'Investigate data distribution changes.',
      metricDate: metrics.metricDate,
    });
  }
}

/**
 * Create a performance alert
 */
async function createAlert(
  params: Omit<PerformanceAlert, 'id' | 'acknowledged' | 'createdAt'>
): Promise<PerformanceAlert> {
  const alert: PerformanceAlert = {
    id: generateId(),
    ...params,
    acknowledged: false,
    createdAt: new Date(),
  };

  alertStore.push(alert);
  return alert;
}

/**
 * Get metrics for a date range
 */
export async function getMetricsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<ModelMetrics[]> {
  const metrics: ModelMetrics[] = [];

  for (const m of metricsStore.values()) {
    if (m.metricDate >= startDate && m.metricDate <= endDate) {
      metrics.push(m);
    }
  }

  return metrics.sort((a, b) => a.metricDate.getTime() - b.metricDate.getTime());
}

/**
 * Get recent metrics
 */
export async function getRecentMetrics(days: number): Promise<ModelMetrics[]> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return getMetricsByDateRange(startDate, endDate);
}

/**
 * Get metrics summary
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  const recentMetrics = await getRecentMetrics(7);
  const latestMetrics = recentMetrics[recentMetrics.length - 1];

  // Calculate trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentMetrics.length >= 3) {
    const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
    const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2));

    const firstAvg = mean(firstHalf.map((m) => m.recommendationAccuracy));
    const secondAvg = mean(secondHalf.map((m) => m.recommendationAccuracy));

    const change = secondAvg - firstAvg;
    if (change > 0.05) trend = 'improving';
    else if (change < -0.05) trend = 'declining';
  }

  // Get active alerts
  const activeAlerts = alertStore.filter((a) => !a.acknowledged);

  return {
    current: {
      accuracy: latestMetrics?.recommendationAccuracy || 0,
      resolutionRate: latestMetrics?.resolutionRate || 0,
      acceptanceRate: latestMetrics?.recommendationAcceptanceRate || 0,
      date: latestMetrics?.metricDate.toISOString() || new Date().toISOString(),
    },
    baseline: BASELINE_METRICS,
    change: {
      accuracy: (latestMetrics?.recommendationAccuracy || 0) - BASELINE_METRICS.accuracy,
      resolutionRate: (latestMetrics?.resolutionRate || 0) - BASELINE_METRICS.resolutionRate,
    },
    alerts: activeAlerts.slice(0, 10),
    trend,
  };
}

/**
 * Get all alerts
 */
export async function getAlerts(options?: {
  acknowledged?: boolean;
  severity?: 'info' | 'warning' | 'critical';
  limit?: number;
}): Promise<PerformanceAlert[]> {
  let alerts = [...alertStore];

  if (options?.acknowledged !== undefined) {
    alerts = alerts.filter((a) => a.acknowledged === options.acknowledged);
  }

  if (options?.severity) {
    alerts = alerts.filter((a) => a.severity === options.severity);
  }

  alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    alerts = alerts.slice(0, options.limit);
  }

  return alerts;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  const alert = alertStore.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

/**
 * Should trigger retraining based on current metrics
 */
export async function shouldTriggerRetraining(): Promise<{
  shouldRetrain: boolean;
  reason?: string;
}> {
  const recentMetrics = await getRecentMetrics(7);

  if (recentMetrics.length < 5) {
    return { shouldRetrain: false, reason: 'Insufficient data' };
  }

  const avgAccuracy = mean(recentMetrics.map((m) => m.recommendationAccuracy));

  if (avgAccuracy < THRESHOLDS.accuracy.critical) {
    return {
      shouldRetrain: true,
      reason: `Performance degradation: accuracy at ${(avgAccuracy * 100).toFixed(1)}%`,
    };
  }

  return { shouldRetrain: false };
}

/**
 * Calculate aggregate statistics
 */
export async function calculateAggregateStats(metrics: ModelMetrics[]): Promise<{
  avgAccuracy: number;
  avgResolutionRate: number;
  avgAcceptanceRate: number;
  totalSampleSize: number;
  accuracyStdDev: number;
  minAccuracy: number;
  maxAccuracy: number;
}> {
  if (metrics.length === 0) {
    return {
      avgAccuracy: 0,
      avgResolutionRate: 0,
      avgAcceptanceRate: 0,
      totalSampleSize: 0,
      accuracyStdDev: 0,
      minAccuracy: 0,
      maxAccuracy: 0,
    };
  }

  const accuracies = metrics.map((m) => m.recommendationAccuracy);

  return {
    avgAccuracy: mean(accuracies),
    avgResolutionRate: mean(metrics.map((m) => m.resolutionRate)),
    avgAcceptanceRate: mean(metrics.map((m) => m.recommendationAcceptanceRate)),
    totalSampleSize: metrics.reduce((sum, m) => sum + m.sampleSize, 0),
    accuracyStdDev: Math.sqrt(calculateVariance(accuracies)),
    minAccuracy: Math.min(...accuracies),
    maxAccuracy: Math.max(...accuracies),
  };
}

// Utility functions
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return mean(values.map((v) => Math.pow(v - avg, 2)));
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return startOfDay(date).toISOString().split('T')[0];
}

function generateId(): string {
  return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
