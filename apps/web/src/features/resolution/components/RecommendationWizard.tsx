/**
 * Recommendation Wizard Component
 * Multi-step flow for getting AI plan recommendations
 */

import React, { useState, useCallback } from 'react';
import { RecommendationCard } from './RecommendationCard';

/**
 * Financial input data
 */
interface FinancialInput {
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebtPayments: number;
  preferredFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  maxDurationMonths?: number;
  notes?: string;
}

/**
 * Plan recommendation
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
 * Recommendation result
 */
interface RecommendationResult {
  sessionId: string;
  analysis: {
    affordabilityAssessment: string;
    riskFactors: string[];
    strengths: string[];
  };
  recommendations: PlanRecommendation[];
  suggestedPlan: string;
  suggestedReason: string;
  generatedBy: 'ai' | 'fallback';
}

/**
 * Props
 */
interface RecommendationWizardProps {
  totalDebt: number;
  onPlanSelected?: (plan: PlanRecommendation) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Wizard steps
 */
type WizardStep = 'input' | 'loading' | 'results' | 'refine';

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

export const RecommendationWizard: React.FC<RecommendationWizardProps> = ({
  totalDebt,
  onPlanSelected,
  onCancel,
  className = '',
}) => {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('input');
  const [error, setError] = useState<string | null>(null);

  // Input state
  const [input, setInput] = useState<FinancialInput>({
    totalDebt,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    existingDebtPayments: 0,
    preferredFrequency: undefined,
    maxDurationMonths: undefined,
    notes: '',
  });

  // Results state
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanRecommendation | null>(null);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (field: keyof FinancialInput, value: number | string | undefined) => {
      setInput((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Fetch recommendations
   */
  const fetchRecommendations = useCallback(async () => {
    setStep('loading');
    setError(null);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get recommendations');
      }

      const data = await response.json();
      setResult(data);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
      setStep('input');
    }
  }, [input]);

  /**
   * Handle plan selection
   */
  const handleSelectPlan = useCallback(
    (plan: PlanRecommendation) => {
      setSelectedPlan(plan);
    },
    []
  );

  /**
   * Confirm selection
   */
  const confirmSelection = useCallback(() => {
    if (selectedPlan && onPlanSelected) {
      onPlanSelected(selectedPlan);
    }
  }, [selectedPlan, onPlanSelected]);

  /**
   * Calculate disposable income
   */
  const disposableIncome =
    input.monthlyIncome - input.monthlyExpenses - input.existingDebtPayments;

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {step === 'input' && 'Get Plan Recommendations'}
          {step === 'loading' && 'Analyzing Your Situation...'}
          {step === 'results' && 'Recommended Plans'}
          {step === 'refine' && 'Refine Your Plan'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Debt amount: {formatCurrency(totalDebt)}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Input */}
        {step === 'input' && (
          <div className="space-y-6">
            {/* Income */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Income (after taxes)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  value={input.monthlyIncome || ''}
                  onChange={(e) => handleInputChange('monthlyIncome', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="4,000"
                />
              </div>
            </div>

            {/* Expenses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Expenses (rent, utilities, food, etc.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  value={input.monthlyExpenses || ''}
                  onChange={(e) => handleInputChange('monthlyExpenses', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="2,500"
                />
              </div>
            </div>

            {/* Existing debt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Monthly Debt Payments
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  value={input.existingDebtPayments || ''}
                  onChange={(e) => handleInputChange('existingDebtPayments', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="300"
                />
              </div>
            </div>

            {/* Disposable income preview */}
            {input.monthlyIncome > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Estimated disposable income:{' '}
                  <span
                    className={`font-semibold ${
                      disposableIncome > 500
                        ? 'text-green-600'
                        : disposableIncome > 200
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(Math.max(0, disposableIncome))}/month
                  </span>
                </p>
              </div>
            )}

            {/* Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Payment Frequency (optional)
              </label>
              <div className="flex gap-2">
                {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() =>
                      handleInputChange(
                        'preferredFrequency',
                        input.preferredFrequency === freq ? undefined : freq
                      )
                    }
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      input.preferredFrequency === freq
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {freq === 'WEEKLY'
                      ? 'Weekly'
                      : freq === 'BIWEEKLY'
                        ? 'Bi-weekly'
                        : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (optional)
              </label>
              <textarea
                value={input.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="e.g., seasonal income, upcoming financial changes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={fetchRecommendations}
                disabled={input.monthlyIncome <= 0}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Get Recommendations
              </button>
            </div>
          </div>
        )}

        {/* Step: Loading */}
        {step === 'loading' && (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-gray-600">Analyzing your financial situation...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && result && (
          <div className="space-y-6">
            {/* Analysis summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Financial Analysis</h4>
              <p className="text-sm text-gray-700 mb-3">{result.analysis.affordabilityAssessment}</p>

              {result.analysis.strengths.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-green-700">Strengths:</p>
                  <ul className="text-xs text-green-600">
                    {result.analysis.strengths.map((s, i) => (
                      <li key={i}>+ {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis.riskFactors.length > 0 &&
                result.analysis.riskFactors[0] !== 'No significant risk factors identified' && (
                  <div>
                    <p className="text-xs font-medium text-red-700">Risk Factors:</p>
                    <ul className="text-xs text-red-600">
                      {result.analysis.riskFactors.map((r, i) => (
                        <li key={i}>- {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {result.generatedBy === 'fallback' && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  * Recommendations generated using standard calculations
                </p>
              )}
            </div>

            {/* Recommendations */}
            <div className="grid gap-4">
              {result.recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.name}
                  recommendation={rec}
                  isSelected={selectedPlan?.name === rec.name}
                  isSuggested={result.suggestedPlan === rec.name}
                  onSelect={() => handleSelectPlan(rec)}
                />
              ))}
            </div>

            {/* Suggested reason */}
            {result.suggestedPlan && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Why {result.suggestedPlan}?</span>{' '}
                  {result.suggestedReason}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Adjust Inputs
              </button>
              <button
                onClick={confirmSelection}
                disabled={!selectedPlan}
                className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Use Selected Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationWizard;
