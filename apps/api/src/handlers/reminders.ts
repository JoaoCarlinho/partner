/**
 * Reminders API Handler
 * Endpoints for payment reminder management
 */

import { Request, Response } from 'express';
import {
  scheduleRemindersForPlan,
  cancelRemindersForPayment,
  getRemindersForPayment,
  getDebtorPreferences,
  updateDebtorPreferences,
  getOrgReminderSettings,
  updateOrgReminderSettings,
  sendManualReminder,
  getPendingRemindersForPlan,
  ReminderChannel,
} from '../services/reminders/reminderService';
import { getReminderTemplate, previewTemplate, getTemplateTypes } from '../templates/reminders';

/**
 * Payment method type
 */
type PaymentMethod = 'check' | 'bank_transfer' | 'cash' | 'other';

/**
 * Payment status
 */
type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'MISSED';

/**
 * Recorded payment
 */
interface RecordedPayment {
  id: string;
  planId: string;
  scheduledAmount: number;
  dueDate: Date;
  status: PaymentStatus;
  paidDate: Date | null;
  paidAmount: number | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  recordedBy: string | null;
  recordedAt: Date | null;
}

/**
 * In-memory payment store (production would use database)
 */
const paymentsStore = new Map<string, RecordedPayment>();

/**
 * Generate unique ID
 */
function generateId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Record a payment
 * POST /api/v1/payments/:paymentId/record
 */
export async function recordPayment(req: Request, res: Response): Promise<void> {
  try {
    const { paymentId } = req.params;
    const { paidDate, paidAmount, paymentMethod, notes } = req.body;
    const actorId = req.headers['x-user-id'] as string || 'system';

    // Validate required fields
    if (!paidDate || paidAmount === undefined || !paymentMethod) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'paidDate, paidAmount, and paymentMethod are required',
      });
      return;
    }

    // Get or create payment record
    let payment = paymentsStore.get(paymentId);
    if (!payment) {
      // Create a mock payment for demo
      payment = {
        id: paymentId,
        planId: 'plan_demo',
        scheduledAmount: paidAmount,
        dueDate: new Date(),
        status: 'PENDING',
        paidDate: null,
        paidAmount: null,
        paymentMethod: null,
        notes: null,
        recordedBy: null,
        recordedAt: null,
      };
    }

    if (payment.status === 'PAID') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Payment has already been recorded',
      });
      return;
    }

    // Determine status based on amount
    const status: PaymentStatus = paidAmount >= payment.scheduledAmount ? 'PAID' : 'PARTIAL';

    // Update payment
    payment.status = status;
    payment.paidDate = new Date(paidDate);
    payment.paidAmount = paidAmount;
    payment.paymentMethod = paymentMethod;
    payment.notes = notes || null;
    payment.recordedBy = actorId;
    payment.recordedAt = new Date();

    paymentsStore.set(paymentId, payment);

    // Cancel pending reminders for this payment
    const cancelledCount = await cancelRemindersForPayment(paymentId);

    res.json({
      data: {
        id: payment.id,
        status: payment.status,
        paidDate: payment.paidDate.toISOString(),
        paidAmount: payment.paidAmount,
        scheduledAmount: payment.scheduledAmount,
        paymentMethod: payment.paymentMethod,
        remindersCancelled: cancelledCount,
      },
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to record payment',
    });
  }
}

/**
 * Edit recorded payment
 * PUT /api/v1/payments/:paymentId
 */
export async function editPayment(req: Request, res: Response): Promise<void> {
  try {
    const { paymentId } = req.params;
    const { paidDate, paidAmount, paymentMethod, notes, reason } = req.body;
    const actorId = req.headers['x-user-id'] as string || 'system';

    if (!reason) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Reason for edit is required',
      });
      return;
    }

    const payment = paymentsStore.get(paymentId);
    if (!payment) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Payment not found',
      });
      return;
    }

    // Update fields if provided
    if (paidDate) payment.paidDate = new Date(paidDate);
    if (paidAmount !== undefined) {
      payment.paidAmount = paidAmount;
      payment.status = paidAmount >= payment.scheduledAmount ? 'PAID' : 'PARTIAL';
    }
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (notes !== undefined) payment.notes = notes;

    paymentsStore.set(paymentId, payment);

    // Audit log would be created here
    console.log(`Payment ${paymentId} edited by ${actorId}. Reason: ${reason}`);

    res.json({
      data: {
        id: payment.id,
        status: payment.status,
        paidDate: payment.paidDate?.toISOString(),
        paidAmount: payment.paidAmount,
        scheduledAmount: payment.scheduledAmount,
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
      },
    });
  } catch (error) {
    console.error('Error editing payment:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to edit payment',
    });
  }
}

/**
 * Reverse payment recording
 * DELETE /api/v1/payments/:paymentId/record
 */
export async function reversePayment(req: Request, res: Response): Promise<void> {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const actorId = req.headers['x-user-id'] as string || 'system';

    if (!reason) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Reason for reversal is required',
      });
      return;
    }

    const payment = paymentsStore.get(paymentId);
    if (!payment) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Payment not found',
      });
      return;
    }

    if (payment.status === 'PENDING') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Payment has not been recorded',
      });
      return;
    }

    // Reset payment to pending
    payment.status = 'PENDING';
    payment.paidDate = null;
    payment.paidAmount = null;
    payment.paymentMethod = null;

    paymentsStore.set(paymentId, payment);

    // Audit log would be created here
    console.log(`Payment ${paymentId} reversed by ${actorId}. Reason: ${reason}`);

    res.json({
      data: {
        id: payment.id,
        status: payment.status,
        message: 'Payment recording reversed',
      },
    });
  } catch (error) {
    console.error('Error reversing payment:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to reverse payment',
    });
  }
}

/**
 * Get debtor notification preferences
 * GET /api/v1/debtors/preferences
 */
export async function getPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User ID required',
      });
      return;
    }

    const preferences = await getDebtorPreferences(userId);

    res.json({
      data: {
        reminderEmail: preferences.reminderEmail,
        reminderInApp: preferences.reminderInApp,
        reminderSms: preferences.reminderSms,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
      },
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get preferences',
    });
  }
}

/**
 * Update debtor notification preferences
 * PUT /api/v1/debtors/preferences
 */
export async function updatePreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User ID required',
      });
      return;
    }

    const preferences = await updateDebtorPreferences(userId, updates);

    res.json({
      data: {
        reminderEmail: preferences.reminderEmail,
        reminderInApp: preferences.reminderInApp,
        reminderSms: preferences.reminderSms,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
      },
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update preferences',
    });
  }
}

/**
 * Get organization reminder settings
 * GET /api/v1/organizations/:orgId/reminder-settings
 */
export async function getOrgSettings(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;

    const settings = await getOrgReminderSettings(orgId);

    res.json({
      data: settings,
    });
  } catch (error) {
    console.error('Error getting org settings:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get organization settings',
    });
  }
}

/**
 * Update organization reminder settings
 * PUT /api/v1/organizations/:orgId/reminder-settings
 */
export async function updateOrgSettings(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;
    const { reminderDaysBefore, reminderDaysAfter, reminderTime } = req.body;

    // Validate
    if (!Array.isArray(reminderDaysBefore) || !Array.isArray(reminderDaysAfter)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'reminderDaysBefore and reminderDaysAfter must be arrays',
      });
      return;
    }

    const settings = await updateOrgReminderSettings(orgId, {
      reminderDaysBefore,
      reminderDaysAfter,
      reminderTime: reminderTime || '10:00',
    });

    res.json({
      data: settings,
    });
  } catch (error) {
    console.error('Error updating org settings:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update organization settings',
    });
  }
}

/**
 * Get reminders for a payment
 * GET /api/v1/payments/:paymentId/reminders
 */
export async function getPaymentReminders(req: Request, res: Response): Promise<void> {
  try {
    const { paymentId } = req.params;

    const reminders = await getRemindersForPayment(paymentId);

    res.json({
      data: reminders.map((r) => ({
        id: r.id,
        type: r.reminderType,
        scheduledFor: r.scheduledFor.toISOString(),
        sentAt: r.sentAt?.toISOString() || null,
        channel: r.channel,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error('Error getting payment reminders:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get reminders',
    });
  }
}

/**
 * Send manual reminder
 * POST /api/v1/payments/:paymentId/reminders/send
 */
export async function sendReminder(req: Request, res: Response): Promise<void> {
  try {
    const { paymentId } = req.params;
    const { channel } = req.body;

    if (!channel || !['EMAIL', 'IN_APP', 'SMS'].includes(channel)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Valid channel (EMAIL, IN_APP, SMS) is required',
      });
      return;
    }

    const reminder = await sendManualReminder(paymentId, channel as ReminderChannel);

    res.json({
      data: {
        id: reminder.id,
        status: reminder.status,
        sentAt: reminder.sentAt?.toISOString(),
        channel: reminder.channel,
      },
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to send reminder',
    });
  }
}

/**
 * Get pending reminders for a plan
 * GET /api/v1/plans/:planId/reminders
 */
export async function getPlanReminders(req: Request, res: Response): Promise<void> {
  try {
    const { planId } = req.params;

    const reminders = await getPendingRemindersForPlan(planId);

    res.json({
      data: reminders.map((r) => ({
        id: r.id,
        paymentId: r.scheduledPaymentId,
        type: r.reminderType,
        scheduledFor: r.scheduledFor.toISOString(),
        channel: r.channel,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error('Error getting plan reminders:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get plan reminders',
    });
  }
}

/**
 * Preview reminder template
 * GET /api/v1/reminders/templates/:type/preview
 */
export async function previewReminderTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params;

    const validTypes = getTemplateTypes();
    if (!validTypes.includes(type as any)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Invalid template type. Valid types: ${validTypes.join(', ')}`,
      });
      return;
    }

    const template = previewTemplate(type as any);

    res.json({
      data: template,
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to preview template',
    });
  }
}

export default {
  recordPayment,
  editPayment,
  reversePayment,
  getPreferences,
  updatePreferences,
  getOrgSettings,
  updateOrgSettings,
  getPaymentReminders,
  sendReminder,
  getPlanReminders,
  previewReminderTemplate,
};
