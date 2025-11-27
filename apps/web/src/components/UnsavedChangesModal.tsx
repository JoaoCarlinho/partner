'use client';

import { Loader2 } from 'lucide-react';

export interface UnsavedChangesModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Handler for save and leave action */
  onSaveAndLeave: () => Promise<void>;
  /** Handler for leave without saving action */
  onLeaveWithoutSaving: () => void;
  /** Handler for cancel action */
  onCancel: () => void;
  /** Whether save operation is in progress */
  saving?: boolean;
}

/**
 * UnsavedChangesModal - Confirmation dialog for unsaved changes (AC-2.4.2)
 *
 * Provides three options:
 * - Save and Leave: Saves changes then navigates away
 * - Leave Without Saving: Discards changes and navigates
 * - Cancel: Stays on current page
 */
export function UnsavedChangesModal({
  isOpen,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
  saving = false,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="unsaved-changes-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 id="modal-title" className="text-lg font-semibold mb-2 text-gray-900">
          Unsaved Changes
        </h2>
        <p className="text-gray-600 mb-6">
          You have unsaved changes. What would you like to do?
        </p>
        <div className="flex gap-3 justify-end flex-wrap">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            data-testid="modal-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onLeaveWithoutSaving}
            disabled={saving}
            className="px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
            data-testid="modal-leave-without-saving"
          >
            Leave Without Saving
          </button>
          <button
            onClick={onSaveAndLeave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            data-testid="modal-save-and-leave"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save and Leave'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesModal;
