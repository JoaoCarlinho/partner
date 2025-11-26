/**
 * Plan Builder Component
 * Main component for creating and configuring payment plans
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AffordabilityIndicator } from './AffordabilityIndicator';
import { PaymentSchedulePreview } from './PaymentSchedulePreview';

/**
 * Payment frequency options
 */
type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/**
 * Financial assessment for affordability
 */
interface FinancialAssessment {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebtPayments: number;
}

/**
 * Affordability result from calculation
 */
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

/**
 * Scheduled payment entry
 */
interface ScheduledPayment {
  paymentNumber: number;
  dueDate: string | Date;
  amount: number;
  status: 'PENDING' | 'PAID' | 'MISSED' | 'PARTIAL';
}

/**
 * Plan calculation result
 */
interface PlanCalculation {
  remainingBalance: number;
  numPayments: number;
  endDate: string;
  schedule: ScheduledPayment[];
  totalWithDownPayment: number;
  durationMonths: number;
  durationWeeks: number;
}

/**
 * Plan builder props
 */
interface PlanBuilderProps {
  demandId: string;
  totalAmount: number;
  debtorFinancials?: FinancialAssessment;
  onPlanCreated?: (planId: string) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Frequency display labels
 */
const FREQUENCY_OPTIONS: { value: Frequency; label: string; description: string }[] = [
  { value: 'WEEKLY', label: 'Weekly', description: 'Every week' },
  { value: 'BIWEEKLY', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly', description: 'Once per month' },
];

/**
 * Preset duration options (in months)
 */
const DURATION_PRESETS = [3, 6, 12, 18, 24];

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
 * Calculate suggested payment based on duration
 */
function calculateSuggestedPayment(
  totalAmount: number,
  downPayment: number,
  frequency: Frequency,
  targetMonths: number
): number {
  const remaining = totalAmount - downPayment;
  const frequencyDays = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30;
  const totalDays = targetMonths * 30;
  const numPayments = Math.ceil(totalDays / frequencyDays);
  return Math.ceil(remaining / numPayments);
}

/**
 * Normalize payment to monthly equivalent
 */
function normalizeToMonthly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'WEEKLY':
      return amount * 4.33;
    case 'BIWEEKLY':
      return amount * 2.17;
    case 'MONTHLY':
      return amount;
    default:
      return amount;
  }
}

/**
 * Calculate affordability locally
 */
function calculateAffordability(
  paymentAmount: number,
  frequency: Frequency,
  assessment: FinancialAssessment
): AffordabilityResult {
  const monthlyPayment = normalizeToMonthly(paymentAmount, frequency);
  const disposableIncome = assessment.monthlyIncome - assessment.monthlyExpenses - assessment.existingDebtPayments;
  const paymentToIncomeRatio = (monthlyPayment / assessment.monthlyIncome) * 100;
  const disposableUsedPercent = disposableIncome > 0 ? (monthlyPayment / disposableIncome) * 100 : 100;

  let viabilityScore = 100;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let recommendation: 'recommended' | 'caution' | 'not_recommended' = 'recommended';
  const factors: AffordabilityResult['factors'] = [];

  // Payment to income ratio scoring
  if (paymentToIncomeRatio > 20) {
    viabilityScore -= 40;
    factors.push({ name: 'Income Ratio', impact: 'negative', description: 'Payment exceeds 20% of income' });
  } else if (paymentToIncomeRatio > 10) {
    viabilityScore -= 20;
    factors.push({ name: 'Income Ratio', impact: 'neutral', description: 'Payment is 10-20% of income' });
  } else {
    factors.push({ name: 'Income Ratio', impact: 'positive', description: 'Payment is under 10% of income' });
  }

  // Disposable income scoring
  if (disposableUsedPercent > 80) {
    viabilityScore -= 40;
    factors.push({ name: 'Disposable Income', impact: 'negative', description: 'Uses over 80% of disposable income' });
  } else if (disposableUsedPercent > 50) {
    viabilityScore -= 20;
    factors.push({ name: 'Disposable Income', impact: 'neutral', description: 'Uses 50-80% of disposable income' });
  } else {
    factors.push({ name: 'Disposable Income', impact: 'positive', description: 'Uses under 50% of disposable income' });
  }

  // Determine risk level
  if (viabilityScore >= 70) {
    riskLevel = 'low';
    recommendation = 'recommended';
  } else if (viabilityScore >= 40) {
    riskLevel = 'medium';
    recommendation = 'caution';
  } else {
    riskLevel = 'high';
    recommendation = 'not_recommended';
  }

  const explanations = {
    recommended: 'This payment plan fits well within the debtor\'s financial capacity.',
    caution: 'This plan may be challenging. Consider adjusting the terms.',
    not_recommended: 'This plan exceeds recommended affordability thresholds.',
  };

  return {
    viabilityScore: Math.max(0, Math.min(100, viabilityScore)),
    riskLevel,
    paymentToIncomeRatio: Math.round(paymentToIncomeRatio * 10) / 10,
    disposableIncomeUsed: Math.round(disposableUsedPercent * 10) / 10,
    disposableIncome: Math.round(disposableIncome * 100) / 100,
    recommendation,
    explanation: explanations[recommendation],
    factors,
  };
}

export const PlanBuilder: React.FC<PlanBuilderProps> = ({
  demandId,
  totalAmount,
  debtorFinancials,
  onPlanCreated,
  onCancel,
  className = '',
}) => {
  // Form state
  const [downPayment, setDownPayment] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default to 1 week from now
    return date.toISOString().split('T')[0];
  });

  // UI state
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<PlanCalculation | null>(null);
  const [affordability, setAffordability] = useState<AffordabilityResult | null>(null);

  // Derived values
  const remainingBalance = totalAmount - downPayment;
  const downPaymentPercent = totalAmount > 0 ? (downPayment / totalAmount) * 100 : 0;

  /**
   * Handle preset duration selection
   */
  const handlePresetSelect = useCallback((months: number) => {
    const suggested = calculateSuggestedPayment(totalAmount, downPayment, frequency, months);
    setPaymentAmount(suggested);
  }, [totalAmount, downPayment, frequency]);

  /**
   * Calculate plan details
   */
  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setError(null);

    try {
      // Call API to calculate plan
      const response = await fetch('/api/plans/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAmount,
          downPayment,
          paymentAmount,
          frequency,
          startDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errors?.join(', ') || 'Failed to calculate plan');
      }

      const data = await response.json();
      setCalculation(data);

      // Calculate affordability if financials available
      if (debtorFinancials) {
        const afford = calculateAffordability(paymentAmount, frequency, debtorFinancials);
        setAffordability(afford);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  }, [totalAmount, downPayment, paymentAmount, frequency, startDate, debtorFinancials]);

  /**
   * Submit plan proposal
   */
  const handleSubmit = useCallback(async () => {
    if (!calculation) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demandId,
          totalAmount,
          downPayment,
          paymentAmount,
          frequency,
          startDate,
          numPayments: calculation.numPayments,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create plan');
      }

      const data = await response.json();
      onPlanCreated?.(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  }, [calculation, demandId, totalAmount, downPayment, paymentAmount, frequency, startDate, onPlanCreated]);

  /**
   * Validation
   */
  const validation = useMemo(() => {
    const errors: string[] = [];

    if (downPayment < 0) errors.push('Down payment cannot be negative');
    if (downPayment >= totalAmount) errors.push('Down payment cannot exceed total');
    if (paymentAmount <= 0) errors.push('Payment amount must be positive');
    if (paymentAmount > remainingBalance) errors.push('Payment exceeds remaining balance');

    const numPayments = Math.ceil(remainingBalance / paymentAmount);
    if (numPayments > 120) errors.push('Plan duration exceeds 10 years');

    return { valid: errors.length === 0, errors };
  }, [downPayment, paymentAmount, totalAmount, remainingBalance]);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Create Payment Plan</h2>
        <p className="text-sm text-gray-600 mt-1">
          Total debt: {formatCurrency(totalAmount)}
        </p>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Down Payment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Down Payment
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <span className="text-sm text-gray-500 w-16">
              {downPaymentPercent.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={totalAmount}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="w-full mt-2"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>$0</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Frequency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFrequency(opt.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  frequency === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount
          </label>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="1"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter amount"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">Quick select:</span>
            {DURATION_PRESETS.map((months) => (
              <button
                key={months}
                onClick={() => handlePresetSelect(months)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {months} mo
              </button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Payment Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Validation errors */}
        {!validation.valid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={!validation.valid || isCalculating}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? 'Calculating...' : 'Calculate Plan'}
        </button>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {calculation && (
        <div className="border-t border-gray-200 p-6 space-y-6">
          {/* Affordability indicator */}
          {affordability && (
            <AffordabilityIndicator
              affordability={affordability}
              showDetails={true}
            />
          )}

          {/* Payment schedule */}
          <PaymentSchedulePreview
            schedule={calculation.schedule}
            totalAmount={calculation.totalWithDownPayment}
            downPayment={downPayment}
          />

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Plan Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <span className="float-right font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div>
                <span className="text-gray-600">Down Payment:</span>
                <span className="float-right font-medium">{formatCurrency(downPayment)}</span>
              </div>
              <div>
                <span className="text-gray-600">Remaining:</span>
                <span className="float-right font-medium">{formatCurrency(remainingBalance)}</span>
              </div>
              <div>
                <span className="text-gray-600">Payments:</span>
                <span className="float-right font-medium">
                  {calculation.numPayments} × {formatCurrency(paymentAmount)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Duration:</span>
                <span className="float-right font-medium">
                  {calculation.durationMonths} months ({calculation.durationWeeks} weeks)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (affordability?.recommendation === 'not_recommended')}
              className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Propose Plan'}
            </button>
          </div>

          {affordability?.recommendation === 'not_recommended' && (
            <p className="text-sm text-red-600 text-center">
              Plan cannot be proposed due to affordability concerns. Please adjust the terms.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanBuilder;
