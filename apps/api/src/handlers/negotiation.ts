/**
 * Negotiation API Handler
 * Endpoints for payment plan negotiation flow
 */

import { Router, Request, Response } from 'express';
import {
  NegotiationSession,
  NegotiationStatus,
  NegotiationRound,
  evaluateCounterOffer,
  suggestCompromise,
  getNextAction,
  calculateNegotiationProgress,
  hasReachedMaxRounds,
} from '../services/negotiation/negotiationEngine';

const router = Router();

/**
 * In-memory storage for negotiation sessions
 * In production, use database
 */
const negotiations: Map<string, NegotiationSession> = new Map();

/**
 * Default creditor limits
 */
const DEFAULT_CREDITOR_LIMITS = {
  minDownPaymentPercent: 5,
  maxDurationMonths: 24,
  minPaymentAmount: 50,
};

/**
 * Generate unique ID
 */
function generateId(): string {
  return `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new negotiation session
 * POST /api/negotiations
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { demandId, totalAmount, creditorLimits, initialProposal } = req.body;

    if (!demandId || !totalAmount) {
      return res.status(400).json({ error: 'demandId and totalAmount are required' });
    }

    const id = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session: NegotiationSession = {
      id,
      demandId,
      totalAmount,
      status: NegotiationStatus.PENDING,
      rounds: [],
      creditorLimits: creditorLimits || DEFAULT_CREDITOR_LIMITS,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    // If initial proposal provided, add first round
    if (initialProposal) {
      const round: NegotiationRound = {
        roundNumber: 1,
        proposedBy: 'creditor',
        timestamp: now,
        proposal: initialProposal,
        status: NegotiationStatus.PROPOSED,
      };
      session.rounds.push(round);
      session.status = NegotiationStatus.PROPOSED;
    }

    negotiations.set(id, session);

    return res.status(201).json({
      id,
      session,
      nextAction: getNextAction(session),
    });
  } catch (error) {
    console.error('Create negotiation error:', error);
    return res.status(500).json({ error: 'Failed to create negotiation session' });
  }
});

/**
 * Get negotiation session
 * GET /api/negotiations/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const session = negotiations.get(id);
  if (!session) {
    return res.status(404).json({ error: 'Negotiation session not found' });
  }

  // Check expiration
  if (new Date() > session.expiresAt && session.status !== NegotiationStatus.ACCEPTED) {
    session.status = NegotiationStatus.EXPIRED;
    negotiations.set(id, session);
  }

  return res.json({
    session,
    progress: calculateNegotiationProgress(session),
    nextAction: getNextAction(session),
  });
});

/**
 * Submit a proposal (creditor)
 * POST /api/negotiations/:id/propose
 */
router.post('/:id/propose', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { proposal } = req.body;

    const session = negotiations.get(id);
    if (!session) {
      return res.status(404).json({ error: 'Negotiation session not found' });
    }

    if (session.status === NegotiationStatus.EXPIRED) {
      return res.status(400).json({ error: 'Negotiation has expired' });
    }

    if (session.status === NegotiationStatus.ACCEPTED) {
      return res.status(400).json({ error: 'Negotiation already accepted' });
    }

    // Validate proposal
    if (!proposal || !proposal.paymentAmount || !proposal.frequency) {
      return res.status(400).json({ error: 'Invalid proposal format' });
    }

    const round: NegotiationRound = {
      roundNumber: session.rounds.length + 1,
      proposedBy: 'creditor',
      timestamp: new Date(),
      proposal,
      status: NegotiationStatus.PROPOSED,
    };

    session.rounds.push(round);
    session.status = NegotiationStatus.PROPOSED;
    session.updatedAt = new Date();
    negotiations.set(id, session);

    return res.json({
      success: true,
      round,
      nextAction: getNextAction(session),
    });
  } catch (error) {
    console.error('Propose error:', error);
    return res.status(500).json({ error: 'Failed to submit proposal' });
  }
});

/**
 * Submit a counter-offer (debtor)
 * POST /api/negotiations/:id/counter
 */
router.post('/:id/counter', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { counterProposal, reason } = req.body;

    const session = negotiations.get(id);
    if (!session) {
      return res.status(404).json({ error: 'Negotiation session not found' });
    }

    if (session.status === NegotiationStatus.EXPIRED) {
      return res.status(400).json({ error: 'Negotiation has expired' });
    }

    if (session.status !== NegotiationStatus.PROPOSED) {
      return res.status(400).json({ error: 'No active proposal to counter' });
    }

    if (hasReachedMaxRounds(session)) {
      return res.status(400).json({ error: 'Maximum negotiation rounds reached' });
    }

    // Evaluate counter-offer
    const evaluation = evaluateCounterOffer(
      counterProposal,
      session.totalAmount,
      session.creditorLimits || DEFAULT_CREDITOR_LIMITS
    );

    // Update last round with counter
    const lastRound = session.rounds[session.rounds.length - 1];
    lastRound.counterProposal = {
      ...counterProposal,
      reason,
    };
    lastRound.status = NegotiationStatus.COUNTERED;

    session.status = NegotiationStatus.COUNTERED;
    session.debtorConstraints = {
      maxPaymentAmount: counterProposal.paymentAmount,
      preferredFrequency: counterProposal.frequency,
      maxDownPayment: counterProposal.downPayment,
    };
    session.updatedAt = new Date();
    negotiations.set(id, session);

    // If auto-acceptable, accept automatically
    if (evaluation.autoAcceptable) {
      return acceptNegotiation(id, session, res);
    }

    return res.json({
      success: true,
      evaluation,
      round: lastRound,
      nextAction: getNextAction(session),
    });
  } catch (error) {
    console.error('Counter error:', error);
    return res.status(500).json({ error: 'Failed to submit counter-offer' });
  }
});

/**
 * Accept current terms
 * POST /api/negotiations/:id/accept
 */
router.post('/:id/accept', (req: Request, res: Response) => {
  const { id } = req.params;

  const session = negotiations.get(id);
  if (!session) {
    return res.status(404).json({ error: 'Negotiation session not found' });
  }

  return acceptNegotiation(id, session, res);
});

/**
 * Helper to accept negotiation
 */
function acceptNegotiation(id: string, session: NegotiationSession, res: Response) {
  if (session.rounds.length === 0) {
    return res.status(400).json({ error: 'No proposal to accept' });
  }

  const lastRound = session.rounds[session.rounds.length - 1];
  const acceptedTerms = lastRound.counterProposal || lastRound.proposal;

  session.status = NegotiationStatus.ACCEPTED;
  session.finalAgreement = {
    ...acceptedTerms,
    agreedAt: new Date(),
  };
  session.updatedAt = new Date();
  negotiations.set(id, session);

  return res.json({
    success: true,
    message: 'Agreement reached',
    finalAgreement: session.finalAgreement,
    session,
  });
}

/**
 * Reject negotiation
 * POST /api/negotiations/:id/reject
 */
router.post('/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const session = negotiations.get(id);
  if (!session) {
    return res.status(404).json({ error: 'Negotiation session not found' });
  }

  session.status = NegotiationStatus.REJECTED;
  session.updatedAt = new Date();
  negotiations.set(id, session);

  return res.json({
    success: true,
    message: 'Negotiation rejected',
    reason,
    session,
  });
});

/**
 * Get compromise suggestion
 * GET /api/negotiations/:id/compromise
 */
router.get('/:id/compromise', (req: Request, res: Response) => {
  const { id } = req.params;

  const session = negotiations.get(id);
  if (!session) {
    return res.status(404).json({ error: 'Negotiation session not found' });
  }

  if (session.rounds.length === 0) {
    return res.status(400).json({ error: 'Need at least one round for compromise' });
  }

  const lastRound = session.rounds[session.rounds.length - 1];
  if (!lastRound.counterProposal) {
    return res.status(400).json({ error: 'Need counter-offer to suggest compromise' });
  }

  const compromise = suggestCompromise(
    lastRound.proposal,
    lastRound.counterProposal,
    session.totalAmount
  );

  return res.json({
    compromise,
    evaluation: evaluateCounterOffer(
      compromise,
      session.totalAmount,
      session.creditorLimits || DEFAULT_CREDITOR_LIMITS
    ),
  });
});

/**
 * Get negotiation history for a demand
 * GET /api/negotiations/demand/:demandId
 */
router.get('/demand/:demandId', (req: Request, res: Response) => {
  const { demandId } = req.params;

  const demandNegotiations: NegotiationSession[] = [];
  for (const session of negotiations.values()) {
    if (session.demandId === demandId) {
      demandNegotiations.push(session);
    }
  }

  return res.json({
    demandId,
    negotiations: demandNegotiations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    ),
  });
});

export default router;
