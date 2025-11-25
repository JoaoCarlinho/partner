/**
 * Cease and Desist Service
 * Handles cease and desist status for debt collection cases
 */

import { ComplianceFlag, FlagSeverity } from './complianceRules';

/**
 * Cease and desist record
 */
export interface CeaseDesistRecord {
  caseId: string;
  debtorId: string;
  active: boolean;
  requestedAt: Date;
  requestMethod: 'written' | 'verbal' | 'platform';
  notes?: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

/**
 * Cease and desist check result
 */
export interface CeaseDesistCheckResult {
  active: boolean;
  record: CeaseDesistRecord | null;
  allowedCommunicationTypes: string[];
  blockedActions: string[];
}

// In-memory store (would use database in production)
const ceaseDesistRecords: Map<string, CeaseDesistRecord> = new Map();

/**
 * Allowed communication types when cease and desist is active
 * Per FDCPA §1692c(c)
 */
const ALLOWED_WHEN_CEASE_DESIST: string[] = [
  'cease_desist_acknowledgment', // Acknowledge receipt
  'lawsuit_notice', // Notice of legal action
  'specific_remedy_notice', // Notice of specific remedy being pursued
];

/**
 * Register a cease and desist request
 */
export function registerCeaseDesist(
  caseId: string,
  debtorId: string,
  requestMethod: CeaseDesistRecord['requestMethod'],
  notes?: string
): CeaseDesistRecord {
  const record: CeaseDesistRecord = {
    caseId,
    debtorId,
    active: true,
    requestedAt: new Date(),
    requestMethod,
    notes,
  };

  ceaseDesistRecords.set(caseId, record);
  return record;
}

/**
 * Acknowledge a cease and desist request
 */
export function acknowledgeCeaseDesist(
  caseId: string,
  acknowledgedBy: string
): CeaseDesistRecord | null {
  const record = ceaseDesistRecords.get(caseId);
  if (!record) {
    return null;
  }

  record.acknowledgedAt = new Date();
  record.acknowledgedBy = acknowledgedBy;
  return record;
}

/**
 * Check cease and desist status for a case
 */
export function checkCeaseDesist(caseId: string): CeaseDesistCheckResult {
  const record = ceaseDesistRecords.get(caseId) || null;

  if (!record || !record.active) {
    return {
      active: false,
      record: null,
      allowedCommunicationTypes: ['all'],
      blockedActions: [],
    };
  }

  return {
    active: true,
    record,
    allowedCommunicationTypes: ALLOWED_WHEN_CEASE_DESIST,
    blockedActions: [
      'Send messages',
      'Make calls',
      'Send emails',
      'Contact debtor regarding debt',
    ],
  };
}

/**
 * Check if communication type is allowed under cease and desist
 */
export function isCommunicationAllowed(caseId: string, communicationType: string): boolean {
  const result = checkCeaseDesist(caseId);

  if (!result.active) {
    return true;
  }

  return ALLOWED_WHEN_CEASE_DESIST.includes(communicationType);
}

/**
 * Lift cease and desist (requires legal basis)
 */
export function liftCeaseDesist(caseId: string, reason: string, liftedBy: string): boolean {
  const record = ceaseDesistRecords.get(caseId);
  if (!record) {
    return false;
  }

  // In production, would log this action for audit
  console.log(`Cease and desist lifted for case ${caseId} by ${liftedBy}: ${reason}`);

  record.active = false;
  return true;
}

/**
 * Get all active cease and desist cases
 */
export function getActiveCeaseDesistCases(): CeaseDesistRecord[] {
  const records: CeaseDesistRecord[] = [];
  for (const record of ceaseDesistRecords.values()) {
    if (record.active) {
      records.push(record);
    }
  }
  return records;
}

/**
 * Check if attempting communication with active cease and desist
 */
export function shouldBlockCommunication(caseId: string): {
  blocked: boolean;
  reason: string | null;
  flag: ComplianceFlag | null;
  severity: FlagSeverity | null;
} {
  const result = checkCeaseDesist(caseId);

  if (!result.active) {
    return {
      blocked: false,
      reason: null,
      flag: null,
      severity: null,
    };
  }

  return {
    blocked: true,
    reason:
      'Cease and desist is active for this case. Only legally required communications are permitted.',
    flag: ComplianceFlag.CEASE_DESIST_ACTIVE,
    severity: FlagSeverity.VIOLATION,
  };
}
