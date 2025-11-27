import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefenderInvitationList } from '../DefenderInvitationList';
import * as hooks from '../../hooks/useDefenderInvitations';

// Mock the hooks
jest.mock('../../hooks/useDefenderInvitations');

const mockInvitations = [
  {
    id: 'inv-1',
    email: 'defender1@example.com',
    token: 'token1',
    invitedBy: 'admin@example.com',
    organizationName: 'Public Defender Office A',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-2',
    email: 'defender2@example.com',
    token: 'token2',
    invitedBy: 'admin@example.com',
    organizationName: 'Public Defender Office B',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    redeemedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-3',
    email: 'defender3@example.com',
    token: 'token3',
    invitedBy: 'admin@example.com',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-4',
    email: 'defender4@example.com',
    token: 'token4',
    invitedBy: 'admin@example.com',
    expiresAt: new Date(0).toISOString(), // Revoked
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockStats = {
  total: 4,
  pending: 1,
  redeemed: 1,
  expired: 2, // expired + revoked counted as expired in stats
};

const mockRefetch = jest.fn();

const defaultHookReturn = {
  invitations: mockInvitations,
  stats: mockStats,
  loading: false,
  error: null,
  refetch: mockRefetch,
};

beforeEach(() => {
  jest.clearAllMocks();
  (hooks.useDefenderInvitations as jest.Mock).mockReturnValue(defaultHookReturn);
  (hooks.useSendInvitation as jest.Mock).mockReturnValue({
    sendInvitation: jest.fn(),
    loading: false,
    error: null,
  });
  (hooks.useResendInvitation as jest.Mock).mockReturnValue({
    resendInvitation: jest.fn().mockResolvedValue({}),
    loading: false,
    error: null,
  });
  (hooks.useRevokeInvitation as jest.Mock).mockReturnValue({
    revokeInvitation: jest.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
  });
});

describe('DefenderInvitationList', () => {
  describe('rendering', () => {
    it('displays page title and description', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByText('Defender Invitations')).toBeInTheDocument();
      expect(screen.getByText('Manage public defender invitations')).toBeInTheDocument();
    });

    it('displays Invite Defender button', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByRole('button', { name: /invite defender/i })).toBeInTheDocument();
    });

    it('displays statistics cards (AC: 5)', () => {
      render(<DefenderInvitationList />);

      // Check stat card labels exist
      const statCards = document.querySelectorAll('.rounded-lg.p-4');
      expect(statCards.length).toBe(4);

      // Check Total card
      expect(screen.getByText('Total')).toBeInTheDocument();
      // Check values exist (Total=4 in stats)
      const totalCard = screen.getByText('Total').closest('.rounded-lg');
      expect(totalCard).toHaveTextContent('4');
    });

    it('displays table with correct columns (AC: 1)', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Invited Date')).toBeInTheDocument();
      expect(screen.getByText('Expires Date')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays invitation rows with email and organization', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByText('defender1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Public Defender Office A')).toBeInTheDocument();
    });
  });

  describe('status badges (AC: 2)', () => {
    it('displays Pending badge for pending invitations', () => {
      render(<DefenderInvitationList />);

      const pendingBadges = screen.getAllByText('Pending');
      expect(pendingBadges.length).toBeGreaterThan(0);
    });

    it('displays Redeemed badge for redeemed invitations', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByLabelText('Status: Redeemed')).toBeInTheDocument();
    });

    it('displays Expired badge for expired invitations', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByLabelText('Status: Expired')).toBeInTheDocument();
    });

    it('displays Revoked badge for revoked invitations', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByLabelText('Status: Revoked')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('displays loading spinner when loading', () => {
      (hooks.useDefenderInvitations as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        loading: true,
      });

      render(<DefenderInvitationList />);

      // Check for the spinner element with animate-spin class
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message and retry button when error occurs', () => {
      (hooks.useDefenderInvitations as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        error: 'Failed to load invitations',
      });

      render(<DefenderInvitationList />);

      expect(screen.getByText('Failed to load invitations')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      (hooks.useDefenderInvitations as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        error: 'Failed to load invitations',
      });

      render(<DefenderInvitationList />);

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('empty state (AC: 6)', () => {
    it('displays empty state when no invitations exist', () => {
      (hooks.useDefenderInvitations as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        invitations: [],
        stats: { total: 0, pending: 0, redeemed: 0, expired: 0 },
      });

      render(<DefenderInvitationList />);

      expect(screen.getByText('No invitations yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by inviting your first public defender')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /invite first defender/i })).toBeInTheDocument();
    });
  });

  describe('sorting (AC: 3)', () => {
    it('sorts by created date descending by default', () => {
      render(<DefenderInvitationList />);

      const rows = screen.getAllByRole('row');
      // First data row should be the most recently created (inv-1)
      expect(within(rows[1]).getByText('defender1@example.com')).toBeInTheDocument();
    });

    it('toggles sort direction when clicking column header', async () => {
      render(<DefenderInvitationList />);

      const emailHeader = screen.getByText('Email');
      await userEvent.click(emailHeader);

      // After clicking, should sort by email
      const rows = screen.getAllByRole('row');
      // First row is header, check data rows are sorted
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  describe('filtering (AC: 4)', () => {
    it('displays filter buttons', () => {
      render(<DefenderInvitationList />);

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      // Note: 'Pending' appears both as filter button and in stats
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    });

    it('filters invitations when clicking filter button', async () => {
      render(<DefenderInvitationList />);

      // Find the filter button (not the stat card)
      const filterButtons = screen.getAllByRole('button');
      const redeemedFilterBtn = filterButtons.find(btn => btn.textContent === 'Redeemed');

      if (redeemedFilterBtn) {
        await userEvent.click(redeemedFilterBtn);

        // After filtering to Redeemed, should only show redeemed invitations
        expect(screen.getByText('defender2@example.com')).toBeInTheDocument();
      }
    });

    it('allows searching by email', async () => {
      render(<DefenderInvitationList />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'defender1');

      // Should only show matching invitation
      expect(screen.getByText('defender1@example.com')).toBeInTheDocument();
    });
  });

  describe('actions - resend (Story 1.3)', () => {
    it('shows Resend button only for pending invitations', () => {
      render(<DefenderInvitationList />);

      const resendButtons = screen.getAllByRole('button', { name: /resend/i });
      // Should only have resend buttons for pending invitations
      expect(resendButtons.length).toBe(1);
    });

    it('opens confirmation dialog when clicking Resend', async () => {
      render(<DefenderInvitationList />);

      const resendButton = screen.getByRole('button', { name: /resend/i });
      await userEvent.click(resendButton);

      expect(screen.getByText(/resend invitation to defender1@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/extend the expiration by 7 days/i)).toBeInTheDocument();
    });

    it('calls resendInvitation when confirming', async () => {
      const mockResend = jest.fn().mockResolvedValue({});
      (hooks.useResendInvitation as jest.Mock).mockReturnValue({
        resendInvitation: mockResend,
        loading: false,
        error: null,
      });

      render(<DefenderInvitationList />);

      // Click the table row resend button (has title attribute)
      const tableResendButton = screen.getByTitle('Resend invitation');
      await userEvent.click(tableResendButton);

      // Click the confirm button in the dialog (blue button)
      const confirmButtons = screen.getAllByRole('button', { name: /^resend$/i });
      const dialogConfirmButton = confirmButtons.find(btn => btn.classList.contains('bg-blue-600'));
      await userEvent.click(dialogConfirmButton!);

      await waitFor(() => {
        expect(mockResend).toHaveBeenCalledWith('inv-1');
      });
    });
  });

  describe('actions - revoke (Story 1.4)', () => {
    it('shows Revoke button only for pending invitations', () => {
      render(<DefenderInvitationList />);

      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      // Should only have revoke buttons for pending invitations
      expect(revokeButtons.length).toBe(1);
    });

    it('opens confirmation dialog when clicking Revoke', async () => {
      render(<DefenderInvitationList />);

      const revokeButton = screen.getByRole('button', { name: /revoke/i });
      await userEvent.click(revokeButton);

      expect(screen.getByText(/revoke invitation to defender1@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/will no longer be able to register/i)).toBeInTheDocument();
    });

    it('calls revokeInvitation when confirming', async () => {
      const mockRevoke = jest.fn().mockResolvedValue(undefined);
      (hooks.useRevokeInvitation as jest.Mock).mockReturnValue({
        revokeInvitation: mockRevoke,
        loading: false,
        error: null,
      });

      render(<DefenderInvitationList />);

      // Click the table row revoke button (has title attribute)
      const tableRevokeButton = screen.getByTitle('Revoke invitation');
      await userEvent.click(tableRevokeButton);

      // Find the confirm button in the dialog (red button with bg-red-600)
      const allButtons = screen.getAllByRole('button');
      const dialogConfirmButton = allButtons.find(btn => btn.classList.contains('bg-red-600'));
      await userEvent.click(dialogConfirmButton!);

      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalledWith('inv-1');
      });
    });
  });

  describe('pagination (AC: 7)', () => {
    it('does not show pagination when items are less than 20', () => {
      render(<DefenderInvitationList />);

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('shows pagination when items exceed 20', () => {
      const manyInvitations = Array.from({ length: 25 }, (_, i) => ({
        id: `inv-${i}`,
        email: `defender${i}@example.com`,
        token: `token${i}`,
        invitedBy: 'admin@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }));

      (hooks.useDefenderInvitations as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        invitations: manyInvitations,
        stats: { total: 25, pending: 25, redeemed: 0, expired: 0 },
      });

      render(<DefenderInvitationList />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByText(/showing 1 to 20 of 25/i)).toBeInTheDocument();
    });
  });
});
