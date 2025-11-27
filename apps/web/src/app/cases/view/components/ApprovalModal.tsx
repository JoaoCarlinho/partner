/**
 * ApprovalModal - Modal for approving a letter with optional signature
 * Story 5.2: Approve or Reject Letter (AC-5.2.3, AC-5.2.4, AC-5.2.5)
 * Story 5.5: Digital Signature Capture (AC-5.5.1, AC-5.5.6)
 */

'use client';

import { useRef, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { SignaturePad, SignaturePadRef, SignatureData } from '@/components/SignaturePad';

export interface ApprovalModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Letter ID being approved */
  letterId: string;
  /** Debtor name for summary */
  debtorName?: string;
  /** Whether approval is in progress */
  isLoading?: boolean;
  /** Called when approved (with optional signature) */
  onApprove: (signature?: SignatureData) => void;
  /** Called when cancelled/closed */
  onCancel: () => void;
}

/**
 * ApprovalModal - Approval confirmation with optional digital signature
 */
export function ApprovalModal({
  isOpen,
  letterId,
  debtorName = 'Unknown Debtor',
  isLoading = false,
  onApprove,
  onCancel,
}: ApprovalModalProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [hasSignature, setHasSignature] = useState(false);

  if (!isOpen) return null;

  /**
   * Handle signature change callback
   */
  const handleSignatureChange = (hasContent: boolean) => {
    setHasSignature(hasContent);
  };

  /**
   * Handle approval submission
   */
  const handleApprove = () => {
    const signatureData = signaturePadRef.current?.getSignatureData() ?? undefined;
    onApprove(signatureData);
  };

  /**
   * Clear signature pad
   */
  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
    setHasSignature(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
      data-testid="approval-modal"
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
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 id="approval-modal-title" className="text-lg font-semibold text-gray-900">
              Approve Letter
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
            You are about to approve the demand letter for <strong>{debtorName}</strong>.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Once approved, the letter will move to &quot;Approved&quot; status and can be prepared for sending.
          </p>
        </div>

        {/* Digital Signature Section (AC-5.5.1, AC-5.5.6) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Digital Signature <span className="text-gray-400">(optional)</span>
            </label>
            {hasSignature && (
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            )}
          </div>
          <SignaturePad
            ref={signaturePadRef}
            onSignatureChange={handleSignatureChange}
            width={400}
            height={150}
          />
          <p className="text-xs text-gray-500 mt-1">
            Sign above using your mouse or touch. Signature is optional.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            data-testid="approval-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="approval-confirm-button"
          >
            {isLoading ? 'Approving...' : 'Approve Letter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApprovalModal;
