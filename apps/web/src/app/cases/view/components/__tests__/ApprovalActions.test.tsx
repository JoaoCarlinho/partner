/**
 * Unit tests for ApprovalActions component
 * Story 5.1: Submit for Review (AC-5.1.1, AC-5.1.2, AC-5.1.3)
 * Story 5.2: Approve or Reject (AC-5.2.1, AC-5.2.2)
 * Story 5.3: Prepare and Send (AC-5.3.1, AC-5.3.4)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApprovalActions } from '../ApprovalActions';

describe('ApprovalActions', () => {
  describe('AC-5.1.1: Submit for Review button visibility for DRAFT status', () => {
    it('should show Submit for Review button for DRAFT status', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('submit-for-review-button')).toBeInTheDocument();
    });

    it('should NOT show Submit for Review button for non-DRAFT status', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.queryByTestId('submit-for-review-button')).not.toBeInTheDocument();
    });
  });

  describe('AC-5.1.2: Role-based button visibility', () => {
    it('should show Submit button for Paralegal role', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('submit-for-review-button')).toBeInTheDocument();
    });

    it('should show Submit button for Attorney role', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="ATTORNEY"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('submit-for-review-button')).toBeInTheDocument();
    });

    it('should show Submit button for Firm Admin role', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="FIRM_ADMIN"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('submit-for-review-button')).toBeInTheDocument();
    });

    it('should NOT show Submit button for Debtor role', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="DEBTOR"
          complianceScore={85}
        />
      );

      expect(screen.queryByTestId('submit-for-review-button')).not.toBeInTheDocument();
    });
  });

  describe('AC-5.1.3: Compliance threshold disabled state', () => {
    it('should disable button when compliance score is 69% (below threshold)', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={69}
        />
      );

      const button = screen.getByTestId('submit-for-review-button');
      expect(button).toBeDisabled();
    });

    it('should enable button when compliance score is 70% (at threshold)', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={70}
        />
      );

      const button = screen.getByTestId('submit-for-review-button');
      expect(button).not.toBeDisabled();
    });

    it('should enable button when compliance score is 85% (above threshold)', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      const button = screen.getByTestId('submit-for-review-button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('AC-5.2.1: Approve/Reject buttons visibility for PENDING_REVIEW', () => {
    it('should show Approve button for PENDING_REVIEW status', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('approve-button')).toBeInTheDocument();
    });

    it('should show Reject button for PENDING_REVIEW status', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('reject-button')).toBeInTheDocument();
    });

    it('should NOT show Approve/Reject buttons for non-PENDING_REVIEW status', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="ATTORNEY"
          complianceScore={85}
        />
      );

      expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reject-button')).not.toBeInTheDocument();
    });
  });

  describe('AC-5.2.2: Role-based Approve/Reject visibility', () => {
    it('should show Approve/Reject for Attorney role', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('approve-button')).toBeInTheDocument();
      expect(screen.getByTestId('reject-button')).toBeInTheDocument();
    });

    it('should show Approve/Reject for Firm Admin role', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="FIRM_ADMIN"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('approve-button')).toBeInTheDocument();
      expect(screen.getByTestId('reject-button')).toBeInTheDocument();
    });

    it('should NOT show Approve/Reject for Paralegal role', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reject-button')).not.toBeInTheDocument();
    });
  });

  describe('AC-5.3.1: Prepare to Send button visibility', () => {
    it('should show Prepare to Send button for APPROVED status', () => {
      render(
        <ApprovalActions
          status="APPROVED"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('prepare-send-button')).toBeInTheDocument();
    });

    it('should NOT show Prepare to Send button for non-APPROVED status', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
        />
      );

      expect(screen.queryByTestId('prepare-send-button')).not.toBeInTheDocument();
    });
  });

  describe('AC-5.3.4: Mark as Sent button visibility', () => {
    it('should show Mark as Sent button for READY_TO_SEND status', () => {
      render(
        <ApprovalActions
          status="READY_TO_SEND"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.getByTestId('mark-sent-button')).toBeInTheDocument();
    });

    it('should NOT show Mark as Sent button for non-READY_TO_SEND status', () => {
      render(
        <ApprovalActions
          status="APPROVED"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(screen.queryByTestId('mark-sent-button')).not.toBeInTheDocument();
    });
  });

  describe('Button click handlers', () => {
    it('should call onSubmitForReview when Submit button clicked', () => {
      const onSubmitForReview = jest.fn();
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={85}
          onSubmitForReview={onSubmitForReview}
        />
      );

      fireEvent.click(screen.getByTestId('submit-for-review-button'));
      expect(onSubmitForReview).toHaveBeenCalledTimes(1);
    });

    it('should call onApprove when Approve button clicked', () => {
      const onApprove = jest.fn();
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
          onApprove={onApprove}
        />
      );

      fireEvent.click(screen.getByTestId('approve-button'));
      expect(onApprove).toHaveBeenCalledTimes(1);
    });

    it('should call onReject when Reject button clicked', () => {
      const onReject = jest.fn();
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
          onReject={onReject}
        />
      );

      fireEvent.click(screen.getByTestId('reject-button'));
      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading states', () => {
    it('should disable Submit button when isSubmitting', () => {
      render(
        <ApprovalActions
          status="DRAFT"
          userRole="PARALEGAL"
          complianceScore={85}
          isSubmitting={true}
        />
      );

      const button = screen.getByTestId('submit-for-review-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Submitting...');
    });

    it('should disable Approve button when isApproving', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
          isApproving={true}
        />
      );

      const button = screen.getByTestId('approve-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Approving...');
    });

    it('should disable Reject button when isRejecting', () => {
      render(
        <ApprovalActions
          status="PENDING_REVIEW"
          userRole="ATTORNEY"
          complianceScore={85}
          isRejecting={true}
        />
      );

      const button = screen.getByTestId('reject-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Rejecting...');
    });
  });

  describe('AC-5.3.8: No buttons for SENT status', () => {
    it('should render nothing for SENT status', () => {
      const { container } = render(
        <ApprovalActions
          status="SENT"
          userRole="PARALEGAL"
          complianceScore={85}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
