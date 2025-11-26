/**
 * Negotiation Panel Component
 * Main panel for managing plan negotiations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { NegotiationTimeline } from './NegotiationTimeline';
import { CounterOfferForm } from './CounterOfferForm';

/**
 * Negotiation session data
 */
interface NegotiationSession {
  id: string;
  demandId: string;
  totalAmount: number;
  status: string;
  rounds: Array<{
    roundNumber: number;
    proposedBy: 'creditor' | 'debtor';
    timestamp: string;
    proposal: {
      downPayment: number;
      paymentAmount: number;
      frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      numPayments: number;
      startDate: string;
    };
    counterProposal?: {
      downPayment: number;
      paymentAmount: number;
      frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      numPayments: number;
      startDate: string;
      reason?: string;
    };
    status: string;
  }>;
  finalAgreement?: {
    downPayment: number;
    paymentAmount: number;
    frequency: string;
    numPayments: number;
    startDate: string;
    agreedAt: string;
  };
  createdAt: string;
  expiresAt: string;
}

/**
 * Progress data
 */
interface NegotiationProgress {
  roundsCompleted: number;
  maxRounds: number;
  convergencePercent: number;
  status: string;
  timeRemaining?: string;
}

/**
 * Props
 */
interface NegotiationPanelProps {
  negotiationId: string;
  userRole: 'creditor' | 'debtor';
  onAgreementReached?: (agreement: NegotiationSession['finalAgreement']) => void;
  onNegotiationEnded?: (status: string) => void;
  className?: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export const NegotiationPanel: React.FC<NegotiationPanelProps> = ({
  negotiationId,
  userRole,
  onAgreementReached,
  onNegotiationEnded,
  className = '',
}) => {
  // State
  const [session, setSession] = useState<NegotiationSession | null>(null);
  const [progress, setProgress] = useState<NegotiationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCompromise, setShowCompromise] = useState(false);

  /**
   * Fetch negotiation data
   */
  const fetchNegotiation = useCallback(async () => {
    try {
      const response = await fetch(`/api/negotiations/${negotiationId}`);
      if (!response.ok) throw new Error('Failed to load negotiation');

      const data = await response.json();
      setSession(data.session);
      setProgress(data.progress);

      // Check for agreement
      if (data.session.status === 'ACCEPTED' && data.session.finalAgreement) {
        onAgreementReached?.(data.session.finalAgreement);
      }

      // Check for ended states
      if (['REJECTED', 'EXPIRED'].includes(data.session.status)) {
        onNegotiationEnded?.(data.session.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [negotiationId, onAgreementReached, onNegotiationEnded]);

  useEffect(() => {
    fetchNegotiation();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchNegotiation, 10000);
    return () => clearInterval(interval);
  }, [fetchNegotiation]);

  /**
   * Handle counter-offer submission
   */
  const handleCounterOffer = useCallback(
    async (counterOffer: {
      downPayment: number;
      paymentAmount: number;
      frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
      numPayments: number;
      startDate: string;
      reason: string;
    }) => {
      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/negotiations/${negotiationId}/counter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            counterProposal: counterOffer,
            reason: counterOffer.reason,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit counter-offer');
        }

        await fetchNegotiation();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit');
      } finally {
        setSubmitting(false);
      }
    },
    [negotiationId, fetchNegotiation]
  );

  /**
   * Handle accept
   */
  const handleAccept = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/negotiations/${negotiationId}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept');
      }

      await fetchNegotiation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setSubmitting(false);
    }
  }, [negotiationId, fetchNegotiation]);

  /**
   * Handle reject
   */
  const handleReject = useCallback(async () => {
    if (!confirm('Are you sure you want to reject this negotiation?')) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/negotiations/${negotiationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by ' + userRole }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      await fetchNegotiation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  }, [negotiationId, userRole, fetchNegotiation]);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2" />
        <p className="text-gray-600">Loading negotiation...</p>
      </div>
    );
  }

  // Error or not found
  if (!session) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <p className="text-red-600">{error || 'Negotiation not found'}</p>
      </div>
    );
  }

  const lastRound = session.rounds[session.rounds.length - 1];
  const currentProposal = lastRound?.counterProposal || lastRound?.proposal;
  const isAwaitingResponse =
    userRole === 'debtor' && session.status === 'PROPOSED' && lastRound?.proposedBy === 'creditor';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Payment Plan Negotiation</h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              session.status === 'ACCEPTED'
                ? 'bg-green-100 text-green-700'
                : session.status === 'REJECTED' || session.status === 'EXPIRED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
            }`}
          >
            {progress?.status}
          </span>
        </div>
        <p className="text-sm text-gray-600">Total amount: {formatCurrency(session.totalAmount)}</p>
      </div>

      {/* Progress bar */}
      {progress && session.status !== 'ACCEPTED' && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              Round {progress.roundsCompleted} of {progress.maxRounds}
            </span>
            {progress.timeRemaining && <span>Expires in {progress.timeRemaining}</span>}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 transition-all duration-500"
              style={{ width: `${(progress.roundsCompleted / progress.maxRounds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Agreement reached */}
      {session.status === 'ACCEPTED' && session.finalAgreement && (
        <div className="p-4 bg-green-50">
          <h4 className="font-medium text-green-800 mb-2">Agreement Reached!</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-green-600">Down Payment:</span>
              <span className="ml-1 font-medium text-green-900">
                {formatCurrency(session.finalAgreement.downPayment)}
              </span>
            </div>
            <div>
              <span className="text-green-600">Payment:</span>
              <span className="ml-1 font-medium text-green-900">
                {formatCurrency(session.finalAgreement.paymentAmount)}{' '}
                {session.finalAgreement.frequency.toLowerCase()}
              </span>
            </div>
            <div>
              <span className="text-green-600">Payments:</span>
              <span className="ml-1 font-medium text-green-900">
                {session.finalAgreement.numPayments}
              </span>
            </div>
            <div>
              <span className="text-green-600">Start:</span>
              <span className="ml-1 font-medium text-green-900">
                {new Date(session.finalAgreement.startDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-4">
        <NegotiationTimeline rounds={session.rounds} currentStatus={session.status} />
      </div>

      {/* Counter-offer form for debtor */}
      {isAwaitingResponse && currentProposal && (
        <div className="border-t border-gray-200 p-4">
          <CounterOfferForm
            currentProposal={currentProposal}
            totalAmount={session.totalAmount}
            onSubmit={handleCounterOffer}
            onAccept={handleAccept}
          />
        </div>
      )}

      {/* Actions for creditor when counter received */}
      {userRole === 'creditor' &&
        session.status === 'COUNTERED' &&
        lastRound?.counterProposal && (
          <div className="border-t border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-3">
              Debtor has submitted a counter-offer. Review and respond.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => setShowCompromise(true)}
                disabled={submitting}
                className="flex-1 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                Counter Again
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Accept Counter
              </button>
            </div>
          </div>
        )}

      {/* Loading overlay */}
      {submitting && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
};

export default NegotiationPanel;
