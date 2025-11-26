/**
 * Query Metrics Service
 * Tracks and reports embedding search performance
 */

/**
 * Query metric record
 */
export interface QueryMetric {
  queryId: string;
  timestamp: Date;
  latencyMs: number;
  resultsReturned: number;
  totalCandidates: number;
  filteredCandidates: number;
  minSimilarity: number;
  maxSimilarity: number;
  avgSimilarity: number;
  indexUsed: string;
  filters: {
    outcomeFilter?: string;
    organizationId?: string;
    minCompletionRate?: number;
  };
  success: boolean;
  error?: string;
}

/**
 * Aggregated metrics
 */
export interface AggregatedMetrics {
  period: {
    start: Date;
    end: Date;
  };
  queryCount: number;
  successRate: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };
  results: {
    avgReturned: number;
    avgSimilarity: number;
  };
  slowQueries: number; // > 100ms
  errors: number;
}

/**
 * In-memory metrics store
 */
const metricsStore: QueryMetric[] = [];
const MAX_STORED_METRICS = 10000;

/**
 * Slow query threshold (ms)
 */
const SLOW_QUERY_THRESHOLD = 100;

/**
 * Generate unique query ID
 */
function generateQueryId(): string {
  return `qry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Track a query metric
 */
export function trackQuery(metric: Omit<QueryMetric, 'queryId' | 'timestamp'>): QueryMetric {
  const fullMetric: QueryMetric = {
    ...metric,
    queryId: generateQueryId(),
    timestamp: new Date(),
  };

  // Log slow queries
  if (fullMetric.latencyMs > SLOW_QUERY_THRESHOLD) {
    console.warn('Slow vector query detected:', {
      queryId: fullMetric.queryId,
      latencyMs: fullMetric.latencyMs,
      totalCandidates: fullMetric.totalCandidates,
      indexUsed: fullMetric.indexUsed,
    });
  }

  // Store metric
  metricsStore.push(fullMetric);

  // Trim old metrics if needed
  if (metricsStore.length > MAX_STORED_METRICS) {
    metricsStore.splice(0, metricsStore.length - MAX_STORED_METRICS);
  }

  return fullMetric;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get aggregated metrics for a time period
 */
export function getAggregatedMetrics(
  startTime: Date,
  endTime: Date = new Date()
): AggregatedMetrics {
  const filteredMetrics = metricsStore.filter(
    (m) => m.timestamp >= startTime && m.timestamp <= endTime
  );

  if (filteredMetrics.length === 0) {
    return {
      period: { start: startTime, end: endTime },
      queryCount: 0,
      successRate: 0,
      latency: { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 },
      results: { avgReturned: 0, avgSimilarity: 0 },
      slowQueries: 0,
      errors: 0,
    };
  }

  // Calculate latency stats
  const latencies = filteredMetrics.map((m) => m.latencyMs).sort((a, b) => a - b);
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

  // Count success/errors
  const successCount = filteredMetrics.filter((m) => m.success).length;
  const slowCount = filteredMetrics.filter((m) => m.latencyMs > SLOW_QUERY_THRESHOLD).length;

  // Calculate result stats
  const avgResults =
    filteredMetrics.reduce((sum, m) => sum + m.resultsReturned, 0) / filteredMetrics.length;
  const avgSimilarity =
    filteredMetrics
      .filter((m) => m.avgSimilarity > 0)
      .reduce((sum, m) => sum + m.avgSimilarity, 0) /
    filteredMetrics.filter((m) => m.avgSimilarity > 0).length || 0;

  return {
    period: { start: startTime, end: endTime },
    queryCount: filteredMetrics.length,
    successRate: (successCount / filteredMetrics.length) * 100,
    latency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      avg: avgLatency,
      min: latencies[0],
      max: latencies[latencies.length - 1],
    },
    results: {
      avgReturned: avgResults,
      avgSimilarity,
    },
    slowQueries: slowCount,
    errors: filteredMetrics.length - successCount,
  };
}

/**
 * Get recent slow queries
 */
export function getSlowQueries(limit: number = 10): QueryMetric[] {
  return metricsStore
    .filter((m) => m.latencyMs > SLOW_QUERY_THRESHOLD)
    .sort((a, b) => b.latencyMs - a.latencyMs)
    .slice(0, limit);
}

/**
 * Get error queries
 */
export function getErrorQueries(limit: number = 10): QueryMetric[] {
  return metricsStore
    .filter((m) => !m.success)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get metrics for the last N minutes
 */
export function getRecentMetrics(minutes: number = 60): AggregatedMetrics {
  const startTime = new Date(Date.now() - minutes * 60 * 1000);
  return getAggregatedMetrics(startTime);
}

/**
 * Get hourly metrics breakdown
 */
export function getHourlyMetrics(hours: number = 24): AggregatedMetrics[] {
  const results: AggregatedMetrics[] = [];
  const now = new Date();

  for (let i = hours - 1; i >= 0; i--) {
    const endTime = new Date(now.getTime() - i * 60 * 60 * 1000);
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
    results.push(getAggregatedMetrics(startTime, endTime));
  }

  return results;
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
  metricsStore.length = 0;
}

/**
 * Get raw metrics count
 */
export function getMetricsCount(): number {
  return metricsStore.length;
}

/**
 * Export metrics for external monitoring
 * Format suitable for CloudWatch or similar
 */
export function exportMetrics(): {
  namespace: string;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
  }>;
} {
  const recent = getRecentMetrics(5); // Last 5 minutes

  return {
    namespace: 'Steno/Embeddings',
    metrics: [
      { name: 'QueryCount', value: recent.queryCount, unit: 'Count', timestamp: new Date() },
      { name: 'QueryLatencyP50', value: recent.latency.p50, unit: 'Milliseconds', timestamp: new Date() },
      { name: 'QueryLatencyP95', value: recent.latency.p95, unit: 'Milliseconds', timestamp: new Date() },
      { name: 'QueryLatencyP99', value: recent.latency.p99, unit: 'Milliseconds', timestamp: new Date() },
      { name: 'SuccessRate', value: recent.successRate, unit: 'Percent', timestamp: new Date() },
      { name: 'SlowQueries', value: recent.slowQueries, unit: 'Count', timestamp: new Date() },
      { name: 'AvgResultsReturned', value: recent.results.avgReturned, unit: 'Count', timestamp: new Date() },
    ],
  };
}

export default {
  trackQuery,
  getAggregatedMetrics,
  getSlowQueries,
  getErrorQueries,
  getRecentMetrics,
  getHourlyMetrics,
  clearMetrics,
  getMetricsCount,
  exportMetrics,
  SLOW_QUERY_THRESHOLD,
};
