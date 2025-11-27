'use client';

export type InvitationStatus = 'pending' | 'redeemed' | 'expired' | 'revoked';

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  redeemed: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
  revoked: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Pending',
  redeemed: 'Redeemed',
  expired: 'Expired',
  revoked: 'Revoked',
};

interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  className?: string;
}

export function InvitationStatusBadge({ status, className = '' }: InvitationStatusBadgeProps) {
  const colorClasses = INVITATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses} ${className}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}

/**
 * Determines invitation status from invitation data
 */
export function getInvitationStatus(invitation: {
  redeemedAt?: Date | string | null;
  expiresAt: Date | string;
}): InvitationStatus {
  const now = new Date();
  const expiresAt = new Date(invitation.expiresAt);

  if (invitation.redeemedAt) {
    return 'redeemed';
  }

  // Revoked invitations have expiration set to epoch (Jan 1, 1970)
  if (expiresAt.getTime() < new Date('1970-01-02').getTime()) {
    return 'revoked';
  }

  if (expiresAt <= now) {
    return 'expired';
  }

  return 'pending';
}
