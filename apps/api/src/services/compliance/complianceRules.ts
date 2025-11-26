/**
 * Compliance Rules
 * FDCPA and Regulation F compliance constants
 */

/**
 * Regulation F Rules
 */
export const REGULATION_F_RULES = {
  // Communication frequency limits
  MAX_CALLS_PER_WEEK: 7,
  WEEK_WINDOW_DAYS: 7,

  // Time restrictions (debtor local time)
  EARLIEST_HOUR: 8, // 8:00 AM
  LATEST_HOUR: 21, // 9:00 PM

  // Required disclosures
  MINI_MIRANDA_REQUIRED: true,
  VALIDATION_NOTICE_DAYS: 5, // Within 5 days of initial contact

  // Communication channels counted
  CHANNELS_IN_LIMIT: ['phone', 'platform_message', 'sms'] as const,
} as const;

/**
 * FDCPA Section References
 */
export const FDCPA_SECTIONS = {
  HARASSMENT: '§1692d',
  FALSE_REPRESENTATION: '§1692e',
  UNFAIR_PRACTICES: '§1692f',
  VALIDATION_NOTICE: '§1692g',
  COMMUNICATION_RESTRICTIONS: '§1692c',
} as const;

/**
 * Compliance flag types
 */
export enum ComplianceFlag {
  FDCPA_VIOLATION = 'fdcpa_violation',
  FREQUENCY_WARNING = 'frequency_warning',
  FREQUENCY_EXCEEDED = 'frequency_exceeded',
  TIME_RESTRICTION = 'time_restriction',
  DISCLOSURE_MISSING = 'disclosure_missing',
  TONE_BLOCKED = 'tone_blocked',
  CEASE_DESIST_ACTIVE = 'cease_desist_active',
  MANUAL_REVIEW = 'manual_review',
}

/**
 * Flag severity levels
 */
export enum FlagSeverity {
  WARNING = 'warning',
  VIOLATION = 'violation',
}

/**
 * Communication direction
 */
export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * Communication channels
 */
export enum CommunicationChannel {
  PLATFORM = 'platform',
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
}

/**
 * Communication types
 */
export enum CommunicationType {
  MESSAGE = 'message',
  EMAIL = 'email',
  SYSTEM = 'system',
  NOTIFICATION = 'notification',
}
