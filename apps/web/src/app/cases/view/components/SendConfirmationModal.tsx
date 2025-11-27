/**
 * SendConfirmationModal - Irreversibility warning for marking letter as sent
 * Story 5.3: Prepare and Send Letter (AC-5.3.5)
 */

'use client';

import { useState } from 'react';
import { X, AlertTriangle, MailCheck } from 'lucide-react';

export interface SendConfirmationModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Letter ID being sent */
  letterId: string;
  /** Debtor name for summary */
  debtorName?: string;
  /** Whether send is in progress */
  isLoading?: boolean;
  /** Called when confirmed */
  onConfirm: () => void;
  /** Called when cancelled/closed */
  onCancel: () => void;
}

/**
 * SendConfirmationModal - Strong confirmation for irreversible send action (AC-5.3.5)
 */
export function SendConfirmationModal({
  isOpen,
  letterId,
  debtorName = 'Unknown Debtor',
  isLoading = false,
  onConfirm,
  onCancel,
}: SendConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset state when modal closes
  if (!isOpen) {
    if (confirmText || acknowledged) {
      setConfirmText('');
      setAcknowledged(false);
    }
    return null;
  }

  // Require typing "SEND" OR checking the acknowledgment (AC-5.3.5)
  const canConfirm = confirmText.toUpperCase() === 'SEND' || acknowledged;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-modal-title"
      data-testid="send-confirmation-modal"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with warning */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 id="send-modal-title" className="text-lg font-semibold text-gray-900">
              Mark Letter as Sent
            </h3>
            <p className="text-sm text-red-600 font-medium">
              This action is irreversible
            </p>
          </div>
        </div>

        {/* Warning message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <MailCheck className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">You are about to mark this letter as sent:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Letter #{letterId.substring(0, 8)} for <strong>{debtorName}</strong></li>
                <li>The letter will become <strong>read-only</strong></li>
                <li>This action <strong>cannot be undone</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirmation methods */}
        <div className="space-y-4 mb-6">
          {/* Option 1: Type SEND */}
          <div>
            <label htmlFor="confirm-send-input" className="block text-sm font-medium text-gray-700 mb-1">
              Type <strong>SEND</strong> to confirm:
            </label>
            <input
              id="confirm-send-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SEND"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              autoComplete="off"
              data-testid="send-confirm-input"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-xs text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Option 2: Checkbox acknowledgment */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              data-testid="send-acknowledge-checkbox"
            />
            <span className="text-sm text-gray-600">
              I understand this action is irreversible and the letter will be marked as sent.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            data-testid="send-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="send-confirm-button"
          >
            {isLoading ? 'Processing...' : 'Mark as Sent'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SendConfirmationModal;
