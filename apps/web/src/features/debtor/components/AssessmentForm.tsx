/**
 * Assessment Form Component
 * Alternative structured form for financial assessment
 */

import React, { useState } from 'react';

// Income ranges
const INCOME_RANGES = [
  { value: 'under_1500', label: 'Under $1,500/month' },
  { value: '1500_3000', label: '$1,500 - $3,000/month' },
  { value: '3000_5000', label: '$3,000 - $5,000/month' },
  { value: '5000_7500', label: '$5,000 - $7,500/month' },
  { value: 'over_7500', label: 'Over $7,500/month' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

// Expense categories
const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Housing (rent/mortgage)', icon: '🏠' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'food', label: 'Food/groceries', icon: '🛒' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'childcare', label: 'Childcare', icon: '👶' },
  { value: 'other', label: 'Other essentials', icon: '📦' },
];

// Obligation types
const OBLIGATION_TYPES = [
  { value: 'other_collections', label: 'Other collections' },
  { value: 'credit_cards', label: 'Credit cards' },
  { value: 'medical_bills', label: 'Medical bills' },
  { value: 'student_loans', label: 'Student loans' },
  { value: 'auto_loans', label: 'Auto loans' },
  { value: 'other', label: 'Other' },
];

// Stress levels
const STRESS_LEVELS = [
  { value: 1, label: 'Very stressed', emoji: '😟' },
  { value: 2, label: 'Quite stressed', emoji: '😕' },
  { value: 3, label: 'Somewhat stressed', emoji: '😐' },
  { value: 4, label: 'A little stressed', emoji: '🙂' },
  { value: 5, label: 'Managing okay', emoji: '😊' },
];

interface AssessmentFormData {
  incomeRange: string;
  expenseCategories: string[];
  expenseNotes: string;
  otherObligations: string[];
  obligationNotes: string;
  stressLevel: number | null;
  additionalNotes: string;
}

interface AssessmentFormProps {
  onSubmit: (data: AssessmentFormData) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

/**
 * Section header component
 */
const SectionHeader: React.FC<{ title: string; description: string; optional?: boolean }> = ({
  title,
  description,
  optional = false,
}) => (
  <div className="mb-4">
    <h3 className="text-lg font-medium text-gray-900">
      {title}
      {optional && <span className="ml-2 text-sm font-normal text-gray-400">(Optional)</span>}
    </h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

/**
 * Checkbox group component
 */
const CheckboxGroup: React.FC<{
  options: Array<{ value: string; label: string; icon?: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}> = ({ options, selected, onChange }) => {
  const toggleOption = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
            selected.includes(option.value)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => toggleOption(option.value)}
            className="sr-only"
          />
          {option.icon && <span className="mr-2">{option.icon}</span>}
          <span className="text-sm text-gray-700">{option.label}</span>
          {selected.includes(option.value) && (
            <span className="ml-auto text-blue-500">✓</span>
          )}
        </label>
      ))}
    </div>
  );
};

/**
 * Radio group component
 */
const RadioGroup: React.FC<{
  options: Array<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
  name: string;
}> = ({ options, selected, onChange, name }) => (
  <div className="space-y-2">
    {options.map((option) => (
      <label
        key={option.value}
        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
          selected === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={selected === option.value}
          onChange={() => onChange(option.value)}
          className="sr-only"
        />
        <span className="text-sm text-gray-700">{option.label}</span>
        {selected === option.value && <span className="ml-auto text-blue-500">✓</span>}
      </label>
    ))}
  </div>
);

/**
 * Stress level slider component
 */
const StressSlider: React.FC<{
  value: number | null;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-4">
    <div className="flex justify-between">
      {STRESS_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange(level.value)}
          className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
            value === level.value ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
          }`}
        >
          <span className="text-2xl mb-1">{level.emoji}</span>
          <span className="text-xs text-gray-600 text-center whitespace-nowrap">{level.label}</span>
        </button>
      ))}
    </div>
  </div>
);

export const AssessmentForm: React.FC<AssessmentFormProps> = ({ onSubmit, onCancel, className = '' }) => {
  const [formData, setFormData] = useState<AssessmentFormData>({
    incomeRange: '',
    expenseCategories: [],
    expenseNotes: '',
    otherObligations: [],
    obligationNotes: '',
    stressLevel: null,
    additionalNotes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  const sections = ['income', 'expenses', 'obligations', 'stress', 'review'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToSection = (index: number) => {
    if (index >= 0 && index < sections.length) {
      setCurrentSection(index);
    }
  };

  const renderSection = () => {
    switch (sections[currentSection]) {
      case 'income':
        return (
          <div>
            <SectionHeader
              title="Monthly Income"
              description="A rough estimate helps us find realistic options for you."
            />
            <RadioGroup
              options={INCOME_RANGES}
              selected={formData.incomeRange}
              onChange={(value) => setFormData((prev) => ({ ...prev, incomeRange: value }))}
              name="income"
            />
          </div>
        );

      case 'expenses':
        return (
          <div>
            <SectionHeader
              title="Monthly Expenses"
              description="Select the categories that apply to your household."
            />
            <CheckboxGroup
              options={EXPENSE_CATEGORIES}
              selected={formData.expenseCategories}
              onChange={(selected) => setFormData((prev) => ({ ...prev, expenseCategories: selected }))}
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
              <textarea
                value={formData.expenseNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, expenseNotes: e.target.value }))}
                placeholder="Any other details about your expenses..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        );

      case 'obligations':
        return (
          <div>
            <SectionHeader
              title="Other Financial Obligations"
              description="Are you managing any other debts or payments?"
              optional
            />
            <CheckboxGroup
              options={OBLIGATION_TYPES}
              selected={formData.otherObligations}
              onChange={(selected) => setFormData((prev) => ({ ...prev, otherObligations: selected }))}
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
              <textarea
                value={formData.obligationNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, obligationNotes: e.target.value }))}
                placeholder="Any other details about your obligations..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        );

      case 'stress':
        return (
          <div>
            <SectionHeader
              title="How are you feeling?"
              description="We want to make sure we're supporting you appropriately."
              optional
            />
            <StressSlider
              value={formData.stressLevel}
              onChange={(value) => setFormData((prev) => ({ ...prev, stressLevel: value }))}
            />
            {formData.stressLevel && formData.stressLevel <= 2 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  We understand financial stress can be overwhelming. Here are some resources that might help:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  <li>• National Foundation for Credit Counseling: 1-800-388-2227</li>
                  <li>• Consumer Financial Protection Bureau: consumerfinance.gov</li>
                </ul>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div>
            <SectionHeader title="Review Your Information" description="Here's what you've shared with us." />
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Income</p>
                <p className="text-gray-900">
                  {INCOME_RANGES.find((r) => r.value === formData.incomeRange)?.label || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Main Expenses</p>
                <p className="text-gray-900">
                  {formData.expenseCategories.length > 0
                    ? formData.expenseCategories
                        .map((c) => EXPENSE_CATEGORIES.find((ec) => ec.value === c)?.label)
                        .join(', ')
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Other Obligations</p>
                <p className="text-gray-900">
                  {formData.otherObligations.length > 0
                    ? formData.otherObligations.map((o) => OBLIGATION_TYPES.find((ot) => ot.value === o)?.label).join(', ')
                    : 'None specified'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stress Level</p>
                <p className="text-gray-900">
                  {formData.stressLevel
                    ? STRESS_LEVELS.find((s) => s.value === formData.stressLevel)?.label
                    : 'Not specified'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anything else you'd like to add?</label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
                placeholder="Optional additional information..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Progress indicator */}
      <div className="p-4 border-b">
        <div className="flex justify-between mb-2">
          {sections.map((section, index) => (
            <button
              key={section}
              type="button"
              onClick={() => goToSection(index)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                index === currentSection
                  ? 'bg-blue-600 text-white'
                  : index < currentSection
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Income</span>
          <span>Expenses</span>
          <span>Obligations</span>
          <span>Stress</span>
          <span>Review</span>
        </div>
      </div>

      {/* Form content */}
      <form onSubmit={handleSubmit}>
        <div className="p-6">{renderSection()}</div>

        {/* Navigation */}
        <div className="p-4 border-t flex justify-between">
          <button
            type="button"
            onClick={() => (currentSection === 0 ? onCancel() : goToSection(currentSection - 1))}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            {currentSection === 0 ? 'Cancel' : 'Back'}
          </button>
          {currentSection < sections.length - 1 ? (
            <button
              type="button"
              onClick={() => goToSection(currentSection + 1)}
              className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AssessmentForm;
