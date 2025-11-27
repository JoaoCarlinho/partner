/**
 * useApprovalWorkflow - Hook for managing demand letter approval workflow
 * Story 5.1: Submit for Review (AC-5.1.5, AC-5.1.6)
 * Story 5.2: Approve or Reject (AC-5.2.5, AC-5.2.6, AC-5.2.10, AC-5.2.11)
 * Story 5.3: Prepare and Send (AC-5.3.2, AC-5.3.3, AC-5.3.6, AC-5.3.7)
 */

import { useState, useCallback } from 'react';
import { DemandLetterStatus } from '@/components/StatusBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

/**
 * Response from submit for review API
 */
export interface SubmitForReviewResponse {
  id: string;
  status: 'PENDING_REVIEW';
  submittedAt: string;
  submittedBy: string;
}

/**
 * Response from approve API
 */
export interface ApproveResponse {
  id: string;
  status: 'APPROVED';
  approvedAt: string;
  approvedBy: string;
  signature?: string;
}

/**
 * Response from reject API
 */
export interface RejectResponse {
  id: string;
  status: 'DRAFT';
  rejectedAt: string;
  rejectedBy: string;
  reason: string;
}

/**
 * Response from prepare-send API
 */
export interface PrepareSendResponse {
  id: string;
  status: 'READY_TO_SEND';
  preparedAt: string;
}

/**
 * Response from send API
 */
export interface SendResponse {
  id: string;
  status: 'SENT';
  sentAt: string;
}

/**
 * Workflow error with optional details
 */
export interface WorkflowError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Hook return type
 */
export interface UseApprovalWorkflowReturn {
  // States
  isSubmitting: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  isPreparing: boolean;
  isSending: boolean;
  error: WorkflowError | null;

  // Actions
  submitForReview: (letterId: string) => Promise<SubmitForReviewResponse>;
  approveRequest: (letterId: string, signature?: string) => Promise<ApproveResponse>;
  rejectRequest: (letterId: string, reason: string) => Promise<RejectResponse>;
  prepareSend: (letterId: string) => Promise<PrepareSendResponse>;
  markAsSent: (letterId: string) => Promise<SendResponse>;
  clearError: () => void;
}

/**
 * Get auth headers for API calls
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Parse API error response
 */
async function parseErrorResponse(response: Response): Promise<WorkflowError> {
  try {
    const data = await response.json();
    return {
      message: data.error?.message || data.message || `Request failed (${response.status})`,
      code: data.error?.code,
      status: response.status,
    };
  } catch {
    return {
      message: `Request failed (${response.status})`,
      status: response.status,
    };
  }
}

/**
 * useApprovalWorkflow - Manages approval workflow API calls and state
 */
export function useApprovalWorkflow(): UseApprovalWorkflowReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<WorkflowError | null>(null);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Submit letter for review (AC-5.1.5, AC-5.1.6)
   */
  const submitForReview = useCallback(async (letterId: string): Promise<SubmitForReviewResponse> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/submit-for-review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await parseErrorResponse(response);
        setError(err);
        throw new Error(err.message);
      }

      const data = await response.json();
      return data.data || data;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Approve letter (AC-5.2.5, AC-5.2.6)
   * IP address and user agent are captured server-side
   */
  const approveRequest = useCallback(async (letterId: string, signature?: string): Promise<ApproveResponse> => {
    setIsApproving(true);
    setError(null);

    try {
      const body = signature ? { signature } : undefined;

      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        ...(body && { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        const err = await parseErrorResponse(response);
        setError(err);
        throw new Error(err.message);
      }

      const data = await response.json();
      return data.data || data;
    } finally {
      setIsApproving(false);
    }
  }, []);

  /**
   * Reject letter (AC-5.2.10, AC-5.2.11)
   */
  const rejectRequest = useCallback(async (letterId: string, reason: string): Promise<RejectResponse> => {
    setIsRejecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const err = await parseErrorResponse(response);
        setError(err);
        throw new Error(err.message);
      }

      const data = await response.json();
      return data.data || data;
    } finally {
      setIsRejecting(false);
    }
  }, []);

  /**
   * Prepare letter for sending (AC-5.3.2, AC-5.3.3)
   */
  const prepareSend = useCallback(async (letterId: string): Promise<PrepareSendResponse> => {
    setIsPreparing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/prepare-send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await parseErrorResponse(response);
        setError(err);
        throw new Error(err.message);
      }

      const data = await response.json();
      return data.data || data;
    } finally {
      setIsPreparing(false);
    }
  }, []);

  /**
   * Mark letter as sent (AC-5.3.6, AC-5.3.7)
   */
  const markAsSent = useCallback(async (letterId: string): Promise<SendResponse> => {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await parseErrorResponse(response);
        setError(err);
        throw new Error(err.message);
      }

      const data = await response.json();
      return data.data || data;
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    isSubmitting,
    isApproving,
    isRejecting,
    isPreparing,
    isSending,
    error,
    submitForReview,
    approveRequest,
    rejectRequest,
    prepareSend,
    markAsSent,
    clearError,
  };
}

export default useApprovalWorkflow;
