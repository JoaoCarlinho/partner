/**
 * FDCPA Compliance Types
 * Types for compliance validation of demand letters
 */

/**
 * Debt details required for compliance validation
 */
export interface DebtDetails {
  principal: number;
  interest?: number;
  fees?: number;
  originDate: string;
  creditorName: string;
  originalCreditor?: string;
  accountNumber?: string;
}

/**
 * Context for validation (state, timing, etc.)
 */
export interface ValidationContext {
  state: string;
  debtDetails: DebtDetails;
  sendTime?: Date;
  debtorTimezone?: string;
  isInitialContact?: boolean;
}

/**
 * Result of a single compliance check
 */
export interface ComplianceCheckResult {
  id: string;
  section: string;
  name: string;
  passed: boolean;
  required: boolean;
  details: string;
  suggestion?: string;
  matchedText?: string;
}

/**
 * Overall compliance validation result
 */
export interface ComplianceResult {
  isCompliant: boolean;
  score: number;
  checks: ComplianceCheckResult[];
  missingRequirements: string[];
  warnings: string[];
  suggestions: string[];
  validatedAt: string;
}

/**
 * Compliance requirement definition
 */
export interface ComplianceRequirement {
  id: string;
  section: string;
  name: string;
  description: string;
  required: boolean | 'conditional';
  conditionDescription?: string;
}

/**
 * State-specific rule configuration
 */
export interface StateRule {
  stateCode: string;
  stateName: string;
  statuteOfLimitations: number; // years
  additionalRequirements: string[];
  timeBarredDisclosureRequired: boolean;
  additionalDisclosures?: string[];
}

/**
 * Communication timing restrictions
 */
export interface CommunicationTiming {
  earliestHour: number; // 0-23
  latestHour: number; // 0-23
  allowWeekends: boolean;
  allowHolidays: boolean;
}

/**
 * Generated disclosure block
 */
export interface DisclosureBlock {
  id: string;
  name: string;
  content: string;
  section: string;
  required: boolean;
}
