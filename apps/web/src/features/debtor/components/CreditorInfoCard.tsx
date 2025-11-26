/**
 * Creditor Information Card Component
 * Displays creditor details and account information
 */

import React, { useState } from 'react';

interface CreditorInfoCardProps {
  creditor: {
    name: string;
    originalCreditor: string;
    accountNumber: string;
  };
  className?: string;
}

export const CreditorInfoCard: React.FC<CreditorInfoCardProps> = ({
  creditor,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const showOriginalCreditor = creditor.originalCreditor && creditor.originalCreditor !== creditor.name;

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Creditor Information
      </h3>

      {/* Current Creditor/Collector */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">Current Creditor</p>
        <p className="text-lg font-semibold text-gray-900">{creditor.name}</p>
      </div>

      {/* Original Creditor (if different) */}
      {showOriginalCreditor && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Original Creditor</p>
          <p className="text-base text-gray-700">{creditor.originalCreditor}</p>
        </div>
      )}

      {/* Account Number (masked) */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">Account Number</p>
        <p className="text-base text-gray-700 font-mono">{creditor.accountNumber}</p>
      </div>

      {/* Expandable "What is this debt?" section */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-blue-600 hover:text-blue-800 mt-2"
        aria-expanded={isExpanded}
      >
        <span>What is this debt for?</span>
        <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700 animate-fadeIn">
          <p className="mb-2">
            This debt originated with <strong>{creditor.originalCreditor || creditor.name}</strong>
            {showOriginalCreditor && ` and is now being collected by ${creditor.name}`}.
          </p>
          <p className="mb-2">
            The account number shown is partially masked for your security. Only the last 4 digits are displayed.
          </p>
          <p>
            If you don't recognize this debt or believe there's an error, you have the right to dispute it.
            Select "Dispute This Debt" in your options below.
          </p>
        </div>
      )}
    </div>
  );
};

export default CreditorInfoCard;
