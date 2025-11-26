/**
 * Analytics Dashboard Component
 * Main dashboard displaying platform metrics
 */

import React, { useState, useCallback, useEffect } from 'react';
import { MetricsCard } from './MetricsCard';
import { TrendChart } from './TrendChart';

/**
 * Overview metrics
 */
interface OverviewMetrics {
  totalDemands: number;
  activeDemands: number;
  resolvedDemands: number;
  totalAmountOwed: number;
  totalAmountCollected: number;
  collectionRate: number;
  averageResolutionTime: number;
  averageDebtAmount: number;
}

/**
 * Financial metrics
 */
interface FinancialMetrics {
  totalRecovered: number;
  projectedRecovery: number;
  recoveryRate: number;
  averagePaymentSize: number;
  onTimePaymentRate: number;
  defaultRate: number;
}

/**
 * Trend data
 */
interface TrendPoint {
  date: string;
  value: number;
  change?: number;
}

/**
 * Dashboard data
 */
interface DashboardData {
  period: string;
  overview: OverviewMetrics;
  changes: {
    totalDemands: number;
    collectionRate: number;
    resolvedDemands: number;
    totalAmountCollected: number;
  };
  financial: FinancialMetrics;
  trends: {
    collections: TrendPoint[];
    resolutions: TrendPoint[];
  };
}

/**
 * Props
 */
interface AnalyticsDashboardProps {
  creditorId?: string;
  className?: string;
}

/**
 * Period options
 */
const PERIOD_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  creditorId,
  className = '',
}) => {
  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  /**
   * Fetch dashboard data
   */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = creditorId
        ? `/api/analytics/creditor/${creditorId}?period=${period}`
        : `/api/analytics/dashboard?period=${period}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load analytics');

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [creditorId, period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2" />
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        <button onClick={fetchDashboard} className="mt-2 text-blue-600 hover:text-blue-800">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                period === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Demands"
          value={data.overview.totalDemands}
          change={data.changes.totalDemands}
          format="number"
        />
        <MetricsCard
          title="Amount Collected"
          value={data.overview.totalAmountCollected}
          change={data.changes.totalAmountCollected}
          format="currency"
        />
        <MetricsCard
          title="Collection Rate"
          value={data.overview.collectionRate}
          change={data.changes.collectionRate}
          format="percent"
        />
        <MetricsCard
          title="Resolved"
          value={data.overview.resolvedDemands}
          change={data.changes.resolvedDemands}
          format="number"
        />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChart
          data={data.trends.collections}
          title="Collections Trend"
          format="currency"
          color="green"
        />
        <TrendChart
          data={data.trends.resolutions}
          title="Resolutions Trend"
          format="number"
          color="blue"
        />
      </div>

      {/* Financial metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">Financial Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Recovery Rate</p>
            <p className="text-xl font-bold text-gray-900">{data.financial.recoveryRate}%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">On-Time Payment Rate</p>
            <p className="text-xl font-bold text-gray-900">{data.financial.onTimePaymentRate}%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Default Rate</p>
            <p className="text-xl font-bold text-red-600">{data.financial.defaultRate}%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Recovered</p>
            <p className="text-xl font-bold text-green-600">
              ${data.financial.totalRecovered.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Projected Recovery</p>
            <p className="text-xl font-bold text-gray-900">
              ${data.financial.projectedRecovery.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Avg Payment Size</p>
            <p className="text-xl font-bold text-gray-900">
              ${data.financial.averagePaymentSize.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.overview.activeDemands}</p>
          <p className="text-sm text-gray-500">Active Demands</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">
            ${Math.round(data.overview.averageDebtAmount).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Avg Debt Amount</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">
            {data.overview.averageResolutionTime.toFixed(1)}
          </p>
          <p className="text-sm text-gray-500">Avg Resolution (days)</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">
            ${Math.round(data.overview.totalAmountOwed).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Owed</p>
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <a
          href={`/api/analytics/export?format=csv&period=${period}`}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          download
        >
          Export CSV
        </a>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
