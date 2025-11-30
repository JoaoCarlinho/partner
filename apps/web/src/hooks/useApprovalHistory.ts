/**
 * useApprovalHistory - Hook for fetching approval history timeline
 * Story 5.4: Approval History Timeline (AC-5.4.1, AC-5.4.7)
 */

import { useState, useCallback, useEffect } from 'react';
import { DemandLetterStatus } from '@/components/StatusBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

/**
 * Approval action types
 */
export type ApprovalActionType =
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PREPARED_FOR_SEND'
  | 'SENT';

/**
 * User role types
 */
export type UserRole = 'FIRM_ADMIN' | 'ATTORNEY' | 'PARALEGAL' | 'DEBTOR' | 'PUBLIC_DEFENDER';

/**
 * Approval history entry (AC-5.4.2, AC-5.4.3, AC-5.4.4, AC-5.4.5)
 */
export interface ApprovalHistoryEntry {
  /** Entry ID */
  id: string;
  /** Action type */
  action: ApprovalActionType;
  /** User ID who performed the action */
  userId: string;
  /** User email */
  userEmail: string;
  /** User role */
  userRole: UserRole;
  /** Timestamp of the action */
  timestamp: string;
  /** Additional details (rejection reason, signature, etc.) */
  details?: {
    reason?: string;
    signature?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Approval history response from API
 */
export interface ApprovalHistoryResponse {
  /** Demand letter ID */
  demandId: string;
  /** Current status */
  currentStatus: DemandLetterStatus;
  /** History entries (newest first) */
  history: ApprovalHistoryEntry[];
}

/**
 * Hook return type
 */
export interface UseApprovalHistoryReturn {
  /** History entries */
  history: ApprovalHistoryEntry[];
  /** Current status */
  currentStatus: DemandLetterStatus | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh history data */
  refresh: () => Promise<void>;
}

/**
 * useApprovalHistory - Fetches and manages approval history data
 */
export function useApprovalHistory(demandId: string): UseApprovalHistoryReturn {
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [currentStatus, setCurrentStatus] = useState<DemandLetterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch history from API (AC-5.4.1)
   */
  const fetchHistory = useCallback(async () => {
    if (!demandId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/${demandId}/approvals`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || `Failed to fetch history (${response.status})`);
      }

      const responseData = await response.json();
      // Handle both wrapped ({ data: {...} }) and unwrapped API responses
      const historyData: ApprovalHistoryResponse = responseData.data || responseData;

      setHistory(historyData.history || []);
      setCurrentStatus(historyData.currentStatus || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [demandId]);

  /**
   * Refresh function for external use (AC-5.4.7)
   */
  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    currentStatus,
    loading,
    error,
    refresh,
  };
}

export default useApprovalHistory;
