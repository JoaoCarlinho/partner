/**
 * Negotiation Timeline Component
 * Visual timeline of negotiation rounds
 */

import React from 'react';

/**
 * Negotiation round data
 */
interface NegotiationRound {
  roundNumber: number;
  proposedBy: 'creditor' | 'debtor';
  timestamp: string | Date;
  proposal: {
    downPayment: number;
    paymentAmount: number;
    frequency: string;
    numPayments: number;
    startDate: string;
  };
  counterProposal?: {
    downPayment: number;
    paymentAmount: number;
    frequency: string;
    numPayments: number;
    startDate: string;
    reason?: string;
  };
  status: string;
}

/**
 * Props
 */
interface NegotiationTimelineProps {
  rounds: NegotiationRound[];
  currentStatus: string;
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

/**
 * Format date
 */
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Frequency labels
 */
const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'bi-weekly',
  MONTHLY: 'monthly',
};

/**
 * Proposal card sub-component
 */
const ProposalCard: React.FC<{
  proposal: NegotiationRound['proposal'];
  label: string;
  variant: 'creditor' | 'debtor';
  reason?: string;
}> = ({ proposal, label, variant, reason }) => {
  const variantStyles = {
    creditor: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'text-blue-700',
    },
    debtor: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      label: 'text-orange-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
      <p className={`text-xs font-medium ${styles.label} mb-2`}>{label}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Payment:</span>
          <span className="ml-1 font-medium">{formatCurrency(proposal.paymentAmount)}</span>
          <span className="text-gray-400 text-xs ml-1">
            {FREQUENCY_LABELS[proposal.frequency] || proposal.frequency}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Down:</span>
          <span className="ml-1 font-medium">{formatCurrency(proposal.downPayment)}</span>
        </div>
        <div>
          <span className="text-gray-500">Payments:</span>
          <span className="ml-1 font-medium">{proposal.numPayments}</span>
        </div>
        <div>
          <span className="text-gray-500">Start:</span>
          <span className="ml-1 font-medium">
            {new Date(proposal.startDate).toLocaleDateString()}
          </span>
        </div>
      </div>
      {reason && (
        <p className="mt-2 text-xs text-gray-600 italic border-t border-gray-200 pt-2">
          "{reason}"
        </p>
      )}
    </div>
  );
};

export const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({
  rounds,
  currentStatus,
  className = '',
}) => {
  if (rounds.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No negotiation activity yet</p>
        <p className="text-sm">Waiting for initial proposal</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {rounds.map((round, index) => (
        <div key={round.roundNumber} className="relative">
          {/* Timeline connector */}
          {index < rounds.length - 1 && (
            <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
          )}

          {/* Round header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
              {round.roundNumber}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Round {round.roundNumber}</p>
              <p className="text-xs text-gray-500">{formatDate(round.timestamp)}</p>
            </div>
            <span
              className={`ml-auto px-2 py-0.5 text-xs rounded ${
                round.status === 'ACCEPTED'
                  ? 'bg-green-100 text-green-700'
                  : round.status === 'COUNTERED'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              {round.status}
            </span>
          </div>

          {/* Proposals */}
          <div className="ml-11 space-y-2">
            <ProposalCard
              proposal={round.proposal}
              label="Creditor Proposal"
              variant="creditor"
            />
            {round.counterProposal && (
              <ProposalCard
                proposal={round.counterProposal}
                label="Debtor Counter"
                variant="debtor"
                reason={round.counterProposal.reason}
              />
            )}
          </div>
        </div>
      ))}

      {/* Current status indicator */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
            currentStatus === 'ACCEPTED'
              ? 'bg-green-500'
              : currentStatus === 'REJECTED' || currentStatus === 'EXPIRED'
                ? 'bg-red-500'
                : 'bg-gray-400'
          }`}
        >
          {currentStatus === 'ACCEPTED'
            ? '✓'
            : currentStatus === 'REJECTED'
              ? '✕'
              : '•'}
        </div>
        <p className="text-sm font-medium text-gray-900">
          {currentStatus === 'ACCEPTED'
            ? 'Agreement Reached'
            : currentStatus === 'REJECTED'
              ? 'Negotiation Rejected'
              : currentStatus === 'EXPIRED'
                ? 'Negotiation Expired'
                : 'Negotiation In Progress'}
        </p>
      </div>
    </div>
  );
};

export default NegotiationTimeline;
