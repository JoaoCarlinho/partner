/**
 * Debtor Insights Panel
 * Creditor-facing component showing debtor intention and readiness
 */

import React, { useState, useEffect } from 'react';

// Types
type IntentionCategory =
  | 'ready_to_pay'
  | 'wants_negotiation'
  | 'disputes_debt'
  | 'needs_information'
  | 'financial_hardship'
  | 'overwhelmed'
  | 'unknown';

type ReadinessLevel = 'not_ready' | 'warming_up' | 'ready_to_engage';

interface DebtorInsights {
  intention: IntentionCategory;
  intentionDescription: string;
  readiness: ReadinessLevel;
  readinessScore: number;
  suggestedApproach: string;
  needsSupport: boolean;
  lastActivity: string;
}

interface DebtorInsightsPanelProps {
  caseId: string;
  className?: string;
}

// Intention display config
const INTENTION_CONFIG: Record<IntentionCategory, { label: string; color: string; icon: string }> = {
  ready_to_pay: { label: 'Ready to Pay', color: '#10B981', icon: '💳' },
  wants_negotiation: { label: 'Open to Negotiation', color: '#3B82F6', icon: '🤝' },
  disputes_debt: { label: 'Disputes Debt', color: '#F59E0B', icon: '❓' },
  needs_information: { label: 'Seeking Information', color: '#6366F1', icon: '📋' },
  financial_hardship: { label: 'Financial Hardship', color: '#EF4444', icon: '💔' },
  overwhelmed: { label: 'Needs Support', color: '#EC4899', icon: '🆘' },
  unknown: { label: 'Unknown', color: '#6B7280', icon: '❔' },
};

// Readiness display config
const READINESS_CONFIG: Record<ReadinessLevel, { label: string; color: string }> = {
  not_ready: { label: 'Not Ready', color: '#EF4444' },
  warming_up: { label: 'Warming Up', color: '#F59E0B' },
  ready_to_engage: { label: 'Ready to Engage', color: '#10B981' },
};

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{ value: number; max?: number; color: string }> = ({
  value,
  max = 100,
  color,
}) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="h-2 rounded-full transition-all duration-500"
      style={{
        width: `${(value / max) * 100}%`,
        backgroundColor: color,
      }}
    />
  </div>
);

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-6 bg-gray-200 rounded w-1/2" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-2 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-2/3" />
  </div>
);

/**
 * Error display
 */
const ErrorDisplay: React.FC<{ error: string; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="text-center py-4">
    <p className="text-red-600 text-sm mb-2">{error}</p>
    <button
      onClick={onRetry}
      className="text-sm text-blue-600 hover:underline"
    >
      Try again
    </button>
  </div>
);

/**
 * Main DebtorInsightsPanel component
 */
export const DebtorInsightsPanel: React.FC<DebtorInsightsPanelProps> = ({
  caseId,
  className = '',
}) => {
  const [insights, setInsights] = useState<DebtorInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/cases/${caseId}/debtor-insights`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load insights');
      }

      setInsights(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load debtor insights');
      // Set mock data for development
      setInsights({
        intention: 'wants_negotiation',
        intentionDescription: 'Open to finding a workable arrangement',
        readiness: 'warming_up',
        readinessScore: 45,
        suggestedApproach: 'Offer flexible payment plan options and emphasize willingness to work together.',
        needsSupport: false,
        lastActivity: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [caseId]);

  const intentionConfig = insights
    ? INTENTION_CONFIG[insights.intention]
    : INTENTION_CONFIG.unknown;
  const readinessConfig = insights
    ? READINESS_CONFIG[insights.readiness]
    : READINESS_CONFIG.not_ready;

  const formatLastActivity = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="font-medium text-gray-900">Debtor Insights</h3>
        </div>
        <span
          className="text-gray-400 transition-transform"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
        >
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error && !insights ? (
            <ErrorDisplay error={error} onRetry={loadInsights} />
          ) : insights ? (
            <div className="space-y-4">
              {/* Intention */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Intent</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{intentionConfig.icon}</span>
                  <span
                    className="font-medium"
                    style={{ color: intentionConfig.color }}
                  >
                    {intentionConfig.label}
                  </span>
                </div>
              </div>

              {/* Readiness */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-500">Readiness</p>
                  <span
                    className="text-sm font-medium"
                    style={{ color: readinessConfig.color }}
                  >
                    {readinessConfig.label} ({insights.readinessScore}%)
                  </span>
                </div>
                <ProgressBar
                  value={insights.readinessScore}
                  color={readinessConfig.color}
                />
              </div>

              {/* Suggested Approach */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Suggested Approach
                </p>
                <p className="text-sm text-blue-700">
                  {insights.suggestedApproach}
                </p>
              </div>

              {/* Support Flag */}
              {insights.needsSupport && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <p className="text-sm text-yellow-800">
                    This debtor may benefit from extra support. Consider a
                    compassionate approach.
                  </p>
                </div>
              )}

              {/* Last Activity */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Last activity: {formatLastActivity(insights.lastActivity)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DebtorInsightsPanel;
