'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface ComplianceCheck {
  id: string;
  name: string;
  passed: boolean;
  required: boolean;
  message?: string;
}

export interface ComplianceResult {
  isCompliant: boolean;
  score: number;
  checks: ComplianceCheck[];
}

interface CompliancePanelProps {
  complianceResult: ComplianceResult;
  className?: string;
}

/**
 * Get color class based on compliance score (AC-2.1.3)
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get progress bar color based on compliance score
 */
function getProgressBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Get icon and styling for compliance check (AC-2.1.4)
 */
function getCheckStyle(check: ComplianceCheck) {
  if (check.passed) {
    return {
      Icon: CheckCircle,
      colorClass: 'text-green-500',
    };
  }
  // Failed required check = red, failed optional = yellow
  return {
    Icon: check.required ? XCircle : AlertCircle,
    colorClass: check.required ? 'text-red-500' : 'text-yellow-500',
  };
}

/**
 * CompliancePanel - Displays compliance score and check statuses (AC-2.1.3, AC-2.1.4)
 */
export function CompliancePanel({ complianceResult, className = '' }: CompliancePanelProps) {
  const { score, checks } = complianceResult;
  const scoreColor = getScoreColor(score);
  const progressBarColor = getProgressBarColor(score);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Compliance Score Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Compliance Score</h3>
        <div className="flex items-center gap-3">
          {/* Progress Bar */}
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressBarColor} transition-all duration-300`}
              style={{ width: `${score}%` }}
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Compliance score: ${score}%`}
            />
          </div>
          {/* Score Percentage */}
          <span className={`text-lg font-bold ${scoreColor}`} data-testid="compliance-score">
            {score}%
          </span>
        </div>
      </div>

      {/* Compliance Checks List */}
      <div className="space-y-2">
        {checks.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance checks available</p>
        ) : (
          checks.map((check) => {
            const { Icon, colorClass } = getCheckStyle(check);
            return (
              <div
                key={check.id}
                className="flex items-start gap-2 py-1"
                data-testid={`compliance-check-${check.id}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{check.name}</span>
                    {!check.required && (
                      <span className="text-xs text-gray-400">(optional)</span>
                    )}
                  </div>
                  {/* Show message for failed checks (AC-2.1.4) */}
                  {!check.passed && check.message && (
                    <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CompliancePanel;
