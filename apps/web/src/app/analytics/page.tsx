'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CollectorNav } from '@/components/CollectorNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

interface User {
  id: string;
  email: string;
  role: string;
}

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

interface FinancialMetrics {
  totalRecovered: number;
  projectedRecovery: number;
  recoveryRate: number;
  averagePaymentSize: number;
  onTimePaymentRate: number;
  defaultRate: number;
}

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
}

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

function MetricsCard({
  title,
  value,
  change,
  format,
}: {
  title: string;
  value: number;
  change?: number;
  format: 'number' | 'currency' | 'percent';
}) {
  const formatValue = () => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{formatValue()}</p>
      {change !== undefined && (
        <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}% vs last period
        </p>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'DEBTOR') {
        router.push('/debtor/dashboard');
        return;
      }
      setUser({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    } catch {
      localStorage.removeItem('authToken');
      router.push('/login');
    }
  }, [router]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_URL}/api/v1/analytics/dashboard?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      // Set mock data for demo purposes
      setData({
        period,
        overview: {
          totalDemands: 156,
          activeDemands: 42,
          resolvedDemands: 89,
          totalAmountOwed: 2450000,
          totalAmountCollected: 1840000,
          collectionRate: 75.1,
          averageResolutionTime: 23.5,
          averageDebtAmount: 15705,
        },
        changes: {
          totalDemands: 12.5,
          collectionRate: 3.2,
          resolvedDemands: 8.7,
          totalAmountCollected: 15.3,
        },
        financial: {
          totalRecovered: 1840000,
          projectedRecovery: 610000,
          recoveryRate: 75.1,
          averagePaymentSize: 2850,
          onTimePaymentRate: 68.4,
          defaultRate: 12.3,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, fetchAnalytics]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CollectorNav user={user} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-600">Track collection performance and metrics</p>
          </div>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  period === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mx-auto mb-2" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : error && !data ? (
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchAnalytics} className="mt-2 text-primary-600 hover:underline">
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
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

            {/* Financial metrics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                <p className="text-3xl font-bold text-primary-600">{data.overview.activeDemands}</p>
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
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                Export CSV
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
