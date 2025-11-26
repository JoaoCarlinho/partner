/**
 * Payment Dashboard Component
 * Main dashboard for tracking payment plan progress
 */

import React, { useState, useCallback, useEffect } from 'react';

/**
 * Payment summary data
 */
interface PaymentSummary {
  planId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  completedPayments: number;
  totalPayments: number;
  missedPayments: number;
  currentPayment?: TrackedPayment;
  nextPayment?: TrackedPayment;
  overduePayments: TrackedPayment[];
  planHealth: 'good' | 'at_risk' | 'defaulted';
  completionPercent: number;
  onTrackForCompletion: boolean;
}

/**
 * Tracked payment data
 */
interface TrackedPayment {
  id: string;
  planId: string;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAmount: number;
  paidDate?: string;
  daysOverdue: number;
}

/**
 * Props
 */
interface PaymentDashboardProps {
  planId: string;
  userRole: 'creditor' | 'debtor';
  onMakePayment?: (paymentId: string) => void;
  className?: string;
}

/**
 * Health indicator styles
 */
const HEALTH_STYLES = {
  good: { bg: 'bg-green-100', text: 'text-green-700', label: 'On Track' },
  at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'At Risk' },
  defaulted: { bg: 'bg-red-100', text: 'text-red-700', label: 'Defaulted' },
};

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const PaymentDashboard: React.FC<PaymentDashboardProps> = ({
  planId,
  userRole,
  onMakePayment,
  className = '',
}) => {
  // State
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch summary data
   */
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/payments/plans/${planId}/summary`);
      if (!response.ok) throw new Error('Failed to load payment data');

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchSummary();
    // Refresh every minute
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2" />
        <p className="text-gray-600">Loading payment data...</p>
      </div>
    );
  }

  // Error state
  if (error || !summary) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <p className="text-red-600">{error || 'Failed to load payment data'}</p>
        <button onClick={fetchSummary} className="mt-2 text-blue-600 hover:text-blue-800">
          Try again
        </button>
      </div>
    );
  }

  const healthStyle = HEALTH_STYLES[summary.planHealth];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header with health indicator */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Payment Plan Progress</h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${healthStyle.bg} ${healthStyle.text}`}>
              {healthStyle.label}
            </span>
          </div>
        </div>

        {/* Progress section */}
        <div className="p-4">
          {/* Amount progress */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Total Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(summary.paidAmount)} / {formatCurrency(summary.totalAmount)}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-3 transition-all duration-500 ${
                  summary.planHealth === 'good'
                    ? 'bg-green-500'
                    : summary.planHealth === 'at_risk'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${(summary.paidAmount / summary.totalAmount) * 100}%` }}
              />
            </div>
          </div>

          {/* Payment count progress */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Payments</span>
              <span className="text-sm font-medium text-gray-900">
                {summary.completedPayments} / {summary.totalPayments}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-blue-500 transition-all duration-500"
                style={{ width: `${summary.completionPercent}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{summary.completedPayments}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalPayments - summary.completedPayments - summary.missedPayments}
              </p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${summary.missedPayments > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {summary.missedPayments}
              </p>
              <p className="text-xs text-gray-500">Missed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current/Next Payment card */}
      {(summary.currentPayment || summary.nextPayment) && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">
              {summary.currentPayment ? 'Current Payment Due' : 'Next Payment'}
            </h4>
          </div>
          <div className="p-4">
            {(() => {
              const payment = summary.currentPayment || summary.nextPayment;
              if (!payment) return null;

              const isDue = payment.status === 'DUE';
              const isOverdue = payment.status === 'OVERDUE';

              return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(payment.amount - payment.paidAmount)}
                    </p>
                    <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      {isOverdue
                        ? `Overdue since ${formatDate(payment.dueDate)}`
                        : isDue
                          ? 'Due today'
                          : `Due ${formatDate(payment.dueDate)}`}
                    </p>
                    {payment.paidAmount > 0 && (
                      <p className="text-xs text-gray-500">
                        ({formatCurrency(payment.paidAmount)} already paid)
                      </p>
                    )}
                  </div>
                  {userRole === 'debtor' && (isDue || isOverdue) && onMakePayment && (
                    <button
                      onClick={() => onMakePayment(payment.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Overdue payments alert */}
      {summary.overduePayments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">
            Overdue Payments ({summary.overduePayments.length})
          </h4>
          <div className="space-y-2">
            {summary.overduePayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-2 bg-white rounded border border-red-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Payment #{payment.paymentNumber}
                  </p>
                  <p className="text-xs text-red-600">Due {formatDate(payment.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(payment.amount - payment.paidAmount)}
                  </p>
                  {payment.daysOverdue > 0 && (
                    <p className="text-xs text-red-600">{payment.daysOverdue} days overdue</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining balance */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Remaining Balance</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.remainingAmount)}</p>
          </div>
          {summary.onTrackForCompletion && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
              On track
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;
