/**
 * Unit tests for RejectionModal component
 * Story 5.2: Approve or Reject Letter
 * (AC-5.2.7, AC-5.2.8, AC-5.2.9)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RejectionModal } from '../RejectionModal';

describe('RejectionModal', () => {
  const defaultProps = {
    isOpen: true,
    letterId: 'letter-123',
    debtorName: 'John Doe',
    isLoading: false,
    onReject: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AC-5.2.7: Modal opens when Reject clicked', () => {
    it('should render modal when isOpen is true', () => {
      render(<RejectionModal {...defaultProps} />);
      expect(screen.getByTestId('rejection-modal')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      render(<RejectionModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('rejection-modal')).not.toBeInTheDocument();
    });

    it('should display letter ID (truncated to 8 chars)', () => {
      render(<RejectionModal {...defaultProps} />);
      // "letter-123" substring(0,8) = "letter-1"
      expect(screen.getByText(/letter-1/)).toBeInTheDocument();
    });

    it('should display debtor name', () => {
      render(<RejectionModal {...defaultProps} />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  describe('AC-5.2.8: Rejection reason textarea', () => {
    it('should render rejection reason textarea', () => {
      render(<RejectionModal {...defaultProps} />);
      expect(screen.getByTestId('rejection-reason-input')).toBeInTheDocument();
    });

    it('should have placeholder text', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('reason'));
    });

    it('should update value when typing', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');

      fireEvent.change(textarea, { target: { value: 'This is a test reason' } });
      expect(textarea).toHaveValue('This is a test reason');
    });

    it('should show characters remaining or count', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');

      fireEvent.change(textarea, { target: { value: 'Test' } });
      // Shows "6 more characters required" when below minimum
      expect(screen.getByText(/6 more character/)).toBeInTheDocument();
    });
  });

  describe('AC-5.2.9: Reject button disabled until minimum length', () => {
    it('should disable Reject button with 9 characters', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');
      const button = screen.getByTestId('rejection-confirm-button');

      fireEvent.change(textarea, { target: { value: '123456789' } }); // 9 chars
      expect(button).toBeDisabled();
    });

    it('should enable Reject button with 10 characters', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');
      const button = screen.getByTestId('rejection-confirm-button');

      fireEvent.change(textarea, { target: { value: '1234567890' } }); // 10 chars
      expect(button).not.toBeDisabled();
    });

    it('should enable Reject button with more than 10 characters', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');
      const button = screen.getByTestId('rejection-confirm-button');

      fireEvent.change(textarea, { target: { value: 'This reason is definitely more than 10 characters long' } });
      expect(button).not.toBeDisabled();
    });

    it('should show remaining characters message when below minimum', () => {
      render(<RejectionModal {...defaultProps} />);
      const textarea = screen.getByTestId('rejection-reason-input');

      fireEvent.change(textarea, { target: { value: 'Test' } }); // 4 chars
      expect(screen.getByText(/6 more character/)).toBeInTheDocument();
    });
  });

  describe('Rejection submission', () => {
    it('should call onReject with trimmed reason when confirmed', () => {
      const onReject = jest.fn();
      render(<RejectionModal {...defaultProps} onReject={onReject} />);

      const textarea = screen.getByTestId('rejection-reason-input');
      const button = screen.getByTestId('rejection-confirm-button');

      fireEvent.change(textarea, { target: { value: '  This is the rejection reason  ' } });
      fireEvent.click(button);

      expect(onReject).toHaveBeenCalledWith('This is the rejection reason');
    });

    it('should NOT call onReject when reason is too short', () => {
      const onReject = jest.fn();
      render(<RejectionModal {...defaultProps} onReject={onReject} />);

      const textarea = screen.getByTestId('rejection-reason-input');
      const button = screen.getByTestId('rejection-confirm-button');

      fireEvent.change(textarea, { target: { value: 'Short' } });
      fireEvent.click(button);

      expect(onReject).not.toHaveBeenCalled();
    });
  });

  describe('Cancel functionality', () => {
    it('should call onCancel when Cancel button clicked', () => {
      const onCancel = jest.fn();
      render(<RejectionModal {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('rejection-cancel-button'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when backdrop clicked', () => {
      const onCancel = jest.fn();
      render(<RejectionModal {...defaultProps} onCancel={onCancel} />);

      const backdrop = screen.getByTestId('rejection-modal').querySelector('[aria-hidden="true"]');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onCancel).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Loading state', () => {
    it('should disable buttons when isLoading', () => {
      render(<RejectionModal {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('rejection-cancel-button')).toBeDisabled();
      expect(screen.getByTestId('rejection-confirm-button')).toBeDisabled();
    });

    it('should show loading text on Reject button', () => {
      render(<RejectionModal {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('rejection-confirm-button')).toHaveTextContent('Rejecting...');
    });
  });

  describe('AC-5.2.11: Status returns to DRAFT info', () => {
    it('should display info about status returning to DRAFT', () => {
      render(<RejectionModal {...defaultProps} />);

      expect(screen.getByText(/Draft/i)).toBeInTheDocument();
    });
  });
});
