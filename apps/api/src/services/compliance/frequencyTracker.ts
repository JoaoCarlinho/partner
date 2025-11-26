/**
 * Frequency Tracker Service
 * Tracks communication frequency for Regulation F compliance
 */

import {
  REGULATION_F_RULES,
  CommunicationDirection,
  CommunicationChannel,
} from './complianceRules';

/**
 * Frequency check result
 */
export interface FrequencyResult {
  compliant: boolean;
  used: number;
  limit: number;
  remaining: number;
  warningThreshold: boolean;
  nextResetDate: Date;
  recentCommunications: Array<{
    id: string;
    timestamp: Date;
    channel: string;
  }>;
}

/**
 * Communication record for tracking
 */
interface CommunicationRecord {
  id: string;
  debtorId: string;
  caseId: string;
  direction: CommunicationDirection;
  channel: CommunicationChannel;
  timestamp: Date;
}

// In-memory store (would use database in production)
const communicationRecords: Map<string, CommunicationRecord[]> = new Map();

/**
 * Get communication records for a debtor in the tracking window
 */
function getRecentCommunications(debtorId: string): CommunicationRecord[] {
  const all = communicationRecords.get(debtorId) || [];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - REGULATION_F_RULES.WEEK_WINDOW_DAYS);

  return all.filter(
    (c) =>
      c.timestamp >= weekAgo &&
      c.direction === CommunicationDirection.OUTBOUND &&
      (REGULATION_F_RULES.CHANNELS_IN_LIMIT as readonly string[]).includes(c.channel)
  );
}

/**
 * Check frequency compliance for a debtor/case
 */
export function checkFrequencyCompliance(debtorId: string, caseId: string): FrequencyResult {
  const recentComms = getRecentCommunications(debtorId);
  const caseComms = recentComms.filter((c) => c.caseId === caseId);

  // Use case-specific count for the limit
  const used = caseComms.length;
  const remaining = Math.max(0, REGULATION_F_RULES.MAX_CALLS_PER_WEEK - used);

  // Calculate next reset date (when oldest communication falls out of window)
  let nextResetDate = new Date();
  nextResetDate.setDate(nextResetDate.getDate() + REGULATION_F_RULES.WEEK_WINDOW_DAYS);

  if (caseComms.length > 0) {
    const oldestComm = caseComms.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
    nextResetDate = new Date(oldestComm.timestamp);
    nextResetDate.setDate(nextResetDate.getDate() + REGULATION_F_RULES.WEEK_WINDOW_DAYS);
  }

  return {
    compliant: remaining > 0,
    used,
    limit: REGULATION_F_RULES.MAX_CALLS_PER_WEEK,
    remaining,
    warningThreshold: remaining <= 2 && remaining > 0,
    nextResetDate,
    recentCommunications: caseComms.map((c) => ({
      id: c.id,
      timestamp: c.timestamp,
      channel: c.channel,
    })),
  };
}

/**
 * Record a communication for frequency tracking
 */
export function recordCommunication(record: CommunicationRecord): void {
  const existing = communicationRecords.get(record.debtorId) || [];
  existing.push(record);
  communicationRecords.set(record.debtorId, existing);

  // Cleanup old records (older than 30 days)
  cleanupOldRecords();
}

/**
 * Get frequency status summary for a case
 */
export function getFrequencyStatus(
  debtorId: string,
  caseId: string
): {
  used: number;
  limit: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
} {
  const result = checkFrequencyCompliance(debtorId, caseId);

  let status: 'ok' | 'warning' | 'exceeded' = 'ok';
  if (!result.compliant) {
    status = 'exceeded';
  } else if (result.warningThreshold) {
    status = 'warning';
  }

  return {
    used: result.used,
    limit: result.limit,
    percentage: Math.round((result.used / result.limit) * 100),
    status,
  };
}

/**
 * Cleanup old communication records
 */
function cleanupOldRecords(): void {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const [debtorId, records] of communicationRecords.entries()) {
    const filtered = records.filter((r) => r.timestamp >= thirtyDaysAgo);
    if (filtered.length === 0) {
      communicationRecords.delete(debtorId);
    } else {
      communicationRecords.set(debtorId, filtered);
    }
  }
}

/**
 * Clear all records for a debtor (for testing)
 */
export function clearRecords(debtorId: string): void {
  communicationRecords.delete(debtorId);
}
