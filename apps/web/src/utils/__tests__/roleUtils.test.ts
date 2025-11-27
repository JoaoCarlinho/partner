/**
 * Unit tests for roleUtils
 * Story 5.1: Submit for Review (AC-5.1.2, AC-5.1.3)
 * Story 5.2: Approve or Reject (AC-5.2.2)
 * Story 5.3: Prepare and Send
 */

import {
  canSubmitForReview,
  canApprove,
  canReject,
  canPrepareSend,
  canMarkSent,
  isSubmitButtonVisible,
  isApproveRejectVisible,
  getWorkflowPermissions,
  COMPLIANCE_THRESHOLD,
  UserRole,
} from '../roleUtils';
import { DemandLetterStatus } from '@/components/StatusBadge';

describe('roleUtils', () => {
  describe('COMPLIANCE_THRESHOLD', () => {
    it('should be 70', () => {
      expect(COMPLIANCE_THRESHOLD).toBe(70);
    });
  });

  describe('canSubmitForReview', () => {
    const roles: UserRole[] = ['PARALEGAL', 'ATTORNEY', 'FIRM_ADMIN'];
    const nonAllowedRoles: UserRole[] = ['DEBTOR', 'PUBLIC_DEFENDER'];

    describe('AC-5.1.2: Role-based visibility', () => {
      it.each(roles)('should allow %s to submit for DRAFT letters', (role) => {
        expect(canSubmitForReview(role, 'DRAFT', 100)).toBe(true);
      });

      it.each(nonAllowedRoles)('should NOT allow %s to submit', (role) => {
        expect(canSubmitForReview(role, 'DRAFT', 100)).toBe(false);
      });
    });

    describe('AC-5.1.3: Compliance threshold check', () => {
      it('should disable when compliance score is 69% (below threshold)', () => {
        expect(canSubmitForReview('PARALEGAL', 'DRAFT', 69)).toBe(false);
      });

      it('should enable when compliance score is 70% (at threshold)', () => {
        expect(canSubmitForReview('PARALEGAL', 'DRAFT', 70)).toBe(true);
      });

      it('should enable when compliance score is 85% (above threshold)', () => {
        expect(canSubmitForReview('PARALEGAL', 'DRAFT', 85)).toBe(true);
      });

      it('should enable when compliance score is 100%', () => {
        expect(canSubmitForReview('PARALEGAL', 'DRAFT', 100)).toBe(true);
      });
    });

    describe('Status requirements', () => {
      const nonDraftStatuses: DemandLetterStatus[] = ['PENDING_REVIEW', 'APPROVED', 'READY_TO_SEND', 'SENT'];

      it.each(nonDraftStatuses)('should NOT allow submit for %s status', (status) => {
        expect(canSubmitForReview('PARALEGAL', status, 100)).toBe(false);
      });
    });
  });

  describe('canApprove', () => {
    describe('AC-5.2.2: Role-based visibility for approve', () => {
      it('should allow ATTORNEY to approve PENDING_REVIEW letters', () => {
        expect(canApprove('ATTORNEY', 'PENDING_REVIEW')).toBe(true);
      });

      it('should allow FIRM_ADMIN to approve PENDING_REVIEW letters', () => {
        expect(canApprove('FIRM_ADMIN', 'PENDING_REVIEW')).toBe(true);
      });

      it('should NOT allow PARALEGAL to approve', () => {
        expect(canApprove('PARALEGAL', 'PENDING_REVIEW')).toBe(false);
      });

      it('should NOT allow DEBTOR to approve', () => {
        expect(canApprove('DEBTOR', 'PENDING_REVIEW')).toBe(false);
      });
    });

    describe('Status requirements', () => {
      const nonPendingStatuses: DemandLetterStatus[] = ['DRAFT', 'APPROVED', 'READY_TO_SEND', 'SENT'];

      it.each(nonPendingStatuses)('should NOT allow approve for %s status', (status) => {
        expect(canApprove('ATTORNEY', status)).toBe(false);
      });
    });
  });

  describe('canReject', () => {
    describe('AC-5.2.2: Role-based visibility for reject', () => {
      it('should allow ATTORNEY to reject PENDING_REVIEW letters', () => {
        expect(canReject('ATTORNEY', 'PENDING_REVIEW')).toBe(true);
      });

      it('should allow FIRM_ADMIN to reject PENDING_REVIEW letters', () => {
        expect(canReject('FIRM_ADMIN', 'PENDING_REVIEW')).toBe(true);
      });

      it('should NOT allow PARALEGAL to reject', () => {
        expect(canReject('PARALEGAL', 'PENDING_REVIEW')).toBe(false);
      });
    });
  });

  describe('canPrepareSend', () => {
    it('should allow prepare send for APPROVED status', () => {
      expect(canPrepareSend('APPROVED')).toBe(true);
    });

    it('should NOT allow prepare send for DRAFT status', () => {
      expect(canPrepareSend('DRAFT')).toBe(false);
    });

    it('should NOT allow prepare send for PENDING_REVIEW status', () => {
      expect(canPrepareSend('PENDING_REVIEW')).toBe(false);
    });

    it('should NOT allow prepare send for READY_TO_SEND status', () => {
      expect(canPrepareSend('READY_TO_SEND')).toBe(false);
    });

    it('should NOT allow prepare send for SENT status', () => {
      expect(canPrepareSend('SENT')).toBe(false);
    });
  });

  describe('canMarkSent', () => {
    it('should allow mark as sent for READY_TO_SEND status', () => {
      expect(canMarkSent('READY_TO_SEND')).toBe(true);
    });

    it('should NOT allow mark as sent for APPROVED status', () => {
      expect(canMarkSent('APPROVED')).toBe(false);
    });

    it('should NOT allow mark as sent for SENT status', () => {
      expect(canMarkSent('SENT')).toBe(false);
    });
  });

  describe('isSubmitButtonVisible', () => {
    describe('AC-5.1.1: Button visibility for DRAFT status', () => {
      it('should be visible for PARALEGAL with DRAFT letter', () => {
        expect(isSubmitButtonVisible('PARALEGAL', 'DRAFT')).toBe(true);
      });

      it('should be visible for ATTORNEY with DRAFT letter', () => {
        expect(isSubmitButtonVisible('ATTORNEY', 'DRAFT')).toBe(true);
      });

      it('should NOT be visible for DEBTOR', () => {
        expect(isSubmitButtonVisible('DEBTOR', 'DRAFT')).toBe(false);
      });

      it('should NOT be visible for non-DRAFT status', () => {
        expect(isSubmitButtonVisible('PARALEGAL', 'PENDING_REVIEW')).toBe(false);
      });
    });
  });

  describe('isApproveRejectVisible', () => {
    describe('AC-5.2.1: Button visibility for PENDING_REVIEW status', () => {
      it('should be visible for ATTORNEY with PENDING_REVIEW letter', () => {
        expect(isApproveRejectVisible('ATTORNEY', 'PENDING_REVIEW')).toBe(true);
      });

      it('should be visible for FIRM_ADMIN with PENDING_REVIEW letter', () => {
        expect(isApproveRejectVisible('FIRM_ADMIN', 'PENDING_REVIEW')).toBe(true);
      });

      it('should NOT be visible for PARALEGAL', () => {
        expect(isApproveRejectVisible('PARALEGAL', 'PENDING_REVIEW')).toBe(false);
      });

      it('should NOT be visible for non-PENDING_REVIEW status', () => {
        expect(isApproveRejectVisible('ATTORNEY', 'DRAFT')).toBe(false);
      });
    });
  });

  describe('getWorkflowPermissions', () => {
    it('should return all permissions for given role and status', () => {
      const permissions = getWorkflowPermissions('PARALEGAL', 'DRAFT', 85);

      expect(permissions).toEqual({
        canSubmitForReview: true,
        canApprove: false,
        canReject: false,
        canPrepareSend: false,
        canMarkSent: false,
      });
    });

    it('should return approve/reject permissions for ATTORNEY with PENDING_REVIEW', () => {
      const permissions = getWorkflowPermissions('ATTORNEY', 'PENDING_REVIEW', 100);

      expect(permissions.canApprove).toBe(true);
      expect(permissions.canReject).toBe(true);
      expect(permissions.canSubmitForReview).toBe(false);
    });
  });
});
