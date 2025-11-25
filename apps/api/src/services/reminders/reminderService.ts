/**
 * Reminder Service
 * Handles payment reminder scheduling, delivery, and preference management
 */

/**
 * Reminder types
 */
export type ReminderType = 'UPCOMING_7D' | 'UPCOMING_1D' | 'MISSED_1D' | 'MISSED_7D';

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type ReminderChannel = 'EMAIL' | 'IN_APP' | 'SMS';

/**
 * Payment reminder
 */
export interface PaymentReminder {
  id: string;
  scheduledPaymentId: string;
  reminderType: ReminderType;
  scheduledFor: Date;
  sentAt: Date | null;
  channel: ReminderChannel;
  status: ReminderStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
}

/**
 * Debtor notification preferences
 */
export interface DebtorPreferences {
  id: string;
  userId: string;
  reminderEmail: boolean;
  reminderInApp: boolean;
  reminderSms: boolean;
  quietHoursStart: string | null; // "21:00"
  quietHoursEnd: string | null; // "08:00"
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization reminder settings
 */
export interface OrgReminderSettings {
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
  reminderTime: string; // "10:00"
}

/**
 * Default reminder schedule
 */
const DEFAULT_REMINDER_SCHEDULE: Array<{
  daysBefore?: number;
  daysAfter?: number;
  type: ReminderType;
}> = [
  { daysBefore: 7, type: 'UPCOMING_7D' },
  { daysBefore: 1, type: 'UPCOMING_1D' },
  { daysAfter: 1, type: 'MISSED_1D' },
  { daysAfter: 7, type: 'MISSED_7D' },
];

/**
 * In-memory stores (production would use database)
 */
const remindersStore = new Map<string, PaymentReminder>();
const preferencesStore = new Map<string, DebtorPreferences>();
const orgSettingsStore = new Map<string, OrgReminderSettings>();

/**
 * Add/subtract days from date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Schedule reminders for a payment plan
 */
export async function scheduleRemindersForPlan(
  planId: string,
  payments: Array<{ id: string; dueDate: Date; status: string }>,
  orgId: string
): Promise<PaymentReminder[]> {
  const orgSettings = orgSettingsStore.get(orgId) || {
    reminderDaysBefore: [7, 1],
    reminderDaysAfter: [1, 7],
    reminderTime: '10:00',
  };

  const scheduled: PaymentReminder[] = [];

  for (const payment of payments) {
    if (payment.status !== 'PENDING') continue;

    const dueDate = new Date(payment.dueDate);

    for (const config of DEFAULT_REMINDER_SCHEDULE) {
      // Check if this reminder type is configured
      if (config.daysBefore && !orgSettings.reminderDaysBefore.includes(config.daysBefore)) {
        continue;
      }
      if (config.daysAfter && !orgSettings.reminderDaysAfter.includes(config.daysAfter)) {
        continue;
      }

      const scheduledFor = config.daysBefore
        ? addDays(dueDate, -config.daysBefore)
        : addDays(dueDate, config.daysAfter!);

      // Set specific time
      const [hours, minutes] = orgSettings.reminderTime.split(':');
      scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Don't schedule past reminders
      if (scheduledFor < new Date()) continue;

      const reminder: PaymentReminder = {
        id: generateId(),
        scheduledPaymentId: payment.id,
        reminderType: config.type,
        scheduledFor,
        sentAt: null,
        channel: 'EMAIL',
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        createdAt: new Date(),
      };

      remindersStore.set(reminder.id, reminder);
      scheduled.push(reminder);
    }
  }

  return scheduled;
}

/**
 * Cancel pending reminders for a payment
 */
export async function cancelRemindersForPayment(paymentId: string): Promise<number> {
  let cancelled = 0;

  for (const [id, reminder] of remindersStore) {
    if (reminder.scheduledPaymentId === paymentId && reminder.status === 'PENDING') {
      reminder.status = 'CANCELLED';
      remindersStore.set(id, reminder);
      cancelled++;
    }
  }

  return cancelled;
}

/**
 * Get pending reminders that are due
 */
export async function getDueReminders(limit: number = 100): Promise<PaymentReminder[]> {
  const now = new Date();
  const due: PaymentReminder[] = [];

  for (const reminder of remindersStore.values()) {
    if (reminder.status === 'PENDING' && reminder.scheduledFor <= now) {
      due.push(reminder);
      if (due.length >= limit) break;
    }
  }

  return due;
}

/**
 * Get reminders for a payment
 */
export async function getRemindersForPayment(paymentId: string): Promise<PaymentReminder[]> {
  const reminders: PaymentReminder[] = [];

  for (const reminder of remindersStore.values()) {
    if (reminder.scheduledPaymentId === paymentId) {
      reminders.push(reminder);
    }
  }

  return reminders.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

/**
 * Update reminder status
 */
export async function updateReminderStatus(
  id: string,
  status: ReminderStatus,
  error?: string
): Promise<PaymentReminder | null> {
  const reminder = remindersStore.get(id);
  if (!reminder) return null;

  reminder.status = status;
  if (status === 'SENT') {
    reminder.sentAt = new Date();
  }
  if (status === 'FAILED') {
    reminder.attempts++;
    reminder.lastError = error || null;
  }

  remindersStore.set(id, reminder);
  return reminder;
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(preferences: DebtorPreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  // Get current time in user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: preferences.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const currentTime = formatter.format(now);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;

  const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 21:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get debtor preferences
 */
export async function getDebtorPreferences(userId: string): Promise<DebtorPreferences> {
  const existing = preferencesStore.get(userId);
  if (existing) return existing;

  // Return defaults
  return {
    id: generateId(),
    userId,
    reminderEmail: true,
    reminderInApp: true,
    reminderSms: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'America/New_York',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update debtor preferences
 */
export async function updateDebtorPreferences(
  userId: string,
  updates: Partial<Omit<DebtorPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<DebtorPreferences> {
  const existing = await getDebtorPreferences(userId);

  const updated: DebtorPreferences = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  preferencesStore.set(userId, updated);
  return updated;
}

/**
 * Get organization reminder settings
 */
export async function getOrgReminderSettings(orgId: string): Promise<OrgReminderSettings> {
  const existing = orgSettingsStore.get(orgId);
  if (existing) return existing;

  // Return defaults
  return {
    reminderDaysBefore: [7, 1],
    reminderDaysAfter: [1, 7],
    reminderTime: '10:00',
  };
}

/**
 * Update organization reminder settings
 */
export async function updateOrgReminderSettings(
  orgId: string,
  settings: OrgReminderSettings
): Promise<OrgReminderSettings> {
  orgSettingsStore.set(orgId, settings);
  return settings;
}

/**
 * Manual reminder send
 */
export async function sendManualReminder(
  paymentId: string,
  channel: ReminderChannel
): Promise<PaymentReminder> {
  const reminder: PaymentReminder = {
    id: generateId(),
    scheduledPaymentId: paymentId,
    reminderType: 'UPCOMING_1D', // Manual reminders use this type
    scheduledFor: new Date(),
    sentAt: new Date(),
    channel,
    status: 'SENT',
    attempts: 1,
    lastError: null,
    createdAt: new Date(),
  };

  remindersStore.set(reminder.id, reminder);
  return reminder;
}

/**
 * Get pending reminders for a plan (for display)
 */
export async function getPendingRemindersForPlan(planId: string): Promise<PaymentReminder[]> {
  // In production, would filter by planId through payment relationship
  const pending: PaymentReminder[] = [];

  for (const reminder of remindersStore.values()) {
    if (reminder.status === 'PENDING') {
      pending.push(reminder);
    }
  }

  return pending.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export default {
  scheduleRemindersForPlan,
  cancelRemindersForPayment,
  getDueReminders,
  getRemindersForPayment,
  updateReminderStatus,
  isQuietHours,
  getDebtorPreferences,
  updateDebtorPreferences,
  getOrgReminderSettings,
  updateOrgReminderSettings,
  sendManualReminder,
  getPendingRemindersForPlan,
};
