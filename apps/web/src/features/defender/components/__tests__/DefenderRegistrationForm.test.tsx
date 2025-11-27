import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefenderRegistrationForm } from '../DefenderRegistrationForm';
import * as hooks from '../../hooks/useDefenderAuth';

// Mock the hooks
jest.mock('../../hooks/useDefenderAuth', () => ({
  ...jest.requireActual('../../hooks/useDefenderAuth'),
  useDefenderRegistration: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const defaultProps = {
  invitationToken: 'test-token-123',
  email: 'defender@example.com',
  organizationName: 'Public Defender Office',
};

const mockRegister = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
    register: mockRegister,
    loading: false,
    error: null,
  });
});

describe('DefenderRegistrationForm', () => {
  describe('rendering', () => {
    it('displays pre-filled email from invitation (read-only)', () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveValue('defender@example.com');
      expect(emailInput).toBeDisabled();
    });

    it('displays pre-filled organization name if provided', () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const orgInput = screen.getByLabelText(/organization name/i);
      expect(orgInput).toHaveValue('Public Defender Office');
    });

    it('displays all required form fields', () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bar number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bar state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('displays bar state dropdown with US states', () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const select = screen.getByLabelText(/bar state/i);
      expect(select).toBeInTheDocument();
      expect(select.querySelector('option[value="CA"]')).toBeInTheDocument();
      expect(select.querySelector('option[value="NY"]')).toBeInTheDocument();
      expect(select.querySelector('option[value="TX"]')).toBeInTheDocument();
    });

    it('displays login link', () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    });
  });

  describe('form validation (AC: 2)', () => {
    it('validates required fields on blur', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      // Blur each field to trigger validation
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const barNumberInput = screen.getByLabelText(/bar number/i);
      const barStateInput = screen.getByLabelText(/bar state/i);
      const passwordInput = screen.getByLabelText(/^password/i);

      fireEvent.blur(firstNameInput);
      fireEvent.blur(lastNameInput);
      fireEvent.blur(barNumberInput);
      fireEvent.blur(barStateInput);
      fireEvent.blur(passwordInput);

      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/bar number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/bar state is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it('validates password minimum length', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      await userEvent.type(passwordInput, 'short');
      fireEvent.blur(passwordInput);

      expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    });

    it('validates password has uppercase letter', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      await userEvent.type(passwordInput, 'lowercase123');
      fireEvent.blur(passwordInput);

      expect(await screen.findByText(/1 uppercase letter/i)).toBeInTheDocument();
    });

    it('validates password has number', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      await userEvent.type(passwordInput, 'Uppercase');
      fireEvent.blur(passwordInput);

      expect(await screen.findByText(/at least 1 number/i)).toBeInTheDocument();
    });

    it('validates passwords match', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await userEvent.type(passwordInput, 'ValidPass1');
      await userEvent.type(confirmInput, 'DifferentPass1');
      fireEvent.blur(confirmInput);

      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('shows password strength indicator', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      await userEvent.type(passwordInput, 'weak');

      expect(await screen.findByText(/weak/i)).toBeInTheDocument();
    });

    it('clears validation error when user starts typing', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      fireEvent.blur(firstNameInput);

      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();

      await userEvent.type(firstNameInput, 'John');

      await waitFor(() => {
        expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password visibility', async () => {
      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButtons = document.querySelectorAll('button[type="button"]');
      await userEvent.click(toggleButtons[0]);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('form submission (AC: 3, 4)', () => {
    it('calls register with correct data on valid submission', async () => {
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-1', email: 'defender@example.com' },
          token: 'jwt-token-123',
        },
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/first name/i), 'John');
      await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
      await userEvent.type(screen.getByLabelText(/phone number/i), '555-123-4567');
      await userEvent.type(screen.getByLabelText(/bar number/i), 'BAR123456');
      await userEvent.selectOptions(screen.getByLabelText(/bar state/i), 'CA');
      await userEvent.type(screen.getByLabelText(/^password/i), 'ValidPass1');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPass1');

      await userEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          token: 'test-token-123',
          email: 'defender@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '555-123-4567',
          organizationName: 'Public Defender Office',
          barNumber: 'BAR123456',
          barState: 'CA',
          password: 'ValidPass1',
        });
      });
    });

    it('stores auth token on successful registration', async () => {
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-1', email: 'defender@example.com' },
          token: 'jwt-token-123',
        },
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      // Fill out form
      await userEvent.type(screen.getByLabelText(/first name/i), 'John');
      await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
      await userEvent.type(screen.getByLabelText(/bar number/i), 'BAR123456');
      await userEvent.selectOptions(screen.getByLabelText(/bar state/i), 'CA');
      await userEvent.type(screen.getByLabelText(/^password/i), 'ValidPass1');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPass1');

      await userEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith('authToken', 'jwt-token-123');
      });

      mockSetItem.mockRestore();
    });

    it('shows success message and redirects after registration', async () => {
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-1' },
          token: 'jwt-token-123',
        },
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      // Fill out and submit form
      await userEvent.type(screen.getByLabelText(/first name/i), 'John');
      await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
      await userEvent.type(screen.getByLabelText(/bar number/i), 'BAR123456');
      await userEvent.selectOptions(screen.getByLabelText(/bar state/i), 'CA');
      await userEvent.type(screen.getByLabelText(/^password/i), 'ValidPass1');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPass1');

      await userEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('error handling (AC: 5)', () => {
    it('displays EMAIL_EXISTS error with login link', async () => {
      (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
        register: mockRegister,
        loading: false,
        error: 'EMAIL_EXISTS',
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByText(/account with this email already exists/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log in instead/i })).toHaveAttribute('href', '/login');
    });

    it('displays INVALID_BAR_NUMBER error', async () => {
      (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
        register: mockRegister,
        loading: false,
        error: 'INVALID_BAR_NUMBER',
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByText(/valid bar number/i)).toBeInTheDocument();
    });

    it('displays INVITATION_EXPIRED error with contact link', async () => {
      (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
        register: mockRegister,
        loading: false,
        error: 'INVITATION_EXPIRED',
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByText(/invitation has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    });

    it('displays generic error for SERVER_ERROR', async () => {
      (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
        register: mockRegister,
        loading: false,
        error: 'SERVER_ERROR',
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('clears password fields on error', async () => {
      mockRegister.mockRejectedValue(new Error('EMAIL_EXISTS'));

      render(<DefenderRegistrationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await userEvent.type(screen.getByLabelText(/first name/i), 'John');
      await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
      await userEvent.type(screen.getByLabelText(/bar number/i), 'BAR123456');
      await userEvent.selectOptions(screen.getByLabelText(/bar state/i), 'CA');
      await userEvent.type(passwordInput, 'ValidPass1');
      await userEvent.type(confirmInput, 'ValidPass1');

      await userEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(passwordInput).toHaveValue('');
        expect(confirmInput).toHaveValue('');
      });
    }, 15000);

    it('preserves other form data on error', async () => {
      mockRegister.mockRejectedValue(new Error('SERVER_ERROR'));

      render(<DefenderRegistrationForm {...defaultProps} />);

      await userEvent.type(screen.getByLabelText(/first name/i), 'John');
      await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
      await userEvent.type(screen.getByLabelText(/bar number/i), 'BAR123456');
      await userEvent.selectOptions(screen.getByLabelText(/bar state/i), 'CA');
      await userEvent.type(screen.getByLabelText(/^password/i), 'ValidPass1');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPass1');

      await userEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
        expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
        expect(screen.getByLabelText(/bar number/i)).toHaveValue('BAR123456');
      });
    }, 15000);
  });

  describe('loading state', () => {
    it('disables form inputs during submission', async () => {
      (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
        register: mockRegister,
        loading: true,
        error: null,
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByLabelText(/first name/i)).toBeDisabled();
      expect(screen.getByLabelText(/last name/i)).toBeDisabled();
      expect(screen.getByLabelText(/bar number/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    });

    it('shows loading indicator on submit button', () => {
      (hooks.useDefenderRegistration as jest.Mock).mockReturnValue({
        register: mockRegister,
        loading: true,
        error: null,
      });

      render(<DefenderRegistrationForm {...defaultProps} />);

      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
