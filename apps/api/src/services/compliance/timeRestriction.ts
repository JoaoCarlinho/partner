/**
 * Time Restriction Service
 * Enforces communication time windows per Regulation F
 */

import { REGULATION_F_RULES } from './complianceRules';

/**
 * Time check result
 */
export interface TimeCheckResult {
  allowed: boolean;
  currentHour: number;
  timezone: string;
  debtorLocalTime: string;
  nextAllowedTime: Date | null;
  restrictionStart: string;
  restrictionEnd: string;
}

// In-memory timezone store (would use database in production)
const debtorTimezones: Map<string, string> = new Map();

/**
 * Default timezone if not set
 */
const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Set debtor's timezone
 */
export function setDebtorTimezone(debtorId: string, timezone: string): void {
  debtorTimezones.set(debtorId, timezone);
}

/**
 * Get debtor's timezone
 */
export function getDebtorTimezone(debtorId: string): string {
  return debtorTimezones.get(debtorId) || DEFAULT_TIMEZONE;
}

/**
 * Check if current time is within allowed communication hours
 */
export function isWithinAllowedHours(debtorId: string): TimeCheckResult {
  const timezone = getDebtorTimezone(debtorId);

  // Get current time in debtor's timezone
  const now = new Date();
  const debtorLocalTime = now.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Parse the hour
  const [hourStr] = debtorLocalTime.split(':');
  const currentHour = parseInt(hourStr, 10);

  // Check if within allowed window
  const allowed =
    currentHour >= REGULATION_F_RULES.EARLIEST_HOUR &&
    currentHour < REGULATION_F_RULES.LATEST_HOUR;

  // Calculate next allowed time if currently restricted
  let nextAllowedTime: Date | null = null;
  if (!allowed) {
    nextAllowedTime = calculateNextAllowedTime(timezone, currentHour);
  }

  return {
    allowed,
    currentHour,
    timezone,
    debtorLocalTime: now.toLocaleString('en-US', { timeZone: timezone }),
    nextAllowedTime,
    restrictionStart: `${REGULATION_F_RULES.LATEST_HOUR}:00`,
    restrictionEnd: `${REGULATION_F_RULES.EARLIEST_HOUR}:00`,
  };
}

/**
 * Calculate next allowed communication time
 */
function calculateNextAllowedTime(timezone: string, currentHour: number): Date {
  const now = new Date();

  if (currentHour < REGULATION_F_RULES.EARLIEST_HOUR) {
    // Before 8 AM - next allowed is today at 8 AM
    return getDateAtHour(now, REGULATION_F_RULES.EARLIEST_HOUR, timezone);
  } else {
    // After 9 PM - next allowed is tomorrow at 8 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getDateAtHour(tomorrow, REGULATION_F_RULES.EARLIEST_HOUR, timezone);
  }
}

/**
 * Get a date at a specific hour in a timezone
 */
function getDateAtHour(date: Date, hour: number, timezone: string): Date {
  // Create a date string at the desired hour in the target timezone
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD format
  const targetTime = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:00:00`);

  // Adjust for timezone offset
  const localOffset = new Date().getTimezoneOffset() * 60000;
  const targetOffset = getTimezoneOffset(timezone);
  const adjustment = targetOffset - localOffset;

  return new Date(targetTime.getTime() + adjustment);
}

/**
 * Get timezone offset in milliseconds
 */
function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Format time restriction message for user
 */
export function getRestrictionMessage(debtorId: string): string {
  const result = isWithinAllowedHours(debtorId);

  if (result.allowed) {
    return 'Communication is currently allowed.';
  }

  const nextTime = result.nextAllowedTime
    ? result.nextAllowedTime.toLocaleString('en-US', {
        timeZone: result.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '8:00 AM';

  return `Communication is restricted until ${nextTime} in the debtor's timezone (${result.timezone}).`;
}

/**
 * Get hours until next allowed communication
 */
export function getHoursUntilAllowed(debtorId: string): number {
  const result = isWithinAllowedHours(debtorId);

  if (result.allowed || !result.nextAllowedTime) {
    return 0;
  }

  const now = new Date();
  const diffMs = result.nextAllowedTime.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}

/**
 * Check if a specific time would be allowed
 */
export function wouldBeAllowedAt(debtorId: string, targetTime: Date): boolean {
  const timezone = getDebtorTimezone(debtorId);

  const targetHourStr = targetTime.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
  });

  const targetHour = parseInt(targetHourStr, 10);

  return (
    targetHour >= REGULATION_F_RULES.EARLIEST_HOUR &&
    targetHour < REGULATION_F_RULES.LATEST_HOUR
  );
}
