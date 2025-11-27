/**
 * RejectionModal - Modal for rejecting a letter with required reason
 * Story 5.2: Approve or Reject Letter (AC-5.2.7, AC-5.2.8, AC-5.2.9, AC-5.2.10, AC-5.2.11)
 */

'use client';

import { useState, useEffect } from 'react';
import { X, XCircle, AlertCircle } from 'lucide-react';

export interface RejectionModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Letter ID being rejected */
  letterId: string;
  /** Debtor name for summary */
  debtorName?: string;
  /** Whether rejection is in progress */
  isLoading?: boolean;
  /** Called when rejected with reason */
  onReject: (reason: string) => void;
  /** Called when cancelled/closed */
  onCancel: () => void;
}

/** Minimum character count for rejection reason (AC-5.2.8) */
const MIN_REASON_LENGTH = 10;

/**
 * RejectionModal - Rejection dialog requiring a reason
 */
export function RejectionModal({
  isOpen,
  letterId,
  debtorName = 'Unknown Debtor',
  isLoading = false,
  onReject,
  onCancel,
}: RejectionModalProps) {
  const [reason, setReason] = useState('');

  // Reset reason when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation (AC-5.2.8, AC-5.2.9)
  const characterCount = reason.length;
  const isReasonValid = characterCount >= MIN_REASON_LENGTH;
  const charactersRemaining = MIN_REASON_LENGTH - characterCount;

  /**
   * Handle rejection submission
   */
  const handleReject = () => {
    if (isReasonValid) {
      onReject(reason.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejection-modal-title"
      data-testid="rejection-modal"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 z-10">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 id="rejection-modal-title" className="text-lg font-semibold text-gray-900">
              Reject Letter
            </h3>
            <p className="text-sm text-gray-500">
              Letter #{letterId.substring(0, 8)}
            </p>
          </div>
        </div>

        {/* Letter Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Letter Summary</h4>
          <p className="text-sm text-gray-600">
            You are about to reject the demand letter for <strong>{debtorName}</strong>.
          </p>
        </div>

        {/* Info Banner (AC-5.2.11) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            The letter will return to <strong>Draft</strong> status and the rejection reason will be recorded in the approval history.
          </p>
        </div>

        {/* Rejection Reason Input (AC-5.2.8) */}
        <div className="mb-4">
          <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for rejecting this letter..."
            rows={4}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${!isReasonValid && characterCount > 0
                ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
            data-testid="rejection-reason-input"
          />
          {/* Character counter (AC-5.2.8) */}
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${!isReasonValid ? 'text-yellow-600' : 'text-gray-500'}`}>
              {!isReasonValid && charactersRemaining > 0
                ? `${charactersRemaining} more character${charactersRemaining === 1 ? '' : 's'} required`
                : `${characterCount} characters`
              }
            </span>
            <span className="text-xs text-gray-400">
              Minimum {MIN_REASON_LENGTH} characters
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            data-testid="rejection-cancel-button"
          >
            Cancel
          </button>
          {/* Reject button disabled until validation passes (AC-5.2.9) */}
          <button
            onClick={handleReject}
            disabled={!isReasonValid || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="rejection-confirm-button"
          >
            {isLoading ? 'Rejecting...' : 'Reject Letter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectionModal;
