/**
 * ApprovalWorkflow - Main orchestrator for approval workflow UI
 * Story 5.1: Submit for Review
 * Story 5.2: Approve or Reject Letter
 * Story 5.3: Prepare and Send Letter
 */

'use client';

import { useState, useCallback } from 'react';
import { DemandLetterStatus } from '@/components/StatusBadge';
import { UserRole } from '@/utils/roleUtils';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { SignatureData } from '@/components/SignaturePad';
import { ApprovalActions } from './ApprovalActions';
import { ConfirmationModal } from './ConfirmationModal';
import { ApprovalModal } from './ApprovalModal';
import { RejectionModal } from './RejectionModal';
import { SendConfirmationModal } from './SendConfirmationModal';

export interface ApprovalWorkflowProps {
  /** Letter ID */
  letterId: string;
  /** Current letter status */
  status: DemandLetterStatus;
  /** User's role */
  userRole: UserRole;
  /** Letter compliance score (0-100) */
  complianceScore: number;
  /** Debtor name for display */
  debtorName?: string;
  /** Called when status changes */
  onStatusChange?: (newStatus: DemandLetterStatus) => void;
  /** Called on any error */
  onError?: (message: string) => void;
  /** Called on success */
  onSuccess?: (message: string) => void;
}

/**
 * ApprovalWorkflow - Orchestrates approval workflow actions and modals
 */
export function ApprovalWorkflow({
  letterId,
  status,
  userRole,
  complianceScore,
  debtorName = 'Unknown Debtor',
  onStatusChange,
  onError,
  onSuccess,
}: ApprovalWorkflowProps) {
  // Modal states
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showPrepareConfirm, setShowPrepareConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  // Workflow hook
  const {
    isSubmitting,
    isApproving,
    isRejecting,
    isPreparing,
    isSending,
    error,
    submitForReview,
    approveRequest,
    rejectRequest,
    prepareSend,
    markAsSent,
    clearError,
  } = useApprovalWorkflow();

  /**
   * Handle submit for review (AC-5.1.4, AC-5.1.5, AC-5.1.6, AC-5.1.7)
   */
  const handleSubmitForReview = useCallback(async () => {
    try {
      const result = await submitForReview(letterId);
      setShowSubmitConfirm(false);
      onStatusChange?.('PENDING_REVIEW');
      onSuccess?.('Letter submitted for review successfully');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to submit for review');
    }
  }, [letterId, submitForReview, onStatusChange, onSuccess, onError]);

  /**
   * Handle approve (AC-5.2.5)
   */
  const handleApprove = useCallback(async (signature?: SignatureData) => {
    try {
      const signatureData = signature?.dataUrl;
      await approveRequest(letterId, signatureData);
      setShowApprovalModal(false);
      onStatusChange?.('APPROVED');
      onSuccess?.('Letter approved successfully');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to approve letter');
    }
  }, [letterId, approveRequest, onStatusChange, onSuccess, onError]);

  /**
   * Handle reject (AC-5.2.10, AC-5.2.11)
   */
  const handleReject = useCallback(async (reason: string) => {
    try {
      await rejectRequest(letterId, reason);
      setShowRejectionModal(false);
      onStatusChange?.('DRAFT');
      onSuccess?.('Letter rejected and returned to draft');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to reject letter');
    }
  }, [letterId, rejectRequest, onStatusChange, onSuccess, onError]);

  /**
   * Handle prepare to send (AC-5.3.2, AC-5.3.3)
   */
  const handlePrepareSend = useCallback(async () => {
    try {
      await prepareSend(letterId);
      setShowPrepareConfirm(false);
      onStatusChange?.('READY_TO_SEND');
      onSuccess?.('Letter prepared for sending');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to prepare letter');
    }
  }, [letterId, prepareSend, onStatusChange, onSuccess, onError]);

  /**
   * Handle mark as sent (AC-5.3.6, AC-5.3.7)
   */
  const handleMarkAsSent = useCallback(async () => {
    try {
      await markAsSent(letterId);
      setShowSendConfirm(false);
      onStatusChange?.('SENT');
      onSuccess?.('Letter marked as sent');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to mark letter as sent');
    }
  }, [letterId, markAsSent, onStatusChange, onSuccess, onError]);

  return (
    <div data-testid="approval-workflow">
      {/* Action Buttons */}
      <ApprovalActions
        status={status}
        userRole={userRole}
        complianceScore={complianceScore}
        isSubmitting={isSubmitting}
        isApproving={isApproving}
        isRejecting={isRejecting}
        isPreparing={isPreparing}
        isSending={isSending}
        onSubmitForReview={() => setShowSubmitConfirm(true)}
        onApprove={() => setShowApprovalModal(true)}
        onReject={() => setShowRejectionModal(true)}
        onPrepareSend={() => setShowPrepareConfirm(true)}
        onMarkAsSent={() => setShowSendConfirm(true)}
      />

      {/* Submit for Review Confirmation (AC-5.1.4) */}
      <ConfirmationModal
        isOpen={showSubmitConfirm}
        title="Submit for Review"
        message={
          <p>
            Submit this demand letter for attorney review?
            <br />
            <span className="text-xs text-gray-500 mt-2 block">
              The letter will move to &quot;Pending Review&quot; status and cannot be edited until reviewed.
            </span>
          </p>
        }
        confirmText="Submit for Review"
        confirmVariant="primary"
        isLoading={isSubmitting}
        onConfirm={handleSubmitForReview}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      {/* Approval Modal (AC-5.2.3, AC-5.2.4) */}
      <ApprovalModal
        isOpen={showApprovalModal}
        letterId={letterId}
        debtorName={debtorName}
        isLoading={isApproving}
        onApprove={handleApprove}
        onCancel={() => setShowApprovalModal(false)}
      />

      {/* Rejection Modal (AC-5.2.7) */}
      <RejectionModal
        isOpen={showRejectionModal}
        letterId={letterId}
        debtorName={debtorName}
        isLoading={isRejecting}
        onReject={handleReject}
        onCancel={() => setShowRejectionModal(false)}
      />

      {/* Prepare to Send Confirmation */}
      <ConfirmationModal
        isOpen={showPrepareConfirm}
        title="Prepare to Send"
        message={
          <p>
            Prepare this letter for sending?
            <br />
            <span className="text-xs text-gray-500 mt-2 block">
              The letter will move to &quot;Ready to Send&quot; status.
            </span>
          </p>
        }
        confirmText="Prepare to Send"
        confirmVariant="primary"
        isLoading={isPreparing}
        onConfirm={handlePrepareSend}
        onCancel={() => setShowPrepareConfirm(false)}
      />

      {/* Mark as Sent Confirmation with irreversibility warning (AC-5.3.5) */}
      <SendConfirmationModal
        isOpen={showSendConfirm}
        letterId={letterId}
        debtorName={debtorName}
        isLoading={isSending}
        onConfirm={handleMarkAsSent}
        onCancel={() => setShowSendConfirm(false)}
      />
    </div>
  );
}

export default ApprovalWorkflow;
