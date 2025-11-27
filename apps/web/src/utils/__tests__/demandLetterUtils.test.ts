import { isEditable, getReadOnlyMessage, READ_ONLY_MESSAGES, EDITABLE_STATUSES } from '../demandLetterUtils';
import { DemandLetterStatus } from '@/components/StatusBadge';

describe('demandLetterUtils', () => {
  describe('isEditable', () => {
    // AC-2.3.5: Only DRAFT status letters show edit controls
    it('returns true for DRAFT status (AC-2.3.5)', () => {
      expect(isEditable('DRAFT')).toBe(true);
    });

    // AC-2.3.1: SENT status letters are read-only
    it('returns false for SENT status (AC-2.3.1)', () => {
      expect(isEditable('SENT')).toBe(false);
    });

    // AC-2.3.4: PENDING_REVIEW letters are read-only
    it('returns false for PENDING_REVIEW status (AC-2.3.4)', () => {
      expect(isEditable('PENDING_REVIEW')).toBe(false);
    });

    // AC-2.3.4: APPROVED letters are read-only
    it('returns false for APPROVED status (AC-2.3.4)', () => {
      expect(isEditable('APPROVED')).toBe(false);
    });

    // AC-2.3.4: READY_TO_SEND letters are read-only
    it('returns false for READY_TO_SEND status (AC-2.3.4)', () => {
      expect(isEditable('READY_TO_SEND')).toBe(false);
    });

    it('only DRAFT is in EDITABLE_STATUSES', () => {
      expect(EDITABLE_STATUSES).toEqual(['DRAFT']);
    });
  });

  describe('getReadOnlyMessage', () => {
    // AC-2.3.6: Status-specific messages
    it('returns empty string for DRAFT', () => {
      expect(getReadOnlyMessage('DRAFT')).toBe('');
    });

    it('returns correct message for PENDING_REVIEW', () => {
      expect(getReadOnlyMessage('PENDING_REVIEW')).toBe(
        'This letter is awaiting attorney review and cannot be edited.'
      );
    });

    it('returns correct message for APPROVED', () => {
      expect(getReadOnlyMessage('APPROVED')).toBe(
        'This letter has been approved and cannot be edited.'
      );
    });

    it('returns correct message for READY_TO_SEND', () => {
      expect(getReadOnlyMessage('READY_TO_SEND')).toBe(
        'This letter is ready to send and cannot be edited.'
      );
    });

    it('returns correct message for SENT', () => {
      expect(getReadOnlyMessage('SENT')).toBe(
        'This letter has been sent and is now read-only.'
      );
    });
  });

  describe('READ_ONLY_MESSAGES', () => {
    const allStatuses: DemandLetterStatus[] = [
      'DRAFT',
      'PENDING_REVIEW',
      'APPROVED',
      'READY_TO_SEND',
      'SENT',
    ];

    it('has messages for all non-DRAFT statuses', () => {
      allStatuses.forEach((status) => {
        expect(READ_ONLY_MESSAGES[status]).toBeDefined();
        if (status !== 'DRAFT') {
          expect(READ_ONLY_MESSAGES[status].length).toBeGreaterThan(0);
        }
      });
    });
  });
});
