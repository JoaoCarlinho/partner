/**
 * Compliance Logger Service
 * Immutable logging of all communications for audit
 */

import {
  ComplianceFlag,
  FlagSeverity,
  CommunicationDirection,
  CommunicationChannel,
  CommunicationType,
} from './complianceRules';
import { checkFrequencyCompliance, recordCommunication } from './frequencyTracker';
import { isWithinAllowedHours } from './timeRestriction';
import { checkCeaseDesist } from './ceaseDesist';

/**
 * Communication log entry
 */
export interface CommunicationLogEntry {
  id: string;
  caseId: string;
  debtorId: string;
  creditorId: string | null;
  communicationType: CommunicationType;
  direction: CommunicationDirection;
  channel: CommunicationChannel;
  messageId: string | null;
  content: string | null;
  originalContent: string | null; // If modified by tone analysis
  toneScore: number | null;
  compliant: boolean;
  complianceIssues: ComplianceIssue[];
  timestamp: Date;
}

/**
 * Compliance issue detail
 */
export interface ComplianceIssue {
  type: ComplianceFlag;
  severity: FlagSeverity;
  description: string;
  section?: string; // FDCPA section reference
}

/**
 * Compliance flag record
 */
export interface ComplianceFlagRecord {
  id: string;
  caseId: string;
  messageId: string | null;
  flagType: ComplianceFlag;
  severity: FlagSeverity;
  details: Record<string, unknown>;
  resolved: boolean;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

/**
 * Pre-send compliance check result
 */
export interface PreSendCheckResult {
  allowed: boolean;
  issues: ComplianceIssue[];
  warnings: string[];
  blockReason: string | null;
}

// In-memory stores (would use database in production)
const communicationLogs: Map<string, CommunicationLogEntry> = new Map();
const complianceFlags: Map<string, ComplianceFlagRecord> = new Map();

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique flag ID
 */
function generateFlagId(): string {
  return `flag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Perform pre-send compliance checks
 */
export function performPreSendChecks(
  caseId: string,
  debtorId: string,
  creditorId: string
): PreSendCheckResult {
  const issues: ComplianceIssue[] = [];
  const warnings: string[] = [];
  let blockReason: string | null = null;

  // Check cease and desist
  const ceaseDesistResult = checkCeaseDesist(caseId);
  if (ceaseDesistResult.active) {
    issues.push({
      type: ComplianceFlag.CEASE_DESIST_ACTIVE,
      severity: FlagSeverity.VIOLATION,
      description: 'Cease and desist is active for this case',
      section: '§1692c(c)',
    });
    blockReason = 'Cannot send message: cease and desist is active.';
  }

  // Check time restrictions
  const timeResult = isWithinAllowedHours(debtorId);
  if (!timeResult.allowed) {
    issues.push({
      type: ComplianceFlag.TIME_RESTRICTION,
      severity: FlagSeverity.VIOLATION,
      description: `Communication outside allowed hours (${timeResult.currentHour}:00 in debtor timezone)`,
      section: '§1692c(a)(1)',
    });
    if (!blockReason) {
      blockReason = `Cannot send message: outside allowed hours (8 AM - 9 PM in debtor's timezone).`;
    }
  }

  // Check frequency limits
  const frequencyResult = checkFrequencyCompliance(debtorId, caseId);
  if (!frequencyResult.compliant) {
    issues.push({
      type: ComplianceFlag.FREQUENCY_EXCEEDED,
      severity: FlagSeverity.VIOLATION,
      description: `Communication frequency limit exceeded (${frequencyResult.used}/${frequencyResult.limit} this week)`,
      section: 'Regulation F',
    });
    if (!blockReason) {
      blockReason = `Cannot send message: weekly communication limit reached (${frequencyResult.limit} per week).`;
    }
  } else if (frequencyResult.warningThreshold) {
    warnings.push(
      `Approaching communication limit: ${frequencyResult.remaining} remaining this week.`
    );
  }

  return {
    allowed: issues.filter((i) => i.severity === FlagSeverity.VIOLATION).length === 0,
    issues,
    warnings,
    blockReason,
  };
}

/**
 * Log a communication event
 */
export function logCommunication(
  details: Omit<CommunicationLogEntry, 'id' | 'timestamp' | 'complianceIssues' | 'compliant'>
): CommunicationLogEntry {
  const id = generateLogId();
  const timestamp = new Date();

  // Perform compliance checks
  const checkResult = performPreSendChecks(details.caseId, details.debtorId, details.creditorId || '');

  const entry: CommunicationLogEntry = {
    ...details,
    id,
    timestamp,
    compliant: checkResult.issues.length === 0,
    complianceIssues: checkResult.issues,
  };

  // Store immutably
  communicationLogs.set(id, Object.freeze({ ...entry }) as CommunicationLogEntry);

  // Record for frequency tracking
  if (details.direction === CommunicationDirection.OUTBOUND) {
    recordCommunication({
      id,
      debtorId: details.debtorId,
      caseId: details.caseId,
      direction: details.direction,
      channel: details.channel,
      timestamp,
    });
  }

  // Create flags for any issues
  for (const issue of checkResult.issues) {
    createComplianceFlag({
      caseId: details.caseId,
      messageId: details.messageId,
      flagType: issue.type,
      severity: issue.severity,
      details: {
        description: issue.description,
        section: issue.section,
        communicationLogId: id,
      },
    });
  }

  return entry;
}

/**
 * Create a compliance flag
 */
export function createComplianceFlag(details: {
  caseId: string;
  messageId: string | null;
  flagType: ComplianceFlag;
  severity: FlagSeverity;
  details: Record<string, unknown>;
}): ComplianceFlagRecord {
  const id = generateFlagId();

  const flag: ComplianceFlagRecord = {
    id,
    caseId: details.caseId,
    messageId: details.messageId,
    flagType: details.flagType,
    severity: details.severity,
    details: details.details,
    resolved: false,
    resolutionNotes: null,
    resolvedBy: null,
    createdAt: new Date(),
    resolvedAt: null,
  };

  complianceFlags.set(id, flag);
  return flag;
}

/**
 * Resolve a compliance flag
 */
export function resolveComplianceFlag(
  flagId: string,
  resolutionNotes: string,
  resolvedBy: string
): ComplianceFlagRecord | null {
  const flag = complianceFlags.get(flagId);
  if (!flag) {
    return null;
  }

  flag.resolved = true;
  flag.resolutionNotes = resolutionNotes;
  flag.resolvedBy = resolvedBy;
  flag.resolvedAt = new Date();

  return flag;
}

/**
 * Get communication logs for a case
 */
export function getCommunicationLogs(
  caseId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    direction?: CommunicationDirection;
    compliantOnly?: boolean;
  }
): CommunicationLogEntry[] {
  let logs = Array.from(communicationLogs.values()).filter((log) => log.caseId === caseId);

  if (options?.startDate) {
    logs = logs.filter((log) => log.timestamp >= options.startDate!);
  }
  if (options?.endDate) {
    logs = logs.filter((log) => log.timestamp <= options.endDate!);
  }
  if (options?.direction) {
    logs = logs.filter((log) => log.direction === options.direction);
  }
  if (options?.compliantOnly !== undefined) {
    logs = logs.filter((log) => log.compliant === options.compliantOnly);
  }

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get compliance flags
 */
export function getComplianceFlags(
  options?: {
    caseId?: string;
    resolved?: boolean;
    severity?: FlagSeverity;
    flagType?: ComplianceFlag;
  }
): ComplianceFlagRecord[] {
  let flags = Array.from(complianceFlags.values());

  if (options?.caseId) {
    flags = flags.filter((f) => f.caseId === options.caseId);
  }
  if (options?.resolved !== undefined) {
    flags = flags.filter((f) => f.resolved === options.resolved);
  }
  if (options?.severity) {
    flags = flags.filter((f) => f.severity === options.severity);
  }
  if (options?.flagType) {
    flags = flags.filter((f) => f.flagType === options.flagType);
  }

  return flags.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get compliance summary for a case
 */
export function getComplianceSummary(caseId: string): {
  totalCommunications: number;
  violations: number;
  warnings: number;
  complianceRate: number;
  unresolvedFlags: number;
  frequencyStatus: { used: number; limit: number };
  timeRestricted: boolean;
  ceaseDesistActive: boolean;
} {
  const logs = getCommunicationLogs(caseId);
  const flags = getComplianceFlags({ caseId });

  const violations = flags.filter((f) => f.severity === FlagSeverity.VIOLATION).length;
  const warnings = flags.filter((f) => f.severity === FlagSeverity.WARNING).length;
  const unresolvedFlags = flags.filter((f) => !f.resolved).length;

  const compliantLogs = logs.filter((l) => l.compliant).length;
  const complianceRate = logs.length > 0 ? (compliantLogs / logs.length) * 100 : 100;

  // Get current status
  const debtorId = logs[0]?.debtorId || '';
  const frequencyResult = checkFrequencyCompliance(debtorId, caseId);
  const timeResult = isWithinAllowedHours(debtorId);
  const ceaseDesistResult = checkCeaseDesist(caseId);

  return {
    totalCommunications: logs.length,
    violations,
    warnings,
    complianceRate: Math.round(complianceRate * 100) / 100,
    unresolvedFlags,
    frequencyStatus: {
      used: frequencyResult.used,
      limit: frequencyResult.limit,
    },
    timeRestricted: !timeResult.allowed,
    ceaseDesistActive: ceaseDesistResult.active,
  };
}

/**
 * Export compliance data for audit
 */
export function exportComplianceData(
  options: {
    caseId?: string;
    startDate?: Date;
    endDate?: Date;
    includeFlags?: boolean;
  }
): {
  communications: CommunicationLogEntry[];
  flags: ComplianceFlagRecord[];
  summary: ReturnType<typeof getComplianceSummary>;
  exportedAt: Date;
} {
  const logs = options.caseId
    ? getCommunicationLogs(options.caseId, {
        startDate: options.startDate,
        endDate: options.endDate,
      })
    : Array.from(communicationLogs.values()).filter((log) => {
        if (options.startDate && log.timestamp < options.startDate) return false;
        if (options.endDate && log.timestamp > options.endDate) return false;
        return true;
      });

  const flags =
    options.includeFlags !== false
      ? options.caseId
        ? getComplianceFlags({ caseId: options.caseId })
        : Array.from(complianceFlags.values())
      : [];

  const summary = options.caseId
    ? getComplianceSummary(options.caseId)
    : {
        totalCommunications: logs.length,
        violations: flags.filter((f) => f.severity === FlagSeverity.VIOLATION).length,
        warnings: flags.filter((f) => f.severity === FlagSeverity.WARNING).length,
        complianceRate: 0,
        unresolvedFlags: flags.filter((f) => !f.resolved).length,
        frequencyStatus: { used: 0, limit: 7 },
        timeRestricted: false,
        ceaseDesistActive: false,
      };

  return {
    communications: logs,
    flags,
    summary,
    exportedAt: new Date(),
  };
}
