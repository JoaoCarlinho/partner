/**
 * Amount Owed Card Component
 * Displays total amount owed with breakdown
 */

import React, { useState } from 'react';

interface AmountBreakdown {
  total: string;
  principal: string;
  interest: string;
  fees: string;
}

interface AmountOwedCardProps {
  amount: {
    total: number;
    principal: number;
    interest: number;
    fees: number;
    formatted: AmountBreakdown;
  };
  className?: string;
}

/**
 * Tooltip component for explaining terms
 */
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="tooltip-trigger group relative inline-block ml-1 cursor-help">
    <span className="text-gray-400 hover:text-gray-600">ⓘ</span>
    <span className="tooltip-content absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-sm px-3 py-2 rounded-lg -top-2 left-6 w-48 shadow-lg">
      {text}
    </span>
  </span>
);

export const AmountOwedCard: React.FC<AmountOwedCardProps> = ({
  amount,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      {/* Total Amount - Most Prominent */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 uppercase tracking-wide">Total Amount Owed</p>
        <p className="text-4xl font-bold text-gray-900 mt-1">
          {amount.formatted.total}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4" />

      {/* Breakdown Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900"
        aria-expanded={isExpanded}
      >
        <span>View breakdown</span>
        <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {/* Expandable Breakdown */}
      {isExpanded && (
        <div className="mt-4 space-y-3 animate-fadeIn">
          {/* Principal */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-gray-600">Original Amount</span>
              <InfoTooltip text="This is the original amount you borrowed or owed before any interest or fees were added." />
            </div>
            <span className="font-medium text-gray-900">{amount.formatted.principal}</span>
          </div>

          {/* Interest */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-gray-600">Interest</span>
              <InfoTooltip text="Interest that has accumulated on the original amount over time." />
            </div>
            <span className="font-medium text-gray-900">{amount.formatted.interest}</span>
          </div>

          {/* Fees */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-gray-600">Fees</span>
              <InfoTooltip text="Collection costs and administrative fees that have been added." />
            </div>
            <span className="font-medium text-gray-900">{amount.formatted.fees}</span>
          </div>

          {/* Total line (repeated for clarity) */}
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center font-semibold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{amount.formatted.total}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmountOwedCard;
