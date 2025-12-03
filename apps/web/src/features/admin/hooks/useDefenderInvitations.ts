'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface DefenderInvitation {
  id: string;
  email: string;
  token: string;
  invitedBy: string;
  organizationName?: string;
  expiresAt: string;
  redeemedAt?: string;
  createdAt: string;
}

export interface InvitationStats {
  total: number;
  pending: number;
  redeemed: number;
  expired: number;
}

interface UseDefenderInvitationsResult {
  invitations: DefenderInvitation[];
  stats: InvitationStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDefenderInvitations(): UseDefenderInvitationsResult {
  const [invitations, setInvitations] = useState<DefenderInvitation[]>([]);
  const [stats, setStats] = useState<InvitationStats>({ total: 0, pending: 0, redeemed: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/invitations`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invitations: ${response.statusText}`);
      }

      const responseData = await response.json();
      // Handle API response wrapper: { data: { invitations: [...] } }
      const payload = responseData.data || responseData;
      const invitationList = payload.invitations || payload || [];

      // Ensure invitationList is an array
      const invitations = Array.isArray(invitationList) ? invitationList : [];
      setInvitations(invitations);

      // Calculate stats from the data
      const now = new Date();
      const calculatedStats: InvitationStats = {
        total: 0,
        pending: 0,
        redeemed: 0,
        expired: 0,
      };

      invitations.forEach((inv: DefenderInvitation) => {
        calculatedStats.total++;
        const expiresAt = new Date(inv.expiresAt);

        if (inv.redeemedAt) {
          calculatedStats.redeemed++;
        } else if (expiresAt <= now) {
          calculatedStats.expired++;
        } else {
          calculatedStats.pending++;
        }
      });

      setStats(calculatedStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invitations';
      setError(errorMessage);
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    stats,
    loading,
    error,
    refetch: fetchInvitations,
  };
}

interface SendInvitationParams {
  email: string;
  organizationName?: string;
}

interface UseSendInvitationResult {
  sendInvitation: (params: SendInvitationParams) => Promise<DefenderInvitation>;
  loading: boolean;
  error: string | null;
}

export function useSendInvitation(): UseSendInvitationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitation = useCallback(async (params: SendInvitationParams): Promise<DefenderInvitation> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/invitations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to send invitation: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendInvitation, loading, error };
}

interface UseResendInvitationResult {
  resendInvitation: (invitationId: string) => Promise<DefenderInvitation>;
  loading: boolean;
  error: string | null;
}

export function useResendInvitation(): UseResendInvitationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resendInvitation = useCallback(async (invitationId: string): Promise<DefenderInvitation> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to resend invitation: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resendInvitation, loading, error };
}

interface UseRevokeInvitationResult {
  revokeInvitation: (invitationId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useRevokeInvitation(): UseRevokeInvitationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeInvitation = useCallback(async (invitationId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/invitations/${invitationId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to revoke invitation: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { revokeInvitation, loading, error };
}
