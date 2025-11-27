/**
 * Role utilities for approval workflow permissions
 * Story 5.1: Submit for Review (AC-5.1.2, AC-5.1.3)
 * Story 5.2: Approve or Reject (AC-5.2.2)
 * Story 5.3: Prepare and Send
 */

import { DemandLetterStatus } from '@/components/StatusBadge';

/**
 * User roles in the system
 */
export type UserRole = 'FIRM_ADMIN' | 'ATTORNEY' | 'PARALEGAL' | 'DEBTOR' | 'PUBLIC_DEFENDER';

/**
 * Workflow permissions interface
 */
export interface WorkflowPermissions {
  canSubmitForReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  canPrepareSend: boolean;
  canMarkSent: boolean;
}

/**
 * Default compliance threshold (70%) - AC-5.1.3
 */
export const COMPLIANCE_THRESHOLD = 70;

/**
 * Roles that can submit letters for review (AC-5.1.2)
 * Paralegal, Attorney, or Firm Admin
 */
const SUBMIT_FOR_REVIEW_ROLES: UserRole[] = ['PARALEGAL', 'ATTORNEY', 'FIRM_ADMIN'];

/**
 * Roles that can approve or reject letters (AC-5.2.2)
 * Attorney or Firm Admin only
 */
const APPROVE_REJECT_ROLES: UserRole[] = ['ATTORNEY', 'FIRM_ADMIN'];

/**
 * Check if user can submit a letter for review (AC-5.1.2, AC-5.1.3)
 * @param role User's role
 * @param status Letter's current status
 * @param complianceScore Letter's compliance score (0-100)
 */
export function canSubmitForReview(
  role: UserRole,
  status: DemandLetterStatus,
  complianceScore: number = 100
): boolean {
  // Must be in DRAFT status
  if (status !== 'DRAFT') return false;

  // Must have appropriate role
  if (!SUBMIT_FOR_REVIEW_ROLES.includes(role)) return false;

  // Must meet compliance threshold (AC-5.1.3)
  if (complianceScore < COMPLIANCE_THRESHOLD) return false;

  return true;
}

/**
 * Check if user can approve a letter (AC-5.2.2)
 * @param role User's role
 * @param status Letter's current status
 */
export function canApprove(role: UserRole, status: DemandLetterStatus): boolean {
  // Must be in PENDING_REVIEW status
  if (status !== 'PENDING_REVIEW') return false;

  // Must be Attorney or Firm Admin
  return APPROVE_REJECT_ROLES.includes(role);
}

/**
 * Check if user can reject a letter (AC-5.2.2)
 * @param role User's role
 * @param status Letter's current status
 */
export function canReject(role: UserRole, status: DemandLetterStatus): boolean {
  // Same rules as approve
  return canApprove(role, status);
}

/**
 * Check if user can prepare a letter for sending (Story 5.3)
 * @param status Letter's current status
 */
export function canPrepareSend(status: DemandLetterStatus): boolean {
  // Must be APPROVED status
  // No role restriction - any authenticated user with case access
  return status === 'APPROVED';
}

/**
 * Check if user can mark a letter as sent (Story 5.3)
 * @param status Letter's current status
 */
export function canMarkSent(status: DemandLetterStatus): boolean {
  // Must be READY_TO_SEND status
  // No role restriction - any authenticated user with case access
  return status === 'READY_TO_SEND';
}

/**
 * Get all workflow permissions for a user and letter status
 */
export function getWorkflowPermissions(
  role: UserRole,
  status: DemandLetterStatus,
  complianceScore: number = 100
): WorkflowPermissions {
  return {
    canSubmitForReview: canSubmitForReview(role, status, complianceScore),
    canApprove: canApprove(role, status),
    canReject: canReject(role, status),
    canPrepareSend: canPrepareSend(status),
    canMarkSent: canMarkSent(status),
  };
}

/**
 * Check if submit button should be visible (different from enabled) (AC-5.1.1, AC-5.1.2)
 * Button is visible for DRAFT status and appropriate role, but may be disabled due to compliance
 */
export function isSubmitButtonVisible(role: UserRole, status: DemandLetterStatus): boolean {
  return status === 'DRAFT' && SUBMIT_FOR_REVIEW_ROLES.includes(role);
}

/**
 * Check if approve/reject buttons should be visible (AC-5.2.1, AC-5.2.2)
 */
export function isApproveRejectVisible(role: UserRole, status: DemandLetterStatus): boolean {
  return status === 'PENDING_REVIEW' && APPROVE_REJECT_ROLES.includes(role);
}
