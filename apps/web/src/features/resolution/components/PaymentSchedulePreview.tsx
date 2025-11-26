/**
 * Payment Schedule Preview Component
 * Shows upcoming payment dates and amounts
 */

import React, { useState } from 'react';

interface ScheduledPayment {
  paymentNumber: number;
  dueDate: string | Date;
  amount: number;
  status: 'PENDING' | 'PAID' | 'MISSED' | 'PARTIAL';
}

interface PaymentSchedulePreviewProps {
  schedule: ScheduledPayment[];
  totalAmount: number;
  downPayment: number;
  className?: string;
}

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
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const PaymentSchedulePreview: React.FC<PaymentSchedulePreviewProps> = ({
  schedule,
  totalAmount,
  downPayment,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('summary');
  const [showAll, setShowAll] = useState(false);

  // Calculate totals
  const scheduledTotal = schedule.reduce((sum, p) => sum + p.amount, 0);
  const totalWithDown = scheduledTotal + downPayment;

  // Display first 5 or all
  const displaySchedule = showAll ? schedule : schedule.slice(0, 5);
  const hasMore = schedule.length > 5;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Payment Schedule</h3>
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded ${
                viewMode === 'summary' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === 'summary' ? (
          /* Summary view */
          <div className="space-y-4">
            {/* Visual timeline */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Start</span>
                <span className="text-xs text-gray-500">End</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-700">
                  {schedule.length > 0 && formatDate(schedule[0].dueDate)}
                </span>
                <span className="text-xs text-gray-700">
                  {schedule.length > 0 && formatDate(schedule[schedule.length - 1].dueDate)}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Payments</p>
                <p className="text-xl font-bold text-gray-900">{schedule.length}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Each Payment</p>
                <p className="text-xl font-bold text-gray-900">
                  {schedule.length > 0 && formatCurrency(schedule[0].amount)}
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="border-t border-gray-200 pt-3">
              {downPayment > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Down Payment</span>
                  <span className="font-medium">{formatCurrency(downPayment)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {schedule.length} payments of {schedule.length > 0 && formatCurrency(schedule[0].amount)}
                </span>
                <span className="font-medium">{formatCurrency(scheduledTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(totalWithDown)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* List view */
          <div className="space-y-2">
            {downPayment > 0 && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full text-sm font-medium text-blue-700">
                    ↓
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Down Payment</p>
                    <p className="text-xs text-gray-500">Due at agreement</p>
                  </div>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(downPayment)}</span>
              </div>
            )}

            {displaySchedule.map((payment) => (
              <div
                key={payment.paymentNumber}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                    {payment.paymentNumber}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Payment #{payment.paymentNumber}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(payment.dueDate)}</p>
                  </div>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(payment.amount)}</span>
              </div>
            ))}

            {hasMore && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Show all {schedule.length} payments
              </button>
            )}

            {showAll && hasMore && (
              <button
                onClick={() => setShowAll(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Show less
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSchedulePreview;
