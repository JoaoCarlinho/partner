import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesModal } from '../UnsavedChangesModal';

describe('UnsavedChangesModal', () => {
  const defaultProps = {
    isOpen: true,
    onSaveAndLeave: jest.fn().mockResolvedValue(undefined),
    onLeaveWithoutSaving: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC-2.4.2: Modal confirmation for unsaved changes
  describe('Modal Display (AC-2.4.2)', () => {
    it('renders modal when isOpen is true', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      expect(screen.getByTestId('unsaved-changes-modal')).toBeInTheDocument();
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<UnsavedChangesModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
    });

    it('displays warning message about unsaved changes', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      expect(
        screen.getByText('You have unsaved changes. What would you like to do?')
      ).toBeInTheDocument();
    });

    it('has correct accessibility attributes', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      const modal = screen.getByTestId('unsaved-changes-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });

  describe('Three Action Buttons', () => {
    it('renders Save and Leave button', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      expect(screen.getByTestId('modal-save-and-leave')).toBeInTheDocument();
      expect(screen.getByText('Save and Leave')).toBeInTheDocument();
    });

    it('renders Leave Without Saving button', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      expect(screen.getByTestId('modal-leave-without-saving')).toBeInTheDocument();
      expect(screen.getByText('Leave Without Saving')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      expect(screen.getByTestId('modal-cancel')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('calls onSaveAndLeave when Save and Leave is clicked', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('modal-save-and-leave'));

      expect(defaultProps.onSaveAndLeave).toHaveBeenCalledTimes(1);
    });

    it('calls onLeaveWithoutSaving when Leave Without Saving is clicked', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('modal-leave-without-saving'));

      expect(defaultProps.onLeaveWithoutSaving).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel is clicked', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('modal-cancel'));

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Saving State', () => {
    it('shows loading state when saving is true', () => {
      render(<UnsavedChangesModal {...defaultProps} saving={true} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.queryByText('Save and Leave')).not.toBeInTheDocument();
    });

    it('disables all buttons when saving', () => {
      render(<UnsavedChangesModal {...defaultProps} saving={true} />);

      expect(screen.getByTestId('modal-save-and-leave')).toBeDisabled();
      expect(screen.getByTestId('modal-leave-without-saving')).toBeDisabled();
      expect(screen.getByTestId('modal-cancel')).toBeDisabled();
    });

    it('enables buttons when not saving', () => {
      render(<UnsavedChangesModal {...defaultProps} saving={false} />);

      expect(screen.getByTestId('modal-save-and-leave')).not.toBeDisabled();
      expect(screen.getByTestId('modal-leave-without-saving')).not.toBeDisabled();
      expect(screen.getByTestId('modal-cancel')).not.toBeDisabled();
    });
  });

  describe('Styling', () => {
    it('has backdrop overlay', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      const modal = screen.getByTestId('unsaved-changes-modal');
      expect(modal).toHaveClass('fixed', 'inset-0');
    });

    it('Leave Without Saving button has warning styling', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      const leaveButton = screen.getByTestId('modal-leave-without-saving');
      expect(leaveButton).toHaveClass('text-red-600');
    });

    it('Save and Leave button has primary styling', () => {
      render(<UnsavedChangesModal {...defaultProps} />);

      const saveButton = screen.getByTestId('modal-save-and-leave');
      expect(saveButton).toHaveClass('bg-primary-600');
    });
  });
});
