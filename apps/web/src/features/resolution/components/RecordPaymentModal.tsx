/**
 * Record Payment Modal
 * Form for recording external payments
 */

import React, { useState } from 'react';

/**
 * Payment method options
 */
type PaymentMethod = 'check' | 'bank_transfer' | 'cash' | 'other';

/**
 * Scheduled payment data
 */
interface ScheduledPayment {
  id: string;
  scheduledAmount: number;
  dueDate: string;
  paymentNumber: number;
  totalPayments: number;
}

/**
 * Props
 */
interface RecordPaymentModalProps {
  payment: ScheduledPayment;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    paidDate: string;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => Promise<void>;
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
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [paidDate, setPaidDate] = useState(getTodayDate());
  const [paidAmount, setPaidAmount] = useState(payment.scheduledAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const amount = parseFloat(paidAmount);

      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid payment amount');
        setIsSubmitting(false);
        return;
      }

      await onSubmit({
        paidDate,
        paidAmount: amount,
        paymentMethod,
        notes: notes || undefined,
      });

      onClose();
    } catch (err) {
      setError('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = parseFloat(paidAmount) || 0;
  const isPartial = amount > 0 && amount < payment.scheduledAmount;
  const isOverpayment = amount > payment.scheduledAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <p className="text-sm text-gray-500 mt-1">
            Payment {payment.paymentNumber} of {payment.totalPayments}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Scheduled Amount Reference */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Scheduled Amount</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(payment.scheduledAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">Due Date</span>
              <span className="text-sm text-gray-900">{formatDate(payment.dueDate)}</span>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label htmlFor="paidDate" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              id="paidDate"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              max={getTodayDate()}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Amount Paid */}
          <div>
            <label htmlFor="paidAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                id="paidAmount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                step="0.01"
                min="0.01"
                required
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {isPartial && (
              <p className="text-sm text-yellow-600 mt-1">
                This is a partial payment ({formatCurrency(payment.scheduledAmount - amount)}{' '}
                remaining)
              </p>
            )}
            {isOverpayment && (
              <p className="text-sm text-green-600 mt-1">
                This is an overpayment ({formatCurrency(amount - payment.scheduledAmount)} extra)
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Check number, reference ID, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
