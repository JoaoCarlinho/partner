/**
 * Payment History Component
 * Displays full payment history for a plan
 */

import React, { useState, useCallback, useEffect } from 'react';

/**
 * Payment history item
 */
interface PaymentHistoryItem {
  paymentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAmount: number;
  paidDate?: string;
  statusClass: 'success' | 'warning' | 'error' | 'neutral';
}

/**
 * Props
 */
interface PaymentHistoryProps {
  planId: string;
  onSelectPayment?: (paymentNumber: number) => void;
  className?: string;
}

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Upcoming',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  MISSED: 'Missed',
  WAIVED: 'Waived',
};

/**
 * Status style mapping
 */
const STATUS_STYLES = {
  success: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  error: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
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

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  planId,
  onSelectPayment,
  className = '',
}) => {
  // State
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'upcoming' | 'overdue'>('all');

  /**
   * Fetch history
   */
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/plans/${planId}/history`);
      if (!response.ok) throw new Error('Failed to load history');

      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * Filter history
   */
  const filteredHistory = history.filter((item) => {
    switch (filter) {
      case 'paid':
        return item.status === 'PAID' || item.status === 'WAIVED';
      case 'upcoming':
        return item.status === 'UPCOMING' || item.status === 'DUE';
      case 'overdue':
        return item.status === 'OVERDUE' || item.status === 'MISSED' || item.status === 'PARTIAL';
      default:
        return true;
    }
  });

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Payment History</h3>
          <span className="text-sm text-gray-500">{history.length} payments</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'paid', 'upcoming', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="divide-y divide-gray-100">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payments found</div>
        ) : (
          filteredHistory.map((item) => {
            const style = STATUS_STYLES[item.statusClass];
            const isPast = new Date(item.dueDate) < new Date();

            return (
              <div
                key={item.paymentNumber}
                onClick={() => onSelectPayment?.(item.paymentNumber)}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  onSelectPayment ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Timeline dot */}
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                    {/* Connector line */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-200" />
                  </div>

                  {/* Payment info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">
                        Payment #{item.paymentNumber}
                      </p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${style.bg} ${style.text}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {isPast ? 'Due' : 'Due'} {formatDate(item.dueDate)}
                        {item.paidDate && (
                          <span className="ml-2 text-green-600">
                            • Paid {formatDate(item.paidDate)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {item.paidAmount > 0 && item.paidAmount < item.amount ? (
                          <span className="text-yellow-600">
                            {formatCurrency(item.paidAmount)} / {formatCurrency(item.amount)}
                          </span>
                        ) : item.paidAmount >= item.amount ? (
                          <span className="text-green-600">{formatCurrency(item.amount)}</span>
                        ) : (
                          <span className="text-gray-900">{formatCurrency(item.amount)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="font-medium text-green-600">
              {history.filter((h) => h.status === 'PAID' || h.status === 'WAIVED').length}
            </p>
            <p className="text-gray-500">Completed</p>
          </div>
          <div>
            <p className="font-medium text-yellow-600">
              {history.filter((h) => h.status === 'OVERDUE' || h.status === 'PARTIAL').length}
            </p>
            <p className="text-gray-500">Overdue</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">
              {history.filter((h) => h.status === 'UPCOMING' || h.status === 'DUE').length}
            </p>
            <p className="text-gray-500">Upcoming</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
