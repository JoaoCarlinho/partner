import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

const mockOnConfirm = jest.fn();
const mockOnCancel = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ConfirmDialog', () => {
  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('displays default button labels', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('displays custom button labels', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          confirmLabel="Yes, Delete"
          cancelLabel="No, Keep"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument();
    });
  });

  describe('default variant', () => {
    it('has blue confirm button', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-blue-600');
    });

    it('does not show warning icon', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check there's no red warning icon background
      expect(document.querySelector('.bg-red-100')).not.toBeInTheDocument();
    });
  });

  describe('destructive variant', () => {
    it('has red confirm button', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Item"
          message="Are you sure?"
          variant="destructive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('shows warning icon', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Item"
          message="Are you sure?"
          variant="destructive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check for red warning icon background
      expect(document.querySelector('.bg-red-100')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', async () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('disables buttons when loading', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          loading={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('shows loading spinner on confirm button when loading', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test"
          loading={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check for spinner (animate-spin class)
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
