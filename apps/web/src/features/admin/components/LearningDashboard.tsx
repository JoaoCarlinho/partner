/**
 * Learning Pipeline Dashboard
 * Admin view for monitoring model performance, A/B tests, and bias detection
 */

import React, { useState, useEffect } from 'react';

// Types matching API responses
interface ModelMetrics {
  metricDate: string;
  recommendationAccuracy: number;
  avgSimilarityScore: number;
  resolutionRate: number;
  recommendationAcceptanceRate: number;
  sampleSize: number;
}

interface MetricsSummary {
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

interface PerformanceAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestedAction: string;
  metricDate: string;
  acknowledged: boolean;
}

interface ABTestSummary {
  id: string;
  name: string;
  testType: string;
  status: 'RUNNING' | 'CONCLUDED' | 'CANCELLED';
  variants: string[];
  startedAt: string;
  sampleSize: number;
  pValue?: number;
  winner?: string;
}

interface BiasMetrics {
  segment: string;
  sampleSize: number;
  resolutionRate: number;
  avgRecommendationScore: number;
  zScore: number;
  hasBias: boolean;
  biasDirection: 'underperforming' | 'overperforming' | 'none';
}

interface BiasReport {
  metrics: BiasMetrics[];
  alerts: { segment: string; severity: 'warning' | 'critical'; message: string }[];
  lastChecked: string;
}

export const LearningDashboard: React.FC = () => {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [abTests, setAbTests] = useState<ABTestSummary[]>([]);
  const [biasReport, setBiasReport] = useState<BiasReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'performance' | 'abtests' | 'bias'>('performance');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const [summaryRes, metricsRes, testsRes, biasRes] = await Promise.all([
      //   fetch('/api/v1/intelligence/metrics/summary'),
      //   fetch('/api/v1/intelligence/metrics?days=30'),
      //   fetch('/api/v1/intelligence/ab-tests'),
      //   fetch('/api/v1/intelligence/bias'),
      // ]);

      // Mock data for development
      setSummary(mockSummary);
      setMetrics(mockMetrics);
      setAbTests(mockAbTests);
      setBiasReport(mockBiasReport);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatChange = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Learning Pipeline Dashboard</h1>
        <p className="text-gray-600">Monitor model performance, A/B tests, and bias detection</p>
      </div>

      {/* Alert Banner */}
      {summary && summary.alerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {summary.alerts.length} active alert(s) require attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'performance', label: 'Model Performance' },
            { id: 'abtests', label: 'A/B Tests' },
            { id: 'bias', label: 'Bias Monitoring' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'bias' && biasReport && biasReport.alerts.length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {biasReport.alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Performance Tab */}
      {activeTab === 'performance' && summary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Accuracy"
              value={formatPercent(summary.current.accuracy)}
              change={formatChange(summary.change.accuracy)}
              trend={summary.change.accuracy >= 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Resolution Rate"
              value={formatPercent(summary.current.resolutionRate)}
              change={formatChange(summary.change.resolutionRate)}
              trend={summary.change.resolutionRate >= 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Acceptance Rate"
              value={formatPercent(summary.current.acceptanceRate)}
              change="-"
              trend="neutral"
            />
            <MetricCard
              title="Trend"
              value={summary.trend.charAt(0).toUpperCase() + summary.trend.slice(1)}
              change=""
              trend={summary.trend === 'improving' ? 'up' : summary.trend === 'declining' ? 'down' : 'neutral'}
              valueColor={summary.trend === 'improving' ? 'text-green-600' : summary.trend === 'declining' ? 'text-red-600' : 'text-gray-600'}
            />
          </div>

          {/* Metrics Chart Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Accuracy Over Time</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-500">Chart visualization would go here</p>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Metrics</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acceptance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sample Size</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.slice(0, 7).map((metric, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(metric.metricDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(metric.recommendationAccuracy)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(metric.resolutionRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(metric.recommendationAcceptanceRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.sampleSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'abtests' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">A/B Tests</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Samples</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P-Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {abTests.map((test) => (
                <tr key={test.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{test.name}</div>
                    <div className="text-sm text-gray-500">{test.testType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      test.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                      test.status === 'CONCLUDED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {test.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.sampleSize}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.pValue ? test.pValue.toFixed(4) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.winner || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bias Monitoring Tab */}
      {activeTab === 'bias' && biasReport && (
        <div className="space-y-6">
          {/* Bias Alerts */}
          {biasReport.alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bias Alerts</h3>
              <div className="space-y-3">
                {biasReport.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      alert.severity === 'critical' ? 'bg-red-50 border-l-4 border-red-500' :
                      'bg-yellow-50 border-l-4 border-yellow-500'
                    }`}
                  >
                    <p className={`text-sm ${
                      alert.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      <strong>{alert.segment}:</strong> {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segment Metrics Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Segment Analysis</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sample</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Z-Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {biasReport.metrics.map((metric) => (
                  <tr key={metric.segment}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.segment.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.sampleSize}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(metric.resolutionRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.zScore.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {metric.hasBias ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Bias Detected
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  valueColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, valueColor }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className={`mt-2 text-3xl font-semibold ${valueColor || 'text-gray-900'}`}>{value}</p>
    {change && (
      <p className={`mt-2 flex items-center text-sm ${
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
      }`}>
        {trend === 'up' && (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {trend === 'down' && (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {change}
      </p>
    )}
  </div>
);

// Mock data for development
const mockSummary: MetricsSummary = {
  current: {
    accuracy: 0.724,
    resolutionRate: 0.681,
    acceptanceRate: 0.812,
    date: new Date().toISOString(),
  },
  baseline: {
    accuracy: 0.65,
    resolutionRate: 0.60,
  },
  change: {
    accuracy: 0.074,
    resolutionRate: 0.081,
  },
  alerts: [],
  trend: 'improving',
};

const mockMetrics: ModelMetrics[] = Array.from({ length: 7 }, (_, i) => ({
  metricDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  recommendationAccuracy: 0.70 + Math.random() * 0.1,
  avgSimilarityScore: 0.75 + Math.random() * 0.1,
  resolutionRate: 0.65 + Math.random() * 0.1,
  recommendationAcceptanceRate: 0.78 + Math.random() * 0.1,
  sampleSize: Math.floor(100 + Math.random() * 50),
}));

const mockAbTests: ABTestSummary[] = [
  {
    id: '1',
    name: 'Similarity Threshold 0.8 vs 0.85',
    testType: 'SIMILARITY_THRESHOLD',
    status: 'RUNNING',
    variants: ['control', 'variant_a'],
    startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    sampleSize: 234,
  },
  {
    id: '2',
    name: 'Plan Default Terms',
    testType: 'PLAN_DEFAULTS',
    status: 'CONCLUDED',
    variants: ['control', 'variant_b'],
    startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    sampleSize: 512,
    pValue: 0.023,
    winner: 'variant_b',
  },
];

const mockBiasReport: BiasReport = {
  metrics: [
    { segment: 'debt_low', sampleSize: 423, resolutionRate: 0.712, avgRecommendationScore: 0.78, zScore: 0.82, hasBias: false, biasDirection: 'none' },
    { segment: 'debt_medium', sampleSize: 687, resolutionRate: 0.684, avgRecommendationScore: 0.76, zScore: 0.21, hasBias: false, biasDirection: 'none' },
    { segment: 'debt_high', sampleSize: 312, resolutionRate: 0.583, avgRecommendationScore: 0.71, zScore: -2.34, hasBias: true, biasDirection: 'underperforming' },
    { segment: 'engagement_low', sampleSize: 234, resolutionRate: 0.621, avgRecommendationScore: 0.69, zScore: -1.45, hasBias: false, biasDirection: 'none' },
    { segment: 'engagement_high', sampleSize: 876, resolutionRate: 0.728, avgRecommendationScore: 0.82, zScore: 1.12, hasBias: false, biasDirection: 'none' },
  ],
  alerts: [
    {
      segment: 'debt_high',
      severity: 'warning',
      message: 'High debt segment showing lower resolution rate (58.3%) with z-score -2.34',
    },
  ],
  lastChecked: new Date().toISOString(),
};

export default LearningDashboard;
