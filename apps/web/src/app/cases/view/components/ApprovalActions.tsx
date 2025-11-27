/**
 * ApprovalActions - Contextual action buttons for approval workflow
 * Story 5.1: Submit for Review (AC-5.1.1, AC-5.1.2, AC-5.1.3, AC-5.1.4)
 * Story 5.2: Approve or Reject (AC-5.2.1, AC-5.2.2, AC-5.2.3, AC-5.2.7)
 * Story 5.3: Prepare and Send (AC-5.3.1, AC-5.3.4, AC-5.3.5)
 */

'use client';

import { useState } from 'react';
import { Send, CheckCircle, XCircle, FileCheck, MailCheck, AlertTriangle } from 'lucide-react';
import { DemandLetterStatus } from '@/components/StatusBadge';
import {
  UserRole,
  COMPLIANCE_THRESHOLD,
  isSubmitButtonVisible,
  isApproveRejectVisible,
  canSubmitForReview,
  canPrepareSend,
  canMarkSent,
} from '@/utils/roleUtils';

export interface ApprovalActionsProps {
  /** Current letter status */
  status: DemandLetterStatus;
  /** User's role */
  userRole: UserRole;
  /** Letter compliance score (0-100) */
  complianceScore: number;
  /** Loading state for submit action */
  isSubmitting?: boolean;
  /** Loading state for approve action */
  isApproving?: boolean;
  /** Loading state for reject action */
  isRejecting?: boolean;
  /** Loading state for prepare action */
  isPreparing?: boolean;
  /** Loading state for send action */
  isSending?: boolean;
  /** Callback for submit for review */
  onSubmitForReview?: () => void;
  /** Callback for approve (opens modal) */
  onApprove?: () => void;
  /** Callback for reject (opens modal) */
  onReject?: () => void;
  /** Callback for prepare to send */
  onPrepareSend?: () => void;
  /** Callback for mark as sent (opens confirmation) */
  onMarkAsSent?: () => void;
}

/**
 * ApprovalActions - Displays contextual workflow action buttons based on status and role
 */
export function ApprovalActions({
  status,
  userRole,
  complianceScore,
  isSubmitting = false,
  isApproving = false,
  isRejecting = false,
  isPreparing = false,
  isSending = false,
  onSubmitForReview,
  onApprove,
  onReject,
  onPrepareSend,
  onMarkAsSent,
}: ApprovalActionsProps) {
  // Check visibility conditions
  const showSubmitButton = isSubmitButtonVisible(userRole, status);
  const showApproveRejectButtons = isApproveRejectVisible(userRole, status);
  const showPrepareSendButton = canPrepareSend(status);
  const showMarkSentButton = canMarkSent(status);

  // Check if submit is disabled due to compliance (AC-5.1.3)
  const submitDisabledDueToCompliance = showSubmitButton && complianceScore < COMPLIANCE_THRESHOLD;
  const canSubmit = canSubmitForReview(userRole, status, complianceScore);

  // No buttons to show
  if (!showSubmitButton && !showApproveRejectButtons && !showPrepareSendButton && !showMarkSentButton) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 items-center" data-testid="approval-actions">
      {/* Submit for Review Button (AC-5.1.1, AC-5.1.2, AC-5.1.3) */}
      {showSubmitButton && (
        <div className="relative">
          <button
            onClick={onSubmitForReview}
            disabled={!canSubmit || isSubmitting}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              ${canSubmit && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
            title={submitDisabledDueToCompliance
              ? `Compliance score must be at least ${COMPLIANCE_THRESHOLD}% to submit`
              : 'Submit for attorney review'
            }
            data-testid="submit-for-review-button"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
          {/* Compliance warning tooltip (AC-5.1.3) */}
          {submitDisabledDueToCompliance && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 whitespace-nowrap z-10 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Compliance score must be at least {COMPLIANCE_THRESHOLD}%
            </div>
          )}
        </div>
      )}

      {/* Approve Button (AC-5.2.1, AC-5.2.2, AC-5.2.3) */}
      {showApproveRejectButtons && (
        <>
          <button
            onClick={onApprove}
            disabled={isApproving}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isApproving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
              }
            `}
            title="Approve this letter"
            data-testid="approve-button"
          >
            <CheckCircle className="w-4 h-4" />
            {isApproving ? 'Approving...' : 'Approve'}
          </button>

          {/* Reject Button (AC-5.2.1, AC-5.2.2, AC-5.2.7) */}
          <button
            onClick={onReject}
            disabled={isRejecting}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isRejecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
              }
            `}
            title="Reject this letter"
            data-testid="reject-button"
          >
            <XCircle className="w-4 h-4" />
            {isRejecting ? 'Rejecting...' : 'Reject'}
          </button>
        </>
      )}

      {/* Prepare to Send Button (AC-5.3.1) */}
      {showPrepareSendButton && (
        <button
          onClick={onPrepareSend}
          disabled={isPreparing}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
            ${isPreparing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
            }
          `}
          title="Prepare letter for sending"
          data-testid="prepare-send-button"
        >
          <FileCheck className="w-4 h-4" />
          {isPreparing ? 'Preparing...' : 'Prepare to Send'}
        </button>
      )}

      {/* Mark as Sent Button (AC-5.3.4) */}
      {showMarkSentButton && (
        <button
          onClick={onMarkAsSent}
          disabled={isSending}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
            ${isSending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
            }
          `}
          title="Mark this letter as sent (irreversible)"
          data-testid="mark-sent-button"
        >
          <MailCheck className="w-4 h-4" />
          {isSending ? 'Marking...' : 'Mark as Sent'}
        </button>
      )}
    </div>
  );
}

export default ApprovalActions;
