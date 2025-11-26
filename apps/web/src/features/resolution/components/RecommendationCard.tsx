/**
 * Recommendation Card Component
 * Displays a single plan recommendation with details
 */

import React from 'react';

/**
 * Plan recommendation data
 */
interface PlanRecommendation {
  name: string;
  downPayment: number;
  downPaymentPercent: number;
  paymentAmount: number;
  frequency: string;
  estimatedPayments: number;
  estimatedDurationMonths: number;
  paymentToIncomeRatio: number;
  disposableUsedPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  pros: string[];
  cons: string[];
  bestFor: string;
}

/**
 * Props
 */
interface RecommendationCardProps {
  recommendation: PlanRecommendation;
  isSelected?: boolean;
  isSuggested?: boolean;
  onSelect?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * Risk level styling
 */
const RISK_STYLES = {
  low: {
    badge: 'bg-green-100 text-green-700',
    border: 'border-green-200',
    icon: '✓',
  },
  medium: {
    badge: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-200',
    icon: '⚠',
  },
  high: {
    badge: 'bg-red-100 text-red-700',
    border: 'border-red-200',
    icon: '!',
  },
};

/**
 * Frequency labels
 */
const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'bi-weekly',
  MONTHLY: 'monthly',
};

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  isSelected = false,
  isSuggested = false,
  onSelect,
  showDetails = true,
  className = '',
}) => {
  const riskStyle = RISK_STYLES[recommendation.riskLevel];

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 transition-all cursor-pointer
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
        ${className}
      `}
      onClick={onSelect}
    >
      {/* Suggested badge */}
      {isSuggested && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
          Recommended
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{recommendation.name}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded ${riskStyle.badge}`}>
          {riskStyle.icon} {recommendation.riskLevel} risk
        </span>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Payment</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(recommendation.paymentAmount)}
          </p>
          <p className="text-sm text-gray-600">
            {FREQUENCY_LABELS[recommendation.frequency] || recommendation.frequency}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Duration</p>
          <p className="text-2xl font-bold text-gray-900">
            {recommendation.estimatedDurationMonths}
          </p>
          <p className="text-sm text-gray-600">months</p>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
        <div>
          <p className="text-xs text-gray-500">Down Payment</p>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(recommendation.downPayment)}{' '}
            <span className="text-gray-500">({recommendation.downPaymentPercent}%)</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500"># of Payments</p>
          <p className="text-sm font-medium text-gray-900">
            {recommendation.estimatedPayments}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Income Used</p>
          <p className="text-sm font-medium text-gray-900">
            {recommendation.paymentToIncomeRatio}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Disposable Used</p>
          <p className="text-sm font-medium text-gray-900">
            {recommendation.disposableUsedPercent}%
          </p>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <>
          {/* Pros */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Pros</p>
            <ul className="space-y-1">
              {recommendation.pros.map((pro, i) => (
                <li key={i} className="text-sm text-green-700 flex items-start gap-1">
                  <span className="text-green-500">+</span>
                  {pro}
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Cons</p>
            <ul className="space-y-1">
              {recommendation.cons.map((con, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-1">
                  <span className="text-red-500">−</span>
                  {con}
                </li>
              ))}
            </ul>
          </div>

          {/* Best for */}
          <div className="p-2 bg-gray-100 rounded text-sm text-gray-700">
            <span className="font-medium">Best for:</span> {recommendation.bestFor}
          </div>
        </>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">✓</span>
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;
