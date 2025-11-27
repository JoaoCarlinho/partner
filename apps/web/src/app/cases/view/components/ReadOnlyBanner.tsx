'use client';

import { Lock } from 'lucide-react';
import { DemandLetterStatus } from '@/components/StatusBadge';
import { getReadOnlyMessage, isEditable } from '@/utils/demandLetterUtils';

interface ReadOnlyBannerProps {
  status: DemandLetterStatus;
  className?: string;
}

/**
 * ReadOnlyBanner - Displays status-specific message for non-editable letters
 * (AC-2.3.3, AC-2.3.6)
 */
export function ReadOnlyBanner({ status, className = '' }: ReadOnlyBannerProps) {
  // Don't show banner for editable statuses
  if (isEditable(status)) {
    return null;
  }

  const message = getReadOnlyMessage(status);
  if (!message) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4 ${className}`}
      role="alert"
      data-testid="read-only-banner"
    >
      <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <span className="text-sm text-blue-800">{message}</span>
    </div>
  );
}

export default ReadOnlyBanner;
