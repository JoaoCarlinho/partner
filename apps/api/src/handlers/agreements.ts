/**
 * Agreements API Handler
 * Endpoints for payment agreement management and e-signing
 */

import { Router, Request, Response } from 'express';
import {
  Agreement,
  AgreementStatus,
  AgreementTerms,
  SignatureRecord,
  PartyInfo,
  generateAgreementDocument,
  generateSignatureHash,
  validateAgreementTerms,
  canSign,
  generateAgreementSummary,
} from '../services/agreements/agreementGenerator';

const router = Router();

/**
 * In-memory storage
 * In production, use database
 */
const agreements: Map<string, Agreement> = new Map();
const parties: Map<string, PartyInfo> = new Map();

// Seed some party data for testing
parties.set('creditor_1', {
  id: 'creditor_1',
  name: 'ABC Collections LLC',
  email: 'legal@abccollections.com',
  address: {
    street: '123 Business Ave',
    city: 'New York',
    state: 'NY',
    zip: '10001',
  },
  phone: '(555) 123-4567',
});

/**
 * Generate unique ID
 */
function generateId(): string {
  return `agr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new agreement
 * POST /api/agreements
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { planId, demandId, creditorId, debtorId, terms } = req.body;

    // Validate required fields
    if (!planId || !demandId || !creditorId || !debtorId || !terms) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate terms
    const validation = validateAgreementTerms(terms);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid terms', details: validation.errors });
    }

    const id = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const agreement: Agreement = {
      id,
      planId,
      demandId,
      creditorId,
      debtorId,
      status: AgreementStatus.DRAFT,
      terms,
      signatures: {},
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    agreements.set(id, agreement);

    return res.status(201).json({
      agreement,
      summary: generateAgreementSummary(agreement),
    });
  } catch (error) {
    console.error('Create agreement error:', error);
    return res.status(500).json({ error: 'Failed to create agreement' });
  }
});

/**
 * Get agreement by ID
 * GET /api/agreements/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const agreement = agreements.get(id);
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }

  // Check expiration
  if (
    new Date() > agreement.expiresAt &&
    agreement.status !== AgreementStatus.EXECUTED &&
    agreement.status !== AgreementStatus.VOIDED
  ) {
    agreement.status = AgreementStatus.EXPIRED;
    agreements.set(id, agreement);
  }

  return res.json({
    agreement,
    summary: generateAgreementSummary(agreement),
  });
});

/**
 * Get agreement document (plain text for now, would be PDF in production)
 * GET /api/agreements/:id/document
 */
router.get('/:id/document', (req: Request, res: Response) => {
  const { id } = req.params;

  const agreement = agreements.get(id);
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }

  const creditor = parties.get(agreement.creditorId) || {
    id: agreement.creditorId,
    name: 'Creditor',
    email: 'creditor@example.com',
  };

  const debtor = parties.get(agreement.debtorId) || {
    id: agreement.debtorId,
    name: 'Debtor',
    email: 'debtor@example.com',
  };

  const document = generateAgreementDocument(agreement, creditor, debtor);

  res.setHeader('Content-Type', 'text/plain');
  return res.send(document);
});

/**
 * Send agreement for signatures
 * POST /api/agreements/:id/send
 */
router.post('/:id/send', (req: Request, res: Response) => {
  const { id } = req.params;

  const agreement = agreements.get(id);
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }

  if (agreement.status !== AgreementStatus.DRAFT) {
    return res.status(400).json({ error: 'Agreement has already been sent' });
  }

  agreement.status = AgreementStatus.PENDING_SIGNATURES;
  agreement.updatedAt = new Date();
  agreements.set(id, agreement);

  // In production, send email notifications to both parties
  return res.json({
    success: true,
    message: 'Agreement sent for signatures',
    agreement,
  });
});

/**
 * Sign agreement
 * POST /api/agreements/:id/sign
 */
router.post('/:id/sign', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signerId, role, ipAddress, userAgent } = req.body;

    const agreement = agreements.get(id);
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    // Validate signing permission
    const canSignResult = canSign(agreement, signerId, role);
    if (!canSignResult.allowed) {
      return res.status(403).json({ error: canSignResult.reason });
    }

    // Create signature
    const now = new Date();
    const signature: SignatureRecord = {
      signedBy: signerId,
      signedAt: now,
      ipAddress: ipAddress || req.ip || 'unknown',
      userAgent: userAgent || req.get('User-Agent') || 'unknown',
      signatureHash: generateSignatureHash(id, signerId, now, ipAddress || 'unknown'),
    };

    // Record signature
    agreement.signatures[role as 'creditor' | 'debtor'] = signature;
    agreement.updatedAt = now;

    // Update status
    if (agreement.signatures.creditor && agreement.signatures.debtor) {
      agreement.status = AgreementStatus.EXECUTED;
    } else {
      agreement.status = AgreementStatus.PARTIALLY_SIGNED;
    }

    agreements.set(id, agreement);

    return res.json({
      success: true,
      signature,
      agreement,
      summary: generateAgreementSummary(agreement),
    });
  } catch (error) {
    console.error('Sign agreement error:', error);
    return res.status(500).json({ error: 'Failed to sign agreement' });
  }
});

/**
 * Void an agreement
 * POST /api/agreements/:id/void
 */
router.post('/:id/void', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, voidedBy } = req.body;

  const agreement = agreements.get(id);
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }

  if (agreement.status === AgreementStatus.EXECUTED) {
    return res.status(400).json({
      error: 'Cannot void an executed agreement. Use amendment process instead.',
    });
  }

  agreement.status = AgreementStatus.VOIDED;
  agreement.updatedAt = new Date();
  agreements.set(id, agreement);

  return res.json({
    success: true,
    message: 'Agreement voided',
    reason,
    voidedBy,
    agreement,
  });
});

/**
 * Get agreements for a demand
 * GET /api/agreements/demand/:demandId
 */
router.get('/demand/:demandId', (req: Request, res: Response) => {
  const { demandId } = req.params;

  const demandAgreements: Agreement[] = [];
  for (const agreement of agreements.values()) {
    if (agreement.demandId === demandId) {
      demandAgreements.push(agreement);
    }
  }

  return res.json({
    demandId,
    agreements: demandAgreements.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    ),
  });
});

/**
 * Get agreements for a user
 * GET /api/agreements/user/:userId
 */
router.get('/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.query;

  const userAgreements: Agreement[] = [];
  for (const agreement of agreements.values()) {
    if (role === 'creditor' && agreement.creditorId === userId) {
      userAgreements.push(agreement);
    } else if (role === 'debtor' && agreement.debtorId === userId) {
      userAgreements.push(agreement);
    } else if (!role && (agreement.creditorId === userId || agreement.debtorId === userId)) {
      userAgreements.push(agreement);
    }
  }

  return res.json({
    userId,
    role,
    agreements: userAgreements.map((a) => ({
      ...a,
      summary: generateAgreementSummary(a),
    })),
  });
});

/**
 * Update party information
 * PUT /api/agreements/parties/:id
 */
router.put('/parties/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const partyInfo: PartyInfo = req.body;

  if (!partyInfo.name || !partyInfo.email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  parties.set(id, { ...partyInfo, id });

  return res.json({
    success: true,
    party: parties.get(id),
  });
});

export default router;
