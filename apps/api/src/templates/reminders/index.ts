/**
 * Reminder Email Templates
 * Templates for payment reminder notifications
 */

import { ReminderType } from '../../services/reminders/reminderService';

/**
 * Template context
 */
export interface ReminderTemplateContext {
  debtorName: string;
  paymentAmount: string;
  dueDate: string;
  paymentNumber: number;
  totalPayments: number;
  creditorName: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
  loginUrl: string;
  daysMissed?: number;
}

/**
 * Template result
 */
export interface ReminderTemplate {
  subject: string;
  body: string;
  html?: string;
}

/**
 * Interpolate template variables
 */
function interpolate(text: string, context: Record<string, string | number | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * Upcoming 7 days reminder
 */
const UPCOMING_7D_TEMPLATE = {
  subject: 'Friendly Reminder: Payment Due in 7 Days',
  body: `Hello {{debtorName}},

This is a friendly reminder that your payment of {{paymentAmount}} is due on {{dueDate}}.

Payment Details:
• Amount Due: {{paymentAmount}}
• Due Date: {{dueDate}}
• Payment {{paymentNumber}} of {{totalPayments}}

If you have any questions or need to discuss your payment plan, please log in to your account.

Best regards,
{{creditorName}}

---
To update your notification preferences: {{preferencesUrl}}
To unsubscribe from email reminders: {{unsubscribeUrl}}`,
};

/**
 * Upcoming 1 day reminder
 */
const UPCOMING_1D_TEMPLATE = {
  subject: 'Payment Due Tomorrow - {{dueDate}}',
  body: `Hello {{debtorName}},

This is a reminder that your payment of {{paymentAmount}} is due tomorrow, {{dueDate}}.

Payment Details:
• Amount Due: {{paymentAmount}}
• Due Date: {{dueDate}}
• Payment {{paymentNumber}} of {{totalPayments}}

Please ensure your payment is submitted on time to keep your account in good standing.

If you have any questions, please log in to your account or contact us.

Best regards,
{{creditorName}}

---
To update your notification preferences: {{preferencesUrl}}
To unsubscribe from email reminders: {{unsubscribeUrl}}`,
};

/**
 * Missed 1 day notice
 */
const MISSED_1D_TEMPLATE = {
  subject: 'Action Required: Payment Past Due',
  body: `Hello {{debtorName}},

We noticed that your payment of {{paymentAmount}}, which was due on {{dueDate}}, has not been received.

Payment Details:
• Amount Due: {{paymentAmount}}
• Original Due Date: {{dueDate}}
• Payment {{paymentNumber}} of {{totalPayments}}

Please submit your payment as soon as possible to avoid any impact to your payment plan.

If you're experiencing difficulties or need to discuss alternative arrangements, please log in to your account to contact us. We're here to help find a solution that works for you.

Best regards,
{{creditorName}}

---
To update your notification preferences: {{preferencesUrl}}
To unsubscribe from email reminders: {{unsubscribeUrl}}`,
};

/**
 * Missed 7 days follow-up
 */
const MISSED_7D_TEMPLATE = {
  subject: 'Important: Payment 7 Days Overdue',
  body: `Hello {{debtorName}},

This is a follow-up regarding your payment of {{paymentAmount}} that was due on {{dueDate}}, now 7 days past due.

Payment Details:
• Amount Due: {{paymentAmount}}
• Original Due Date: {{dueDate}}
• Payment {{paymentNumber}} of {{totalPayments}}
• Days Overdue: {{daysMissed}}

It's important to address this payment to maintain your payment plan agreement. Missing multiple payments may affect your plan status.

If you're facing financial difficulties, please reach out to us. We may be able to adjust your payment plan to better fit your current situation.

Log in to your account: {{loginUrl}}

Best regards,
{{creditorName}}

---
To update your notification preferences: {{preferencesUrl}}
To unsubscribe from email reminders: {{unsubscribeUrl}}`,
};

/**
 * Template map
 */
const TEMPLATES: Record<ReminderType, typeof UPCOMING_7D_TEMPLATE> = {
  UPCOMING_7D: UPCOMING_7D_TEMPLATE,
  UPCOMING_1D: UPCOMING_1D_TEMPLATE,
  MISSED_1D: MISSED_1D_TEMPLATE,
  MISSED_7D: MISSED_7D_TEMPLATE,
};

/**
 * Get rendered template for reminder type
 */
export function getReminderTemplate(
  type: ReminderType,
  context: ReminderTemplateContext
): ReminderTemplate {
  const template = TEMPLATES[type];

  return {
    subject: interpolate(template.subject, context as unknown as Record<string, string | number>),
    body: interpolate(template.body, context as unknown as Record<string, string | number>),
  };
}

/**
 * Get all template types for preview
 */
export function getTemplateTypes(): ReminderType[] {
  return Object.keys(TEMPLATES) as ReminderType[];
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(type: ReminderType): ReminderTemplate {
  const sampleContext: ReminderTemplateContext = {
    debtorName: 'John Doe',
    paymentAmount: '$150.00',
    dueDate: 'January 15, 2025',
    paymentNumber: 3,
    totalPayments: 12,
    creditorName: 'ABC Collections',
    preferencesUrl: 'https://example.com/preferences',
    unsubscribeUrl: 'https://example.com/unsubscribe',
    loginUrl: 'https://example.com/login',
    daysMissed: 7,
  };

  return getReminderTemplate(type, sampleContext);
}

export default {
  getReminderTemplate,
  getTemplateTypes,
  previewTemplate,
};
