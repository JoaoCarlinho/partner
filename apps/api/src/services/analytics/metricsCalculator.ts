/**
 * Metrics Calculator Service
 * Calculates key performance metrics for debt resolution platform
 */

/**
 * Time period for metrics
 */
export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

/**
 * Demand status for counting
 */
export type DemandStatus = 'active' | 'resolved' | 'defaulted' | 'disputed';

/**
 * Raw demand data for calculations
 */
export interface DemandData {
  id: string;
  amount: number;
  status: DemandStatus;
  createdAt: Date;
  resolvedAt?: Date;
  paidAmount: number;
  creditorId: string;
}

/**
 * Overview metrics
 */
export interface OverviewMetrics {
  totalDemands: number;
  activeDemands: number;
  resolvedDemands: number;
  totalAmountOwed: number;
  totalAmountCollected: number;
  collectionRate: number;
  averageResolutionTime: number; // days
  averageDebtAmount: number;
}

/**
 * Resolution metrics
 */
export interface ResolutionMetrics {
  totalResolved: number;
  resolvedWithPlan: number;
  resolvedFullPayment: number;
  resolvedSettlement: number;
  averageSettlementPercent: number;
  resolutionByPeriod: Array<{
    period: string;
    count: number;
    amount: number;
  }>;
}

/**
 * Communication metrics
 */
export interface CommunicationMetrics {
  totalMessages: number;
  averageResponseTime: number; // hours
  messagesPerResolution: number;
  debtorEngagementRate: number;
  aiAssistUsage: number;
}

/**
 * Financial metrics
 */
export interface FinancialMetrics {
  totalRecovered: number;
  projectedRecovery: number;
  recoveryRate: number;
  averagePaymentSize: number;
  onTimePaymentRate: number;
  defaultRate: number;
}

/**
 * Trend data point
 */
export interface TrendPoint {
  date: string;
  value: number;
  change?: number;
}

/**
 * Calculate date range for period
 */
export function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setDate(end.getDate() - 1);
      break;
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2020); // Platform start date
      break;
  }

  return { start, end };
}

/**
 * Calculate overview metrics
 */
export function calculateOverviewMetrics(demands: DemandData[]): OverviewMetrics {
  const totalDemands = demands.length;
  const activeDemands = demands.filter((d) => d.status === 'active').length;
  const resolvedDemands = demands.filter((d) => d.status === 'resolved').length;

  const totalAmountOwed = demands.reduce((sum, d) => sum + d.amount, 0);
  const totalAmountCollected = demands.reduce((sum, d) => sum + d.paidAmount, 0);

  const collectionRate = totalAmountOwed > 0 ? (totalAmountCollected / totalAmountOwed) * 100 : 0;

  // Calculate average resolution time
  const resolvedWithTime = demands.filter((d) => d.status === 'resolved' && d.resolvedAt);
  const totalResolutionDays = resolvedWithTime.reduce((sum, d) => {
    const days = Math.ceil(
      (d.resolvedAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + days;
  }, 0);
  const averageResolutionTime =
    resolvedWithTime.length > 0 ? totalResolutionDays / resolvedWithTime.length : 0;

  const averageDebtAmount = totalDemands > 0 ? totalAmountOwed / totalDemands : 0;

  return {
    totalDemands,
    activeDemands,
    resolvedDemands,
    totalAmountOwed,
    totalAmountCollected,
    collectionRate: Math.round(collectionRate * 10) / 10,
    averageResolutionTime: Math.round(averageResolutionTime * 10) / 10,
    averageDebtAmount: Math.round(averageDebtAmount * 100) / 100,
  };
}

/**
 * Calculate resolution metrics
 */
export function calculateResolutionMetrics(
  demands: DemandData[],
  period: TimePeriod = 'month'
): ResolutionMetrics {
  const resolved = demands.filter((d) => d.status === 'resolved');

  // Categorize by resolution type
  const resolvedFullPayment = resolved.filter((d) => d.paidAmount >= d.amount).length;
  const resolvedSettlement = resolved.filter((d) => d.paidAmount > 0 && d.paidAmount < d.amount).length;
  const resolvedWithPlan = resolved.length; // All resolved assumed to have had plans

  // Calculate average settlement percent
  const settlements = resolved.filter((d) => d.paidAmount > 0 && d.paidAmount < d.amount);
  const avgSettlement =
    settlements.length > 0
      ? settlements.reduce((sum, d) => sum + (d.paidAmount / d.amount) * 100, 0) / settlements.length
      : 0;

  // Group by period
  const { start } = getDateRange(period);
  const periodResolved = resolved.filter((d) => d.resolvedAt && d.resolvedAt >= start);

  // Generate period buckets (simplified - would be more complex in production)
  const resolutionByPeriod = generatePeriodBuckets(periodResolved, period);

  return {
    totalResolved: resolved.length,
    resolvedWithPlan,
    resolvedFullPayment,
    resolvedSettlement,
    averageSettlementPercent: Math.round(avgSettlement * 10) / 10,
    resolutionByPeriod,
  };
}

/**
 * Calculate financial metrics
 */
export function calculateFinancialMetrics(demands: DemandData[]): FinancialMetrics {
  const totalRecovered = demands.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalOwed = demands.reduce((sum, d) => sum + d.amount, 0);

  // Project recovery based on active payment plans (simplified)
  const activeWithPayments = demands.filter((d) => d.status === 'active' && d.paidAmount > 0);
  const projectedFromActive = activeWithPayments.reduce((sum, d) => {
    // Estimate remaining will be paid based on current progress
    const progressRate = d.paidAmount / d.amount;
    return sum + d.amount * Math.min(progressRate * 1.5, 1); // Conservative estimate
  }, 0);
  const projectedRecovery = totalRecovered + projectedFromActive;

  const recoveryRate = totalOwed > 0 ? (totalRecovered / totalOwed) * 100 : 0;

  // Calculate payment metrics (would need payment data in production)
  const paymentsCount = demands.filter((d) => d.paidAmount > 0).length;
  const averagePaymentSize = paymentsCount > 0 ? totalRecovered / paymentsCount : 0;

  const onTimePaymentRate = 85; // Placeholder - would calculate from actual payment data
  const defaultRate =
    demands.length > 0
      ? (demands.filter((d) => d.status === 'defaulted').length / demands.length) * 100
      : 0;

  return {
    totalRecovered,
    projectedRecovery: Math.round(projectedRecovery * 100) / 100,
    recoveryRate: Math.round(recoveryRate * 10) / 10,
    averagePaymentSize: Math.round(averagePaymentSize * 100) / 100,
    onTimePaymentRate,
    defaultRate: Math.round(defaultRate * 10) / 10,
  };
}

/**
 * Generate trend data
 */
export function generateTrendData(
  demands: DemandData[],
  metric: 'collections' | 'resolutions' | 'demands',
  period: TimePeriod
): TrendPoint[] {
  const { start, end } = getDateRange(period);
  const points: TrendPoint[] = [];

  // Determine bucket size
  const bucketDays =
    period === 'day' ? 1 : period === 'week' ? 1 : period === 'month' ? 7 : period === 'quarter' ? 30 : 30;

  let current = new Date(start);
  while (current <= end) {
    const bucketEnd = new Date(current);
    bucketEnd.setDate(bucketEnd.getDate() + bucketDays);

    let value = 0;
    switch (metric) {
      case 'collections':
        value = demands
          .filter((d) => d.resolvedAt && d.resolvedAt >= current && d.resolvedAt < bucketEnd)
          .reduce((sum, d) => sum + d.paidAmount, 0);
        break;
      case 'resolutions':
        value = demands.filter(
          (d) => d.resolvedAt && d.resolvedAt >= current && d.resolvedAt < bucketEnd
        ).length;
        break;
      case 'demands':
        value = demands.filter(
          (d) => d.createdAt >= current && d.createdAt < bucketEnd
        ).length;
        break;
    }

    points.push({
      date: current.toISOString().split('T')[0],
      value,
    });

    current = bucketEnd;
  }

  // Calculate change percentages
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].value;
    const curr = points[i].value;
    points[i].change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  return points;
}

/**
 * Generate period buckets helper
 */
function generatePeriodBuckets(
  demands: DemandData[],
  period: TimePeriod
): Array<{ period: string; count: number; amount: number }> {
  const buckets: Map<string, { count: number; amount: number }> = new Map();

  demands.forEach((d) => {
    if (!d.resolvedAt) return;

    const key = formatPeriodKey(d.resolvedAt, period);
    const existing = buckets.get(key) || { count: 0, amount: 0 };
    buckets.set(key, {
      count: existing.count + 1,
      amount: existing.amount + d.paidAmount,
    });
  });

  return Array.from(buckets.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Format period key
 */
function formatPeriodKey(date: Date, period: TimePeriod): string {
  switch (period) {
    case 'day':
      return date.toISOString().split('T')[0];
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return `Week of ${weekStart.toISOString().split('T')[0]}`;
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    case 'year':
      return String(date.getFullYear());
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Calculate creditor-specific metrics
 */
export function calculateCreditorMetrics(
  demands: DemandData[],
  creditorId: string
): {
  overview: OverviewMetrics;
  financial: FinancialMetrics;
  ranking: { position: number; totalCreditors: number };
} {
  const creditorDemands = demands.filter((d) => d.creditorId === creditorId);
  const overview = calculateOverviewMetrics(creditorDemands);
  const financial = calculateFinancialMetrics(creditorDemands);

  // Calculate ranking among all creditors
  const creditorIds = [...new Set(demands.map((d) => d.creditorId))];
  const creditorRecoveryRates = creditorIds.map((id) => {
    const cDemands = demands.filter((d) => d.creditorId === id);
    const totalOwed = cDemands.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = cDemands.reduce((sum, d) => sum + d.paidAmount, 0);
    return { id, rate: totalOwed > 0 ? totalPaid / totalOwed : 0 };
  });
  creditorRecoveryRates.sort((a, b) => b.rate - a.rate);
  const position = creditorRecoveryRates.findIndex((c) => c.id === creditorId) + 1;

  return {
    overview,
    financial,
    ranking: {
      position,
      totalCreditors: creditorIds.length,
    },
  };
}
