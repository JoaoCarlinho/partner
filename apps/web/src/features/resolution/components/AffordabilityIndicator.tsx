/**
 * Affordability Indicator Component
 * Visual display of payment plan affordability
 */

import React from 'react';

interface AffordabilityResult {
  viabilityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  paymentToIncomeRatio: number;
  disposableIncomeUsed: number;
  disposableIncome: number;
  recommendation: 'recommended' | 'caution' | 'not_recommended';
  explanation: string;
  factors?: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
}

interface AffordabilityIndicatorProps {
  affordability: AffordabilityResult;
  showDetails?: boolean;
  className?: string;
}

/**
 * Risk level colors and labels
 */
const RISK_CONFIG = {
  low: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    barColor: 'bg-green-500',
    icon: '✓',
    label: 'Low Risk',
  },
  medium: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-500',
    barColor: 'bg-yellow-500',
    icon: '⚠',
    label: 'Medium Risk',
  },
  high: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500',
    barColor: 'bg-red-500',
    icon: '✕',
    label: 'High Risk',
  },
};

/**
 * Factor impact icon
 */
const FactorIcon: React.FC<{ impact: 'positive' | 'negative' | 'neutral' }> = ({ impact }) => {
  switch (impact) {
    case 'positive':
      return <span className="text-green-600">+</span>;
    case 'negative':
      return <span className="text-red-600">−</span>;
    default:
      return <span className="text-gray-400">○</span>;
  }
};

export const AffordabilityIndicator: React.FC<AffordabilityIndicatorProps> = ({
  affordability,
  showDetails = false,
  className = '',
}) => {
  const config = RISK_CONFIG[affordability.riskLevel];

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xl ${config.color}`}>{config.icon}</span>
          <span className={`font-medium ${config.color}`}>{config.label}</span>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${config.color}`}>
            {affordability.viabilityScore}
          </span>
          <span className="text-sm text-gray-500">/100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-2 ${config.barColor} transition-all duration-500`}
            style={{ width: `${affordability.viabilityScore}%` }}
          />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-sm">
          <span className="text-gray-600">Income used:</span>
          <span className={`ml-1 font-medium ${config.color}`}>
            {affordability.paymentToIncomeRatio}%
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600">Disposable used:</span>
          <span className={`ml-1 font-medium ${config.color}`}>
            {affordability.disposableIncomeUsed}%
          </span>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-700">{affordability.explanation}</p>

      {/* Detailed factors */}
      {showDetails && affordability.factors && affordability.factors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Factors</p>
          <div className="space-y-2">
            {affordability.factors.map((factor, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <FactorIcon impact={factor.impact} />
                <div>
                  <span className="font-medium text-gray-800">{factor.name}:</span>
                  <span className="text-gray-600 ml-1">{factor.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation badge */}
      <div className="mt-3 flex items-center justify-center">
        {affordability.recommendation === 'recommended' && (
          <span className="px-3 py-1 bg-green-200 text-green-800 text-sm rounded-full font-medium">
            Recommended
          </span>
        )}
        {affordability.recommendation === 'caution' && (
          <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-sm rounded-full font-medium">
            Proceed with Caution
          </span>
        )}
        {affordability.recommendation === 'not_recommended' && (
          <span className="px-3 py-1 bg-red-200 text-red-800 text-sm rounded-full font-medium">
            Consider Lower Amount
          </span>
        )}
      </div>
    </div>
  );
};

export default AffordabilityIndicator;
