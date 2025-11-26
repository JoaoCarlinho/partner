/**
 * Options Panel Component
 * Displays available actions for the debtor
 */

import React from 'react';

interface OptionsPanelProps {
  options: {
    canPay: boolean;
    canDispute: boolean;
    canNegotiate: boolean;
    disputeWindowOpen: boolean;
  };
  onOptionSelect?: (option: 'pay' | 'dispute' | 'negotiate' | 'questions') => void;
  className?: string;
}

interface ActionButtonProps {
  label: string;
  description: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'primary' | 'secondary';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  description,
  icon,
  onClick,
  disabled = false,
  disabledReason,
  variant = 'secondary',
}) => {
  const baseClasses = 'w-full p-4 rounded-lg text-left transition-all duration-200 flex items-start gap-3';

  const variantClasses = {
    primary: disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg',
    secondary: disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
      : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
      title={disabled ? disabledReason : undefined}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className={`text-sm ${variant === 'primary' && !disabled ? 'text-blue-100' : 'text-gray-500'}`}>
          {disabled && disabledReason ? disabledReason : description}
        </p>
      </div>
      {!disabled && (
        <span className={`flex-shrink-0 ${variant === 'primary' ? 'text-white' : 'text-gray-400'}`}>
          →
        </span>
      )}
    </button>
  );
};

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  options,
  onOptionSelect,
  className = '',
}) => {
  const handleSelect = (option: 'pay' | 'dispute' | 'negotiate' | 'questions') => {
    if (onOptionSelect) {
      onOptionSelect(option);
    }
    // Track analytics event
    console.log('Option selected:', option);
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Your Options
      </h3>

      <div className="space-y-3">
        {/* Pay Now */}
        <ActionButton
          label="Pay Now"
          description="Make a payment toward this debt"
          icon="💳"
          onClick={() => handleSelect('pay')}
          disabled={!options.canPay}
          disabledReason="Payment is not available for this case"
          variant="primary"
        />

        {/* Request Payment Plan */}
        <ActionButton
          label="Request Payment Plan"
          description="Set up affordable monthly payments"
          icon="📅"
          onClick={() => handleSelect('negotiate')}
          disabled={!options.canNegotiate}
          disabledReason="Payment plans are not available for this case"
        />

        {/* Dispute This Debt */}
        <ActionButton
          label="Dispute This Debt"
          description={options.disputeWindowOpen
            ? "Challenge or request verification of this debt"
            : "Request more information about this debt"
          }
          icon="⚖️"
          onClick={() => handleSelect('dispute')}
          disabled={!options.canDispute}
          disabledReason="Dispute is not available for this case"
        />

        {/* I Have Questions */}
        <ActionButton
          label="I Have Questions"
          description="Get help understanding your options"
          icon="❓"
          onClick={() => handleSelect('questions')}
        />
      </div>

      {/* Helpful note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          <strong>Need help deciding?</strong> We're here to help you understand your options.
          There's no pressure to make an immediate decision. Take your time to review the information above.
        </p>
      </div>
    </div>
  );
};

export default OptionsPanel;
