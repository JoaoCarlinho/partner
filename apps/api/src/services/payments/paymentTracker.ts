/**
 * Payment Tracker Service
 * Tracks payment status, records transactions, and manages plan health
 */

/**
 * Payment status
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Scheduled payment status
 */
export enum ScheduledPaymentStatus {
  UPCOMING = 'UPCOMING',
  DUE = 'DUE',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  MISSED = 'MISSED',
  WAIVED = 'WAIVED',
}

/**
 * Payment transaction record
 */
export interface PaymentTransaction {
  id: string;
  planId: string;
  scheduledPaymentId?: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: string;
  transactionRef?: string;
  processedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Scheduled payment with tracking
 */
export interface TrackedPayment {
  id: string;
  planId: string;
  paymentNumber: number;
  dueDate: Date;
  amount: number;
  status: ScheduledPaymentStatus;
  paidAmount: number;
  paidDate?: Date;
  transactions: PaymentTransaction[];
  daysOverdue: number;
  isGracePeriod: boolean;
}

/**
 * Plan payment summary
 */
export interface PaymentSummary {
  planId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  completedPayments: number;
  totalPayments: number;
  missedPayments: number;
  currentPayment?: TrackedPayment;
  nextPayment?: TrackedPayment;
  overduePayments: TrackedPayment[];
  planHealth: 'good' | 'at_risk' | 'defaulted';
  completionPercent: number;
  onTrackForCompletion: boolean;
}

/**
 * Calculate days between dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const ms = date2.getTime() - date1.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Determine payment status based on due date and grace period
 */
export function determinePaymentStatus(
  dueDate: Date,
  paidAmount: number,
  expectedAmount: number,
  gracePeriodDays: number = 5
): ScheduledPaymentStatus {
  const now = new Date();
  const daysFromDue = daysBetween(dueDate, now);

  if (paidAmount >= expectedAmount) {
    return ScheduledPaymentStatus.PAID;
  }

  if (paidAmount > 0 && paidAmount < expectedAmount) {
    return ScheduledPaymentStatus.PARTIAL;
  }

  if (daysFromDue < -7) {
    return ScheduledPaymentStatus.UPCOMING;
  }

  if (daysFromDue <= 0) {
    return ScheduledPaymentStatus.DUE;
  }

  if (daysFromDue <= gracePeriodDays) {
    return ScheduledPaymentStatus.OVERDUE; // Still in grace period but overdue
  }

  return ScheduledPaymentStatus.MISSED;
}

/**
 * Calculate plan health
 */
export function calculatePlanHealth(
  missedPayments: number,
  defaultThreshold: number = 3
): 'good' | 'at_risk' | 'defaulted' {
  if (missedPayments >= defaultThreshold) {
    return 'defaulted';
  }
  if (missedPayments >= 1) {
    return 'at_risk';
  }
  return 'good';
}

/**
 * Generate payment summary from tracked payments
 */
export function generatePaymentSummary(
  planId: string,
  totalPlanAmount: number,
  trackedPayments: TrackedPayment[],
  defaultThreshold: number = 3
): PaymentSummary {
  const now = new Date();

  // Calculate totals
  const paidAmount = trackedPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const remainingAmount = totalPlanAmount - paidAmount;

  // Count payments by status
  const completedPayments = trackedPayments.filter(
    (p) => p.status === ScheduledPaymentStatus.PAID
  ).length;
  const missedPayments = trackedPayments.filter(
    (p) => p.status === ScheduledPaymentStatus.MISSED
  ).length;

  // Find current and next payments
  const sortedByDate = [...trackedPayments].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  );

  const currentPayment = sortedByDate.find(
    (p) =>
      p.status === ScheduledPaymentStatus.DUE ||
      p.status === ScheduledPaymentStatus.OVERDUE ||
      p.status === ScheduledPaymentStatus.PARTIAL
  );

  const nextPayment = sortedByDate.find(
    (p) =>
      p.status === ScheduledPaymentStatus.UPCOMING &&
      p.dueDate > (currentPayment?.dueDate || now)
  );

  // Find overdue payments
  const overduePayments = trackedPayments.filter(
    (p) =>
      p.status === ScheduledPaymentStatus.OVERDUE ||
      p.status === ScheduledPaymentStatus.PARTIAL
  );

  // Calculate health and completion
  const planHealth = calculatePlanHealth(missedPayments, defaultThreshold);
  const completionPercent =
    trackedPayments.length > 0
      ? Math.round((completedPayments / trackedPayments.length) * 100)
      : 0;

  // On track if no missed payments and current is not overdue
  const onTrackForCompletion =
    missedPayments === 0 &&
    overduePayments.length === 0;

  return {
    planId,
    totalAmount: totalPlanAmount,
    paidAmount,
    remainingAmount,
    completedPayments,
    totalPayments: trackedPayments.length,
    missedPayments,
    currentPayment,
    nextPayment,
    overduePayments,
    planHealth,
    completionPercent,
    onTrackForCompletion,
  };
}

/**
 * Calculate late fee
 */
export function calculateLateFee(
  paymentAmount: number,
  lateFeePercent: number,
  daysOverdue: number,
  maxLateFee?: number
): number {
  if (daysOverdue <= 0) return 0;

  const fee = paymentAmount * (lateFeePercent / 100);
  return maxLateFee ? Math.min(fee, maxLateFee) : fee;
}

/**
 * Get upcoming payments within date range
 */
export function getUpcomingPayments(
  trackedPayments: TrackedPayment[],
  days: number = 30
): TrackedPayment[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return trackedPayments
    .filter(
      (p) =>
        (p.status === ScheduledPaymentStatus.UPCOMING ||
          p.status === ScheduledPaymentStatus.DUE) &&
        p.dueDate >= now &&
        p.dueDate <= futureDate
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Format payment history for display
 */
export function formatPaymentHistory(
  trackedPayments: TrackedPayment[]
): Array<{
  paymentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAmount: number;
  paidDate?: string;
  statusClass: 'success' | 'warning' | 'error' | 'neutral';
}> {
  return trackedPayments.map((p) => {
    let statusClass: 'success' | 'warning' | 'error' | 'neutral' = 'neutral';

    switch (p.status) {
      case ScheduledPaymentStatus.PAID:
        statusClass = 'success';
        break;
      case ScheduledPaymentStatus.PARTIAL:
      case ScheduledPaymentStatus.OVERDUE:
        statusClass = 'warning';
        break;
      case ScheduledPaymentStatus.MISSED:
        statusClass = 'error';
        break;
    }

    return {
      paymentNumber: p.paymentNumber,
      dueDate: p.dueDate.toISOString(),
      amount: p.amount,
      status: p.status,
      paidAmount: p.paidAmount,
      paidDate: p.paidDate?.toISOString(),
      statusClass,
    };
  });
}

/**
 * Check if reminder should be sent
 */
export function shouldSendReminder(
  payment: TrackedPayment,
  reminderDays: number[] = [7, 3, 1]
): { send: boolean; daysUntilDue: number } {
  if (payment.status !== ScheduledPaymentStatus.UPCOMING) {
    return { send: false, daysUntilDue: 0 };
  }

  const now = new Date();
  const daysUntilDue = daysBetween(now, payment.dueDate);

  const send = reminderDays.includes(daysUntilDue);

  return { send, daysUntilDue };
}
