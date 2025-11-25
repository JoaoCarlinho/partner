/**
 * Defender Assignment Service
 * Manages defender-debtor assignments with consent workflow
 */

import crypto from 'crypto';
import { getDefenderProfile, updateDefenderProfile } from './onboardingStateMachine';

// In-memory stores (use database in production)
const assignmentStore = new Map<string, DefenderAssignment>();
const historyStore: AssignmentHistory[] = [];
const consentTokenMap = new Map<string, string>();

export type AssignmentStatus =
  | 'REQUESTED'
  | 'PENDING_CONSENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'TRANSFERRED'
  | 'DECLINED'
  | 'EXPIRED';

export type RequestedBy = 'DEBTOR' | 'ADMIN' | 'DEFENDER';

export interface DefenderAssignment {
  id: string;
  defenderId: string;
  debtorId: string;
  caseId: string;
  status: AssignmentStatus;
  requestedBy: RequestedBy;
  requestReason?: string;
  consentToken?: string;
  consentExpiresAt?: Date;
  debtorConsentedAt?: Date;
  assignedAt?: Date;
  completedAt?: Date;
  completionReason?: string;
  transferredTo?: string;
  transferReason?: string;
  needsAttention: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentHistory {
  id: string;
  assignmentId: string;
  previousStatus?: AssignmentStatus;
  newStatus: AssignmentStatus;
  changedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAssignmentRequest {
  defenderId?: string;
  debtorId: string;
  caseId: string;
  requestedBy: RequestedBy;
  requestReason?: string;
}

export interface ConsentResponse {
  consent: boolean;
  reason?: string;
}

export interface TransferRequest {
  targetDefenderId: string;
  reason: string;
}

// Configuration
const CONSENT_EXPIRY_DAYS = 7;

/**
 * Create a new assignment
 */
export async function createAssignment(
  request: CreateAssignmentRequest,
  actorId: string
): Promise<DefenderAssignment> {
  // Check for existing active assignment
  for (const assignment of assignmentStore.values()) {
    if (
      assignment.debtorId === request.debtorId &&
      assignment.caseId === request.caseId &&
      ['REQUESTED', 'PENDING_CONSENT', 'ACTIVE'].includes(assignment.status)
    ) {
      throw new Error('Active assignment already exists for this case');
    }
  }

  // Auto-assign if no defender specified
  let defenderId = request.defenderId;
  if (!defenderId) {
    defenderId = await findAvailableDefender();
    if (!defenderId) {
      throw new Error('No defenders available');
    }
  }

  // Check defender exists and has capacity
  const defender = await getDefenderProfile(defenderId);
  if (!defender) {
    throw new Error('Defender not found');
  }

  if (defender.currentCaseload >= defender.maxCaseload) {
    throw new Error('Defender at maximum caseload');
  }

  if (defender.onboardingStatus !== 'ACTIVE') {
    throw new Error('Defender not fully onboarded');
  }

  // Generate consent token
  const consentToken = crypto.randomBytes(32).toString('hex');
  const consentExpiresAt = new Date();
  consentExpiresAt.setDate(consentExpiresAt.getDate() + CONSENT_EXPIRY_DAYS);

  // Determine initial status
  const initialStatus: AssignmentStatus =
    request.requestedBy === 'DEBTOR' ? 'REQUESTED' : 'PENDING_CONSENT';

  // Create assignment
  const assignment: DefenderAssignment = {
    id: generateId(),
    defenderId,
    debtorId: request.debtorId,
    caseId: request.caseId,
    status: initialStatus,
    requestedBy: request.requestedBy,
    requestReason: request.requestReason,
    consentToken,
    consentExpiresAt,
    needsAttention: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  assignmentStore.set(assignment.id, assignment);
  consentTokenMap.set(consentToken, assignment.id);

  // Log history
  await logHistory(assignment.id, undefined, initialStatus, actorId);

  return assignment;
}

/**
 * Find an available defender with lowest caseload
 */
export async function findAvailableDefender(): Promise<string | null> {
  // In production, query database
  // For now, return null to require explicit defender selection
  return null;
}

/**
 * Process consent response from debtor
 */
export async function processConsent(
  assignmentId: string,
  response: ConsentResponse,
  debtorId: string
): Promise<DefenderAssignment> {
  const assignment = assignmentStore.get(assignmentId);

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  if (assignment.debtorId !== debtorId) {
    throw new Error('Not authorized to respond to this request');
  }

  if (!['PENDING_CONSENT', 'REQUESTED'].includes(assignment.status)) {
    throw new Error('Assignment not awaiting consent');
  }

  if (assignment.consentExpiresAt && assignment.consentExpiresAt < new Date()) {
    throw new Error('Consent request expired');
  }

  const previousStatus = assignment.status;

  if (response.consent) {
    // Accept assignment
    assignment.status = 'ACTIVE';
    assignment.debtorConsentedAt = new Date();
    assignment.assignedAt = new Date();
    assignment.consentToken = undefined;

    // Increment defender caseload
    const defender = await getDefenderProfile(assignment.defenderId);
    if (defender) {
      await updateDefenderProfile(defender.id, {
        currentCaseload: defender.currentCaseload + 1,
      });
    }

    await logHistory(assignmentId, previousStatus, 'ACTIVE', debtorId);
  } else {
    // Decline assignment
    assignment.status = 'DECLINED';
    assignment.completionReason = response.reason;
    assignment.consentToken = undefined;

    await logHistory(assignmentId, previousStatus, 'DECLINED', debtorId, response.reason);
  }

  assignment.updatedAt = new Date();
  assignmentStore.set(assignmentId, assignment);

  return assignment;
}

/**
 * Get consent details by token
 */
export async function getConsentByToken(token: string): Promise<{
  assignment: DefenderAssignment;
  valid: boolean;
  expired: boolean;
}> {
  const assignmentId = consentTokenMap.get(token);

  if (!assignmentId) {
    throw new Error('Invalid consent token');
  }

  const assignment = assignmentStore.get(assignmentId);

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  const expired = assignment.consentExpiresAt
    ? assignment.consentExpiresAt < new Date()
    : false;

  return {
    assignment,
    valid: !expired && ['PENDING_CONSENT', 'REQUESTED'].includes(assignment.status),
    expired,
  };
}

/**
 * Transfer assignment to another defender
 */
export async function transferAssignment(
  assignmentId: string,
  request: TransferRequest,
  actorId: string
): Promise<DefenderAssignment> {
  const assignment = assignmentStore.get(assignmentId);

  if (!assignment || assignment.status !== 'ACTIVE') {
    throw new Error('Assignment not active');
  }

  // Check target defender capacity
  const targetDefender = await getDefenderProfile(request.targetDefenderId);

  if (!targetDefender) {
    throw new Error('Target defender not found');
  }

  if (targetDefender.currentCaseload >= targetDefender.maxCaseload) {
    throw new Error('Target defender at maximum caseload');
  }

  if (targetDefender.onboardingStatus !== 'ACTIVE') {
    throw new Error('Target defender not fully onboarded');
  }

  // Mark original as transferred
  assignment.status = 'TRANSFERRED';
  assignment.transferredTo = request.targetDefenderId;
  assignment.transferReason = request.reason;
  assignment.completedAt = new Date();
  assignment.updatedAt = new Date();

  assignmentStore.set(assignmentId, assignment);

  // Decrement original defender caseload
  const originalDefender = await getDefenderProfile(assignment.defenderId);
  if (originalDefender && originalDefender.currentCaseload > 0) {
    await updateDefenderProfile(originalDefender.id, {
      currentCaseload: originalDefender.currentCaseload - 1,
    });
  }

  // Create new assignment
  const newAssignment: DefenderAssignment = {
    id: generateId(),
    defenderId: request.targetDefenderId,
    debtorId: assignment.debtorId,
    caseId: assignment.caseId,
    status: 'ACTIVE',
    requestedBy: 'ADMIN',
    requestReason: `Transferred from defender: ${request.reason}`,
    debtorConsentedAt: assignment.debtorConsentedAt,
    assignedAt: new Date(),
    needsAttention: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  assignmentStore.set(newAssignment.id, newAssignment);

  // Increment target defender caseload
  await updateDefenderProfile(targetDefender.id, {
    currentCaseload: targetDefender.currentCaseload + 1,
  });

  // Log history
  await logHistory(assignmentId, 'ACTIVE', 'TRANSFERRED', actorId, request.reason);
  await logHistory(newAssignment.id, undefined, 'ACTIVE', actorId, 'Transferred assignment');

  return newAssignment;
}

/**
 * Complete an assignment
 */
export async function completeAssignment(
  assignmentId: string,
  reason: string,
  actorId: string
): Promise<DefenderAssignment> {
  const assignment = assignmentStore.get(assignmentId);

  if (!assignment || assignment.status !== 'ACTIVE') {
    throw new Error('Assignment not active');
  }

  assignment.status = 'COMPLETED';
  assignment.completedAt = new Date();
  assignment.completionReason = reason;
  assignment.updatedAt = new Date();

  assignmentStore.set(assignmentId, assignment);

  // Decrement defender caseload
  const defender = await getDefenderProfile(assignment.defenderId);
  if (defender && defender.currentCaseload > 0) {
    await updateDefenderProfile(defender.id, {
      currentCaseload: defender.currentCaseload - 1,
    });
  }

  await logHistory(assignmentId, 'ACTIVE', 'COMPLETED', actorId, reason);

  return assignment;
}

/**
 * Get assignment by ID
 */
export async function getAssignment(id: string): Promise<DefenderAssignment | null> {
  return assignmentStore.get(id) || null;
}

/**
 * Get assignments for a defender
 */
export async function getDefenderAssignments(
  defenderId: string,
  options?: {
    status?: AssignmentStatus;
    limit?: number;
  }
): Promise<DefenderAssignment[]> {
  let assignments: DefenderAssignment[] = [];

  for (const assignment of assignmentStore.values()) {
    if (assignment.defenderId === defenderId) {
      if (!options?.status || assignment.status === options.status) {
        assignments.push(assignment);
      }
    }
  }

  assignments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    assignments = assignments.slice(0, options.limit);
  }

  return assignments;
}

/**
 * Get assignments for a debtor
 */
export async function getDebtorAssignments(
  debtorId: string,
  options?: {
    status?: AssignmentStatus;
  }
): Promise<DefenderAssignment[]> {
  const assignments: DefenderAssignment[] = [];

  for (const assignment of assignmentStore.values()) {
    if (assignment.debtorId === debtorId) {
      if (!options?.status || assignment.status === options.status) {
        assignments.push(assignment);
      }
    }
  }

  return assignments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all assignments (admin view)
 */
export async function getAllAssignments(options?: {
  status?: AssignmentStatus;
  defenderId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ assignments: DefenderAssignment[]; total: number }> {
  let assignments = Array.from(assignmentStore.values());

  if (options?.status) {
    assignments = assignments.filter((a) => a.status === options.status);
  }

  if (options?.defenderId) {
    assignments = assignments.filter((a) => a.defenderId === options.defenderId);
  }

  const total = assignments.length;
  assignments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.offset) {
    assignments = assignments.slice(options.offset);
  }

  if (options?.limit) {
    assignments = assignments.slice(0, options.limit);
  }

  return { assignments, total };
}

/**
 * Get assignment history
 */
export async function getAssignmentHistory(assignmentId: string): Promise<AssignmentHistory[]> {
  return historyStore
    .filter((h) => h.assignmentId === assignmentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get defender capacity
 */
export async function getDefenderCapacity(defenderId: string): Promise<{
  currentCaseload: number;
  maxCaseload: number;
  availableSlots: number;
  activeAssignments: number;
  pendingAssignments: number;
}> {
  const defender = await getDefenderProfile(defenderId);

  if (!defender) {
    throw new Error('Defender not found');
  }

  const assignments = await getDefenderAssignments(defenderId);
  const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE').length;
  const pendingAssignments = assignments.filter((a) =>
    ['REQUESTED', 'PENDING_CONSENT'].includes(a.status)
  ).length;

  return {
    currentCaseload: defender.currentCaseload,
    maxCaseload: defender.maxCaseload,
    availableSlots: Math.max(0, defender.maxCaseload - defender.currentCaseload),
    activeAssignments,
    pendingAssignments,
  };
}

/**
 * Mark assignment as needing attention
 */
export async function markNeedsAttention(
  assignmentId: string,
  needsAttention: boolean
): Promise<DefenderAssignment> {
  const assignment = assignmentStore.get(assignmentId);

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  assignment.needsAttention = needsAttention;
  assignment.updatedAt = new Date();
  assignmentStore.set(assignmentId, assignment);

  return assignment;
}

/**
 * Check if defender has access to debtor
 */
export async function hasDefenderAccess(
  defenderId: string,
  debtorId: string
): Promise<boolean> {
  for (const assignment of assignmentStore.values()) {
    if (
      assignment.defenderId === defenderId &&
      assignment.debtorId === debtorId &&
      assignment.status === 'ACTIVE'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Expire old consent requests
 */
export async function expireOldConsents(): Promise<number> {
  let expiredCount = 0;
  const now = new Date();

  for (const assignment of assignmentStore.values()) {
    if (
      ['REQUESTED', 'PENDING_CONSENT'].includes(assignment.status) &&
      assignment.consentExpiresAt &&
      assignment.consentExpiresAt < now
    ) {
      assignment.status = 'EXPIRED';
      assignment.updatedAt = now;
      assignmentStore.set(assignment.id, assignment);
      expiredCount++;
    }
  }

  return expiredCount;
}

/**
 * Log assignment history
 */
async function logHistory(
  assignmentId: string,
  previousStatus: AssignmentStatus | undefined,
  newStatus: AssignmentStatus,
  changedBy: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const history: AssignmentHistory = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    assignmentId,
    previousStatus,
    newStatus,
    changedBy,
    reason,
    metadata,
    createdAt: new Date(),
  };

  historyStore.push(history);
}

function generateId(): string {
  return `asgn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
