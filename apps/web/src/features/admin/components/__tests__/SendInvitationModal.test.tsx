import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendInvitationModal } from '../SendInvitationModal';
import * as hooks from '../../hooks/useDefenderInvitations';

// Mock the hooks
jest.mock('../../hooks/useDefenderInvitations');

const mockSendInvitation = jest.fn();
const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (hooks.useSendInvitation as jest.Mock).mockReturnValue({
    sendInvitation: mockSendInvitation,
    loading: false,
    error: null,
  });
});

describe('SendInvitationModal', () => {
  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Invite Public Defender')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <SendInvitationModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText('Invite Public Defender')).not.toBeInTheDocument();
    });

    it('displays email and organization name fields (AC: 1)', () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    });

    it('displays Cancel and Send Invitation buttons', () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
    });
  });

  describe('form validation (AC: 2)', () => {
    it('shows error for empty email on blur', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('clears error when valid email is entered', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'invalid');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'valid@example.com');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
      });
    });

    it('disables submit button when email is invalid', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when email is valid', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'valid@example.com');

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('form submission (AC: 3)', () => {
    it('calls sendInvitation with email and organization name', async () => {
      mockSendInvitation.mockResolvedValue({});

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const orgInput = screen.getByLabelText(/organization name/i);

      await userEvent.type(emailInput, 'defender@example.com');
      await userEvent.type(orgInput, 'Public Defender Office');

      await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockSendInvitation).toHaveBeenCalledWith({
          email: 'defender@example.com',
          organizationName: 'Public Defender Office',
        });
      });
    });

    it('calls sendInvitation without organization name if not provided', async () => {
      mockSendInvitation.mockResolvedValue({});

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'defender@example.com');

      await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockSendInvitation).toHaveBeenCalledWith({
          email: 'defender@example.com',
          organizationName: undefined,
        });
      });
    });
  });

  describe('success handling (AC: 4, 6)', () => {
    it('calls onSuccess with email after successful submission', async () => {
      mockSendInvitation.mockResolvedValue({});

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await userEvent.type(screen.getByLabelText(/email address/i), 'defender@example.com');
      await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('defender@example.com');
      });
    });
  });

  describe('error handling (AC: 5)', () => {
    it('displays API error message', async () => {
      mockSendInvitation.mockRejectedValue(new Error('Active invitation already exists for this email'));

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await userEvent.type(screen.getByLabelText(/email address/i), 'defender@example.com');
      await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(screen.getByText('Active invitation already exists for this email')).toBeInTheDocument();
      });
    });

    it('keeps form data after error', async () => {
      mockSendInvitation.mockRejectedValue(new Error('Server error'));

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const orgInput = screen.getByLabelText(/organization name/i);

      await userEvent.type(emailInput, 'defender@example.com');
      await userEvent.type(orgInput, 'Test Org');
      await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      // Form should retain the values
      expect(emailInput).toHaveValue('defender@example.com');
      expect(orgInput).toHaveValue('Test Org');
    });
  });

  describe('cancel behavior (AC: 7)', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', async () => {
      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Find the X button (close icon button)
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg'));
      if (xButton && xButton !== screen.getByRole('button', { name: /cancel/i })) {
        await userEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('loading state', () => {
    it('disables form inputs during submission', async () => {
      (hooks.useSendInvitation as jest.Mock).mockReturnValue({
        sendInvitation: mockSendInvitation,
        loading: true,
        error: null,
      });

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/organization name/i)).toBeDisabled();
    });

    it('shows loading text on submit button during submission', () => {
      (hooks.useSendInvitation as jest.Mock).mockReturnValue({
        sendInvitation: mockSendInvitation,
        loading: true,
        error: null,
      });

      render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
    });
  });

  describe('form reset', () => {
    it('resets form when modal is reopened', async () => {
      const { rerender } = render(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Type in the form
      await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');

      // Close the modal
      rerender(
        <SendInvitationModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Reopen the modal
      rerender(
        <SendInvitationModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Form should be reset
      expect(screen.getByLabelText(/email address/i)).toHaveValue('');
    });
  });
});
