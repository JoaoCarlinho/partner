/**
 * ApprovalHistoryTimeline - Timeline display of approval workflow actions
 * Story 5.4: Approval History Timeline
 * (AC-5.4.1, AC-5.4.2, AC-5.4.3, AC-5.4.4, AC-5.4.5, AC-5.4.6, AC-5.4.7)
 * Story 5.5: Digital Signature Capture (AC-5.5.5)
 */

'use client';

import { useEffect } from 'react';
import {
  Upload,
  CheckCircle,
  XCircle,
  FileCheck,
  Send,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge, DemandLetterStatus } from '@/components/StatusBadge';
import { useApprovalHistory, ApprovalHistoryEntry, ApprovalActionType } from '@/hooks/useApprovalHistory';

/**
 * Action type to icon mapping (AC-5.4.2)
 */
const ACTION_ICONS: Record<ApprovalActionType, React.ElementType> = {
  SUBMITTED_FOR_REVIEW: Upload,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  PREPARED_FOR_SEND: FileCheck,
  SENT: Send,
};

/**
 * Action type to color mapping
 */
const ACTION_COLORS: Record<ApprovalActionType, { bg: string; icon: string; border: string }> = {
  SUBMITTED_FOR_REVIEW: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-200' },
  APPROVED: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-green-200' },
  REJECTED: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-red-200' },
  PREPARED_FOR_SEND: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-200' },
  SENT: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-200' },
};

/**
 * Action type to display label mapping
 */
const ACTION_LABELS: Record<ApprovalActionType, string> = {
  SUBMITTED_FOR_REVIEW: 'Submitted for Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PREPARED_FOR_SEND: 'Prepared for Send',
  SENT: 'Sent',
};

/**
 * Format timestamp as human-readable (AC-5.4.4)
 * e.g., "Nov 26, 2025 at 2:30 PM"
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format role for display (AC-5.4.3)
 */
function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

interface ApprovalHistoryTimelineProps {
  /** Demand letter ID */
  demandId: string;
  /** Trigger refresh (increment to refresh) */
  refreshTrigger?: number;
}

/**
 * TimelineEntry - Individual entry in the timeline
 */
function TimelineEntry({ entry, isLast }: { entry: ApprovalHistoryEntry; isLast: boolean }) {
  const Icon = ACTION_ICONS[entry.action] || Clock;
  const colors = ACTION_COLORS[entry.action] || { bg: 'bg-gray-100', icon: 'text-gray-600', border: 'border-gray-200' };
  const label = ACTION_LABELS[entry.action] || entry.action;

  return (
    <div className="relative flex gap-4" data-testid="timeline-entry">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />
      )}

      {/* Icon circle (AC-5.4.2) */}
      <div
        className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center`}
      >
        <Icon className={`w-4 h-4 ${colors.icon}`} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        {/* Action label */}
        <p className={`font-medium ${colors.icon}`}>
          {label}
        </p>

        {/* User info (AC-5.4.3) */}
        <p className="text-sm text-gray-600">
          {entry.userEmail}
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {formatRole(entry.userRole)}
          </span>
        </p>

        {/* Timestamp (AC-5.4.4) */}
        <p className="text-xs text-gray-500 mt-1">
          {formatTimestamp(entry.timestamp)}
        </p>

        {/* Rejection reason (AC-5.4.5) */}
        {entry.action === 'REJECTED' && entry.details?.reason && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-sm text-red-700">
            <strong>Reason:</strong> {entry.details.reason}
          </div>
        )}

        {/* Signature display (AC-5.5.5) */}
        {entry.action === 'APPROVED' && entry.details?.signature && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Digital Signature:</p>
            <img
              src={entry.details.signature}
              alt="Digital signature"
              className="max-w-[200px] h-auto border border-gray-200 rounded bg-white p-1"
              data-testid="approval-signature"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ApprovalHistoryTimeline - Displays the approval workflow history
 */
export function ApprovalHistoryTimeline({
  demandId,
  refreshTrigger = 0,
}: ApprovalHistoryTimelineProps) {
  const { history, currentStatus, loading, error, refresh } = useApprovalHistory(demandId);

  // Refresh when trigger changes (AC-5.4.7)
  useEffect(() => {
    if (refreshTrigger > 0) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="approval-history-timeline"
    >
      {/* Header with current status (AC-5.4.6) */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Approval History</h3>
        <button
          onClick={() => refresh()}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title="Refresh history"
          aria-label="Refresh history"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Current Status (AC-5.4.6) */}
      {currentStatus && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Current Status</p>
          <StatusBadge status={currentStatus} />
        </div>
      )}

      {/* Loading state */}
      {loading && history.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button
            onClick={() => refresh()}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="text-center py-6">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No approval history yet</p>
        </div>
      )}

      {/* Timeline (AC-5.4.1) */}
      {history.length > 0 && (
        <div className="space-y-0">
          {history.map((entry, index) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              isLast={index === history.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ApprovalHistoryTimeline;
