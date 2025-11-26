/**
 * Counter Offer Form Component
 * Form for debtors to submit counter-proposals
 */

import React, { useState, useCallback, useMemo } from 'react';

/**
 * Current proposal data
 */
interface CurrentProposal {
  downPayment: number;
  paymentAmount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  numPayments: number;
  startDate: string;
}

/**
 * Props
 */
interface CounterOfferFormProps {
  currentProposal: CurrentProposal;
  totalAmount: number;
  onSubmit: (counterOffer: CurrentProposal & { reason: string }) => void;
  onAccept: () => void;
  onCancel?: () => void;
  debtorConstraints?: {
    maxPaymentAmount: number;
    maxDownPayment: number;
  };
  className?: string;
}

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
 * Frequency options
 */
const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY' as const, label: 'Weekly' },
  { value: 'BIWEEKLY' as const, label: 'Bi-weekly' },
  { value: 'MONTHLY' as const, label: 'Monthly' },
];

export const CounterOfferForm: React.FC<CounterOfferFormProps> = ({
  currentProposal,
  totalAmount,
  onSubmit,
  onAccept,
  onCancel,
  debtorConstraints,
  className = '',
}) => {
  // Form state - start with current proposal values
  const [downPayment, setDownPayment] = useState(currentProposal.downPayment);
  const [paymentAmount, setPaymentAmount] = useState(currentProposal.paymentAmount);
  const [frequency, setFrequency] = useState(currentProposal.frequency);
  const [startDate, setStartDate] = useState(currentProposal.startDate);
  const [reason, setReason] = useState('');

  // Track if user has made changes
  const hasChanges = useMemo(() => {
    return (
      downPayment !== currentProposal.downPayment ||
      paymentAmount !== currentProposal.paymentAmount ||
      frequency !== currentProposal.frequency ||
      startDate !== currentProposal.startDate
    );
  }, [downPayment, paymentAmount, frequency, startDate, currentProposal]);

  // Calculate estimated payments
  const remaining = totalAmount - downPayment;
  const numPayments = paymentAmount > 0 ? Math.ceil(remaining / paymentAmount) : 0;

  // Calculate change indicators
  const downPaymentChange = downPayment - currentProposal.downPayment;
  const paymentAmountChange = paymentAmount - currentProposal.paymentAmount;

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasChanges) return;

      onSubmit({
        downPayment,
        paymentAmount,
        frequency,
        numPayments,
        startDate,
        reason: reason.trim() || 'Counter-offer submitted',
      });
    },
    [downPayment, paymentAmount, frequency, numPayments, startDate, reason, hasChanges, onSubmit]
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Respond to Proposal</h3>
        <p className="text-sm text-gray-600 mt-1">
          Total debt: {formatCurrency(totalAmount)}
        </p>
      </div>

      {/* Current proposal summary */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <p className="text-sm font-medium text-blue-800 mb-2">Current Proposal</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-blue-600">Payment:</span>
            <span className="ml-1 font-medium text-blue-900">
              {formatCurrency(currentProposal.paymentAmount)} {currentProposal.frequency.toLowerCase()}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Down Payment:</span>
            <span className="ml-1 font-medium text-blue-900">
              {formatCurrency(currentProposal.downPayment)}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Payments:</span>
            <span className="ml-1 font-medium text-blue-900">{currentProposal.numPayments}</span>
          </div>
          <div>
            <span className="text-blue-600">Start Date:</span>
            <span className="ml-1 font-medium text-blue-900">
              {new Date(currentProposal.startDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Counter form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Down Payment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment
            {downPaymentChange !== 0 && (
              <span
                className={`ml-2 text-xs ${downPaymentChange > 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ({downPaymentChange > 0 ? '+' : ''}{formatCurrency(downPaymentChange)})
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              max={debtorConstraints?.maxDownPayment || totalAmount}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount
            {paymentAmountChange !== 0 && (
              <span
                className={`ml-2 text-xs ${paymentAmountChange > 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ({paymentAmountChange > 0 ? '+' : ''}{formatCurrency(paymentAmountChange)})
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="1"
              max={debtorConstraints?.maxPaymentAmount || remaining}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  frequency === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate.split('T')[0]}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Estimated summary */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Your Counter-Offer</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(downPayment)} down + {numPayments} payments of{' '}
            {formatCurrency(paymentAmount)} ({frequency.toLowerCase()})
          </p>
          <p className="text-sm text-gray-600">
            Total: {formatCurrency(downPayment + paymentAmount * numPayments)}
          </p>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Counter (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            placeholder="Explain why you're requesting different terms..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Accept Proposal
          </button>
          <button
            type="submit"
            disabled={!hasChanges}
            className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Counter Offer
          </button>
        </div>
      </form>
    </div>
  );
};

export default CounterOfferForm;
