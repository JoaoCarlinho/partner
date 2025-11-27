import { DemandLetterStatus } from '@/components/StatusBadge';

/**
 * Statuses that allow editing (AC-2.3.5)
 */
export const EDITABLE_STATUSES: DemandLetterStatus[] = ['DRAFT'];

/**
 * Check if a letter status allows editing (AC-2.3.1, AC-2.3.4, AC-2.3.5)
 * Only DRAFT letters can be edited
 */
export function isEditable(status: DemandLetterStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Status-specific read-only messages (AC-2.3.6)
 */
export const READ_ONLY_MESSAGES: Record<DemandLetterStatus, string> = {
  DRAFT: '', // Not used - DRAFT is editable
  PENDING_REVIEW: 'This letter is awaiting attorney review and cannot be edited.',
  APPROVED: 'This letter has been approved and cannot be edited.',
  READY_TO_SEND: 'This letter is ready to send and cannot be edited.',
  SENT: 'This letter has been sent and is now read-only.',
};

/**
 * Get the read-only message for a status (AC-2.3.6)
 */
export function getReadOnlyMessage(status: DemandLetterStatus): string {
  return READ_ONLY_MESSAGES[status] || '';
}
