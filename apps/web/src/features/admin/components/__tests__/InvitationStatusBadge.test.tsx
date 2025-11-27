import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvitationStatusBadge, getInvitationStatus, InvitationStatus } from '../InvitationStatusBadge';

describe('InvitationStatusBadge', () => {
  const statuses: InvitationStatus[] = ['pending', 'redeemed', 'expired', 'revoked'];

  describe('rendering', () => {
    it.each(statuses)('renders %s status with correct label', (status) => {
      render(<InvitationStatusBadge status={status} />);

      const expectedLabels: Record<InvitationStatus, string> = {
        pending: 'Pending',
        redeemed: 'Redeemed',
        expired: 'Expired',
        revoked: 'Revoked',
      };

      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
    });

    it('renders pending status with yellow colors', () => {
      render(<InvitationStatusBadge status="pending" />);
      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('renders redeemed status with green colors', () => {
      render(<InvitationStatusBadge status="redeemed" />);
      const badge = screen.getByText('Redeemed');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('renders expired status with gray colors', () => {
      render(<InvitationStatusBadge status="expired" />);
      const badge = screen.getByText('Expired');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600');
    });

    it('renders revoked status with red colors', () => {
      render(<InvitationStatusBadge status="revoked" />);
      const badge = screen.getByText('Revoked');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('applies custom className', () => {
      render(<InvitationStatusBadge status="pending" className="custom-class" />);
      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('custom-class');
    });

    it('includes aria-label for accessibility', () => {
      render(<InvitationStatusBadge status="pending" />);
      const badge = screen.getByLabelText('Status: Pending');
      expect(badge).toBeInTheDocument();
    });
  });
});

describe('getInvitationStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-27T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "redeemed" when redeemedAt is set', () => {
    const invitation = {
      redeemedAt: '2025-11-25T10:00:00Z',
      expiresAt: '2025-12-01T10:00:00Z',
    };
    expect(getInvitationStatus(invitation)).toBe('redeemed');
  });

  it('returns "pending" when not redeemed and not expired', () => {
    const invitation = {
      redeemedAt: null,
      expiresAt: '2025-12-01T10:00:00Z',
    };
    expect(getInvitationStatus(invitation)).toBe('pending');
  });

  it('returns "expired" when expiresAt is in the past', () => {
    const invitation = {
      redeemedAt: null,
      expiresAt: '2025-11-20T10:00:00Z',
    };
    expect(getInvitationStatus(invitation)).toBe('expired');
  });

  it('returns "revoked" when expiresAt is epoch (soft delete)', () => {
    const invitation = {
      redeemedAt: null,
      expiresAt: '1970-01-01T00:00:00Z',
    };
    expect(getInvitationStatus(invitation)).toBe('revoked');
  });

  it('handles Date objects', () => {
    const invitation = {
      redeemedAt: undefined,
      expiresAt: new Date('2025-12-01T10:00:00Z'),
    };
    expect(getInvitationStatus(invitation)).toBe('pending');
  });
});
