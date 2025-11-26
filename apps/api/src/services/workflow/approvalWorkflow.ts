/**
 * Approval Workflow Service
 * State machine logic for demand letter approval workflow
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../middleware/logger.js';
import { createHash } from 'crypto';

/**
 * Letter status type matching Prisma enum
 */
export type LetterStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'READY_TO_SEND' | 'SENT';

/**
 * Workflow action types
 */
export type WorkflowAction = 'submit' | 'approve' | 'reject' | 'prepare_send' | 'send' | 'revise';

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<LetterStatus, LetterStatus[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['READY_TO_SEND'],
  REJECTED: ['DRAFT'],  // After revision
  READY_TO_SEND: ['SENT'],
  SENT: [],  // Terminal state
};

/**
 * Action to status mapping
 */
const ACTION_STATUS_MAP: Record<WorkflowAction, LetterStatus> = {
  submit: 'PENDING_REVIEW',
  approve: 'APPROVED',
  reject: 'REJECTED',
  prepare_send: 'READY_TO_SEND',
  send: 'SENT',
  revise: 'DRAFT',
};

/**
 * Signature data for approval
 */
export interface SignatureData {
  typedSignature?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  signatureHash?: string;
}

/**
 * Check if a status transition is valid
 */
export function canTransition(from: LetterStatus, to: LetterStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the target status for an action
 */
export function getStatusForAction(action: WorkflowAction): LetterStatus {
  return ACTION_STATUS_MAP[action];
}

/**
 * Submit letter for review
 */
export async function submitForReview(
  demandLetterId: string,
  actorId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; status: LetterStatus }> {
  const letter = await prisma.demandLetter.findUnique({
    where: { id: demandLetterId },
  });

  if (!letter) {
    throw new WorkflowError('Demand letter not found', 'NOT_FOUND');
  }

  if (!canTransition(letter.status, 'PENDING_REVIEW')) {
    throw new WorkflowError(
      `Cannot submit letter in ${letter.status} status for review`,
      'INVALID_TRANSITION'
    );
  }

  // Check compliance status
  const complianceResult = letter.complianceResult as { isCompliant?: boolean } | null;
  if (!complianceResult?.isCompliant) {
    throw new WorkflowError(
      'Cannot submit non-compliant letter for review',
      'NOT_COMPLIANT'
    );
  }

  // Update status and create approval record
  await prisma.$transaction([
    prisma.demandLetter.update({
      where: { id: demandLetterId },
      data: { status: 'PENDING_REVIEW' },
    }),
    prisma.letterApproval.create({
      data: {
        demandLetterId,
        action: 'submit',
        actorId,
        ipAddress,
        userAgent,
      },
    }),
  ]);

  logger.info('Letter submitted for review', {
    demandLetterId,
    actorId,
  });

  return { success: true, status: 'PENDING_REVIEW' };
}

/**
 * Approve a letter
 */
export async function approveLetter(
  demandLetterId: string,
  actorId: string,
  options: {
    signature?: string;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ success: boolean; status: LetterStatus; approvalId: string }> {
  const letter = await prisma.demandLetter.findUnique({
    where: { id: demandLetterId },
  });

  if (!letter) {
    throw new WorkflowError('Demand letter not found', 'NOT_FOUND');
  }

  if (!canTransition(letter.status, 'APPROVED')) {
    throw new WorkflowError(
      `Cannot approve letter in ${letter.status} status`,
      'INVALID_TRANSITION'
    );
  }

  // Create signature data
  const signatureData: SignatureData = {
    typedSignature: options.signature,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Generate signature hash for integrity verification
  signatureData.signatureHash = createSignatureHash(
    demandLetterId,
    actorId,
    signatureData.timestamp,
    options.ipAddress
  );

  // Update status and create approval record
  const [, approval] = await prisma.$transaction([
    prisma.demandLetter.update({
      where: { id: demandLetterId },
      data: { status: 'APPROVED' },
    }),
    prisma.letterApproval.create({
      data: {
        demandLetterId,
        action: 'approve',
        actorId,
        signatureData: signatureData as object,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    }),
  ]);

  logger.info('Letter approved', {
    demandLetterId,
    actorId,
    approvalId: approval.id,
  });

  return { success: true, status: 'APPROVED', approvalId: approval.id };
}

/**
 * Reject a letter
 */
export async function rejectLetter(
  demandLetterId: string,
  actorId: string,
  reason: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ success: boolean; status: LetterStatus }> {
  if (!reason || reason.trim().length === 0) {
    throw new WorkflowError('Rejection reason is required', 'MISSING_REASON');
  }

  const letter = await prisma.demandLetter.findUnique({
    where: { id: demandLetterId },
  });

  if (!letter) {
    throw new WorkflowError('Demand letter not found', 'NOT_FOUND');
  }

  if (!canTransition(letter.status, 'REJECTED')) {
    throw new WorkflowError(
      `Cannot reject letter in ${letter.status} status`,
      'INVALID_TRANSITION'
    );
  }

  // Update status and create rejection record
  await prisma.$transaction([
    prisma.demandLetter.update({
      where: { id: demandLetterId },
      data: { status: 'DRAFT' },  // Go back to DRAFT for revision
    }),
    prisma.letterApproval.create({
      data: {
        demandLetterId,
        action: 'reject',
        actorId,
        reason,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    }),
  ]);

  logger.info('Letter rejected', {
    demandLetterId,
    actorId,
    reason,
  });

  return { success: true, status: 'DRAFT' };
}

/**
 * Prepare letter for sending
 */
export async function prepareForSending(
  demandLetterId: string,
  actorId: string
): Promise<{ success: boolean; status: LetterStatus }> {
  const letter = await prisma.demandLetter.findUnique({
    where: { id: demandLetterId },
  });

  if (!letter) {
    throw new WorkflowError('Demand letter not found', 'NOT_FOUND');
  }

  if (!canTransition(letter.status, 'READY_TO_SEND')) {
    throw new WorkflowError(
      `Cannot prepare letter in ${letter.status} status for sending`,
      'INVALID_TRANSITION'
    );
  }

  await prisma.demandLetter.update({
    where: { id: demandLetterId },
    data: { status: 'READY_TO_SEND' },
  });

  logger.info('Letter ready to send', {
    demandLetterId,
    actorId,
  });

  return { success: true, status: 'READY_TO_SEND' };
}

/**
 * Mark letter as sent
 */
export async function markAsSent(
  demandLetterId: string,
  actorId: string,
  sentAt: Date = new Date()
): Promise<{ success: boolean; status: LetterStatus }> {
  const letter = await prisma.demandLetter.findUnique({
    where: { id: demandLetterId },
  });

  if (!letter) {
    throw new WorkflowError('Demand letter not found', 'NOT_FOUND');
  }

  // Allow sending from either APPROVED or READY_TO_SEND status
  if (letter.status !== 'APPROVED' && letter.status !== 'READY_TO_SEND') {
    throw new WorkflowError(
      `Cannot send letter in ${letter.status} status`,
      'INVALID_TRANSITION'
    );
  }

  await prisma.demandLetter.update({
    where: { id: demandLetterId },
    data: {
      status: 'SENT',
      sentAt,
    },
  });

  logger.info('Letter marked as sent', {
    demandLetterId,
    actorId,
    sentAt,
  });

  return { success: true, status: 'SENT' };
}

/**
 * Get approval history for a letter
 */
export async function getApprovalHistory(demandLetterId: string) {
  return prisma.letterApproval.findMany({
    where: { demandLetterId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Get the latest approval record
 */
export async function getLatestApproval(demandLetterId: string) {
  return prisma.letterApproval.findFirst({
    where: {
      demandLetterId,
      action: 'approve',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Create signature hash for integrity verification
 */
function createSignatureHash(
  demandLetterId: string,
  actorId: string,
  timestamp: string,
  ipAddress?: string
): string {
  const data = `${demandLetterId}:${actorId}:${timestamp}:${ipAddress || 'unknown'}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verify signature hash
 */
export function verifySignatureHash(
  demandLetterId: string,
  actorId: string,
  signatureData: SignatureData
): boolean {
  const expectedHash = createSignatureHash(
    demandLetterId,
    actorId,
    signatureData.timestamp,
    signatureData.ipAddress
  );
  return expectedHash === signatureData.signatureHash;
}

/**
 * Custom error class for workflow errors
 */
export class WorkflowError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
  }
}
