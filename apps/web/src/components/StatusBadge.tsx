'use client';

export type DemandLetterStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'READY_TO_SEND' | 'SENT';

export const DEMAND_STATUS_COLORS: Record<DemandLetterStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  READY_TO_SEND: 'bg-blue-100 text-blue-800',
  SENT: 'bg-purple-100 text-purple-800',
};

const STATUS_LABELS: Record<DemandLetterStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  READY_TO_SEND: 'Ready to Send',
  SENT: 'Sent',
};

interface StatusBadgeProps {
  status: DemandLetterStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClasses = DEMAND_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
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
