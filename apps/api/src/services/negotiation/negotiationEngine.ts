/**
 * Negotiation Engine Service
 * Handles payment plan counter-offers and negotiation logic
 */

/**
 * Negotiation status
 */
export enum NegotiationStatus {
  PENDING = 'PENDING',
  PROPOSED = 'PROPOSED',
  COUNTERED = 'COUNTERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Negotiation round
 */
export interface NegotiationRound {
  roundNumber: number;
  proposedBy: 'creditor' | 'debtor';
  timestamp: Date;
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
  status: NegotiationStatus;
}

/**
 * Full negotiation session
 */
export interface NegotiationSession {
  id: string;
  demandId: string;
  totalAmount: number;
  status: NegotiationStatus;
  rounds: NegotiationRound[];
  creditorLimits?: {
    minDownPaymentPercent: number;
    maxDurationMonths: number;
    minPaymentAmount: number;
  };
  debtorConstraints?: {
    maxPaymentAmount: number;
    preferredFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    maxDownPayment: number;
  };
  finalAgreement?: {
    downPayment: number;
    paymentAmount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    numPayments: number;
    startDate: string;
    agreedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * Counter-offer evaluation result
 */
export interface CounterOfferEvaluation {
  isAcceptable: boolean;
  acceptanceScore: number;
  concerns: string[];
  suggestions: string[];
  autoAcceptable: boolean;
  requiresReview: boolean;
}

/**
 * Evaluate a counter-offer against creditor limits
 */
export function evaluateCounterOffer(
  counterOffer: {
    downPayment: number;
    paymentAmount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    numPayments: number;
  },
  totalAmount: number,
  creditorLimits: {
    minDownPaymentPercent: number;
    maxDurationMonths: number;
    minPaymentAmount: number;
  }
): CounterOfferEvaluation {
  const concerns: string[] = [];
  const suggestions: string[] = [];
  let acceptanceScore = 100;

  // Evaluate down payment
  const downPaymentPercent = (counterOffer.downPayment / totalAmount) * 100;
  if (downPaymentPercent < creditorLimits.minDownPaymentPercent) {
    acceptanceScore -= 30;
    concerns.push(
      `Down payment (${downPaymentPercent.toFixed(1)}%) is below minimum (${creditorLimits.minDownPaymentPercent}%)`
    );
    suggestions.push(
      `Increase down payment to at least ${Math.ceil(totalAmount * (creditorLimits.minDownPaymentPercent / 100))}`
    );
  }

  // Evaluate payment amount
  if (counterOffer.paymentAmount < creditorLimits.minPaymentAmount) {
    acceptanceScore -= 25;
    concerns.push(
      `Payment amount ($${counterOffer.paymentAmount}) is below minimum ($${creditorLimits.minPaymentAmount})`
    );
    suggestions.push(`Increase payment to at least $${creditorLimits.minPaymentAmount}`);
  }

  // Evaluate duration
  const frequencyDays =
    counterOffer.frequency === 'WEEKLY' ? 7 : counterOffer.frequency === 'BIWEEKLY' ? 14 : 30;
  const durationMonths = Math.ceil((counterOffer.numPayments * frequencyDays) / 30);

  if (durationMonths > creditorLimits.maxDurationMonths) {
    acceptanceScore -= 25;
    concerns.push(
      `Duration (${durationMonths} months) exceeds maximum (${creditorLimits.maxDurationMonths} months)`
    );
    suggestions.push(`Reduce number of payments or increase payment amount`);
  }

  // Verify total recovery
  const totalRecovery = counterOffer.downPayment + counterOffer.paymentAmount * counterOffer.numPayments;
  if (totalRecovery < totalAmount * 0.95) {
    acceptanceScore -= 20;
    concerns.push(`Total recovery ($${totalRecovery}) doesn't cover full debt`);
    suggestions.push(`Adjust terms to ensure full debt recovery`);
  }

  const isAcceptable = acceptanceScore >= 70;
  const autoAcceptable = acceptanceScore >= 90 && concerns.length === 0;
  const requiresReview = acceptanceScore >= 50 && acceptanceScore < 90;

  return {
    isAcceptable,
    acceptanceScore,
    concerns,
    suggestions,
    autoAcceptable,
    requiresReview,
  };
}

/**
 * Generate compromise suggestion between parties
 */
export function suggestCompromise(
  creditorProposal: {
    downPayment: number;
    paymentAmount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    numPayments: number;
  },
  debtorCounter: {
    downPayment: number;
    paymentAmount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    numPayments: number;
  },
  totalAmount: number
): {
  downPayment: number;
  paymentAmount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  numPayments: number;
  reasoning: string;
} {
  // Find middle ground
  const compromiseDown = Math.round((creditorProposal.downPayment + debtorCounter.downPayment) / 2);
  const compromisePayment = Math.round((creditorProposal.paymentAmount + debtorCounter.paymentAmount) / 2);

  // Use debtor's preferred frequency if reasonable
  const frequency = debtorCounter.frequency;

  // Calculate payments needed
  const remaining = totalAmount - compromiseDown;
  const numPayments = Math.ceil(remaining / compromisePayment);

  return {
    downPayment: compromiseDown,
    paymentAmount: compromisePayment,
    frequency,
    numPayments,
    reasoning: `This compromise splits the difference: down payment of $${compromiseDown} (halfway between $${debtorCounter.downPayment} and $${creditorProposal.downPayment}) and ${frequency.toLowerCase()} payments of $${compromisePayment}.`,
  };
}

/**
 * Check if negotiation has reached maximum rounds
 */
export function hasReachedMaxRounds(session: NegotiationSession, maxRounds: number = 5): boolean {
  return session.rounds.length >= maxRounds;
}

/**
 * Get next action for negotiation
 */
export function getNextAction(
  session: NegotiationSession
): {
  actor: 'creditor' | 'debtor' | 'system';
  action: 'propose' | 'counter' | 'accept' | 'reject' | 'expired' | 'finalize';
  description: string;
} {
  if (session.status === NegotiationStatus.EXPIRED) {
    return {
      actor: 'system',
      action: 'expired',
      description: 'Negotiation has expired',
    };
  }

  if (session.status === NegotiationStatus.ACCEPTED) {
    return {
      actor: 'system',
      action: 'finalize',
      description: 'Agreement reached - ready to finalize',
    };
  }

  if (session.status === NegotiationStatus.REJECTED) {
    return {
      actor: 'system',
      action: 'reject',
      description: 'Negotiation was rejected',
    };
  }

  const lastRound = session.rounds[session.rounds.length - 1];

  if (!lastRound || lastRound.status === NegotiationStatus.ACCEPTED) {
    return {
      actor: 'creditor',
      action: 'propose',
      description: 'Creditor should make initial proposal',
    };
  }

  if (lastRound.proposedBy === 'creditor' && !lastRound.counterProposal) {
    return {
      actor: 'debtor',
      action: 'counter',
      description: 'Waiting for debtor response',
    };
  }

  if (lastRound.proposedBy === 'debtor' || lastRound.counterProposal) {
    return {
      actor: 'creditor',
      action: 'counter',
      description: 'Creditor should respond to counter-offer',
    };
  }

  return {
    actor: 'system',
    action: 'propose',
    description: 'Unknown state - waiting for proposal',
  };
}

/**
 * Calculate negotiation progress
 */
export function calculateNegotiationProgress(
  session: NegotiationSession
): {
  roundsCompleted: number;
  maxRounds: number;
  convergencePercent: number;
  status: string;
  timeRemaining?: string;
} {
  const maxRounds = 5;
  const roundsCompleted = session.rounds.length;

  // Calculate convergence based on how close the parties are
  let convergencePercent = 0;
  if (session.rounds.length >= 2) {
    const firstRound = session.rounds[0];
    const lastRound = session.rounds[session.rounds.length - 1];

    const initialGap = firstRound.counterProposal
      ? Math.abs(firstRound.proposal.paymentAmount - firstRound.counterProposal.paymentAmount)
      : firstRound.proposal.paymentAmount * 0.3; // Assume 30% gap if no counter

    const currentProposal = lastRound.counterProposal || lastRound.proposal;
    const previousRound = session.rounds[session.rounds.length - 2];
    const previousProposal = previousRound?.counterProposal || previousRound?.proposal || firstRound.proposal;

    const currentGap = Math.abs(currentProposal.paymentAmount - previousProposal.paymentAmount);
    convergencePercent = initialGap > 0 ? Math.round((1 - currentGap / initialGap) * 100) : 100;
  }

  // Time remaining
  let timeRemaining: string | undefined;
  if (session.expiresAt) {
    const msRemaining = session.expiresAt.getTime() - Date.now();
    if (msRemaining > 0) {
      const hours = Math.floor(msRemaining / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      timeRemaining = days > 0 ? `${days} days` : `${hours} hours`;
    }
  }

  const statusMap: Record<NegotiationStatus, string> = {
    [NegotiationStatus.PENDING]: 'Waiting to start',
    [NegotiationStatus.PROPOSED]: 'Proposal pending',
    [NegotiationStatus.COUNTERED]: 'Counter-offer pending',
    [NegotiationStatus.ACCEPTED]: 'Agreement reached',
    [NegotiationStatus.REJECTED]: 'Negotiation rejected',
    [NegotiationStatus.EXPIRED]: 'Negotiation expired',
  };

  return {
    roundsCompleted,
    maxRounds,
    convergencePercent: Math.max(0, Math.min(100, convergencePercent)),
    status: statusMap[session.status],
    timeRemaining,
  };
}
