/**
 * ConfirmationModal - Generic confirmation dialog
 * Story 5.1: Submit for Review (AC-5.1.4)
 * Story 5.3: Prepare and Send confirmation
 */

'use client';

import { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export interface ConfirmationModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message: string | ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button color variant */
  confirmVariant?: 'primary' | 'danger' | 'warning';
  /** Whether action is in progress */
  isLoading?: boolean;
  /** Show warning icon */
  showWarning?: boolean;
  /** Called when confirmed */
  onConfirm: () => void;
  /** Called when cancelled/closed */
  onCancel: () => void;
}

const VARIANT_CLASSES = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
};

/**
 * ConfirmationModal - A reusable confirmation dialog component
 */
export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  showWarning = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="confirmation-modal"
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

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {showWarning && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
          )}
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="text-sm text-gray-600 mb-6">
          {message}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            data-testid="modal-cancel-button"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${VARIANT_CLASSES[confirmVariant]}
            `}
            data-testid="modal-confirm-button"
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
