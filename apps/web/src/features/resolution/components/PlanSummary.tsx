/**
 * Plan Summary Component
 * Displays a compact summary of an existing payment plan
 */

import React from 'react';

/**
 * Plan status types
 */
type PlanStatus = 'PROPOSED' | 'COUNTERED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';

/**
 * Payment frequency
 */
type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/**
 * Plan data structure
 */
interface Plan {
  id: string;
  demandId: string;
  status: PlanStatus;
  totalAmount: number;
  downPayment: number;
  paymentAmount: number;
  frequency: Frequency;
  numPayments: number;
  startDate: string;
  endDate: string;
  paidPayments: number;
  remainingBalance: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Props
 */
interface PlanSummaryProps {
  plan: Plan;
  onViewDetails?: () => void;
  onAccept?: () => void;
  onCounter?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  className?: string;
}

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<PlanStatus, { color: string; bgColor: string; label: string }> = {
  PROPOSED: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Proposed' },
  COUNTERED: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Counter Proposed' },
  ACCEPTED: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Accepted' },
  ACTIVE: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Active' },
  COMPLETED: { color: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Completed' },
  DEFAULTED: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Defaulted' },
};

/**
 * Frequency labels
 */
const FREQUENCY_LABELS: Record<Frequency, string> = {
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
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const PlanSummary: React.FC<PlanSummaryProps> = ({
  plan,
  onViewDetails,
  onAccept,
  onCounter,
  onReject,
  showActions = false,
  className = '',
}) => {
  const statusConfig = STATUS_CONFIG[plan.status];
  const progressPercent = plan.numPayments > 0
    ? (plan.paidPayments / plan.numPayments) * 100
    : 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            <span className="text-sm text-gray-500">
              Created {formatDate(plan.createdAt)}
            </span>
          </div>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View Details →
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Amount breakdown */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(plan.totalAmount)}
          </span>
          <span className="text-sm text-gray-500">total</span>
        </div>

        {/* Payment details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payment</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(plan.paymentAmount)}
            </p>
            <p className="text-sm text-gray-600">{FREQUENCY_LABELS[plan.frequency]}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Down Payment</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(plan.downPayment)}
            </p>
            <p className="text-sm text-gray-600">due at signing</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <span>{formatDate(plan.startDate)}</span>
          <span className="flex-1 border-t border-gray-300 border-dashed" />
          <span>{plan.numPayments} payments</span>
          <span className="flex-1 border-t border-gray-300 border-dashed" />
          <span>{formatDate(plan.endDate)}</span>
        </div>

        {/* Progress (for active/completed plans) */}
        {(plan.status === 'ACTIVE' || plan.status === 'COMPLETED') && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                {plan.paidPayments} of {plan.numPayments} payments
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-green-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Paid: {formatCurrency(plan.totalAmount - plan.remainingBalance)}</span>
              <span>Remaining: {formatCurrency(plan.remainingBalance)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (plan.status === 'PROPOSED' || plan.status === 'COUNTERED') && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            {onReject && (
              <button
                onClick={onReject}
                className="flex-1 py-2 px-4 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                Reject
              </button>
            )}
            {onCounter && (
              <button
                onClick={onCounter}
                className="flex-1 py-2 px-4 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium"
              >
                Counter
              </button>
            )}
            {onAccept && (
              <button
                onClick={onAccept}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Accept
              </button>
            )}
          </div>
        </div>
      )}

      {/* Defaulted warning */}
      {plan.status === 'DEFAULTED' && (
        <div className="p-4 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-700">
            This plan has been defaulted. The remaining balance of {formatCurrency(plan.remainingBalance)} is due.
          </p>
        </div>
      )}

      {/* Completed message */}
      {plan.status === 'COMPLETED' && (
        <div className="p-4 bg-green-50 border-t border-green-100">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <span>✓</span>
            Payment plan completed successfully!
          </p>
        </div>
      )}
    </div>
  );
};

export default PlanSummary;
