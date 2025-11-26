/**
 * Payments API Handler
 * Endpoints for payment tracking and transaction management
 */

import { Router, Request, Response } from 'express';
import {
  PaymentTransaction,
  PaymentStatus,
  TrackedPayment,
  ScheduledPaymentStatus,
  PaymentSummary,
  determinePaymentStatus,
  generatePaymentSummary,
  calculateLateFee,
  getUpcomingPayments,
  formatPaymentHistory,
  shouldSendReminder,
} from '../services/payments/paymentTracker';

const router = Router();

/**
 * In-memory storage
 * In production, use database
 */
const transactions: Map<string, PaymentTransaction> = new Map();
const trackedPayments: Map<string, TrackedPayment[]> = new Map(); // planId -> payments
const planConfigs: Map<string, { totalAmount: number; gracePeriodDays: number; lateFeePercent: number; defaultThreshold: number }> = new Map();

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize tracked payments for a plan
 * POST /api/payments/plans/:planId/init
 */
router.post('/plans/:planId/init', (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { schedule, totalAmount, gracePeriodDays = 5, lateFeePercent = 5, defaultThreshold = 3 } = req.body;

    if (!schedule || !Array.isArray(schedule) || !totalAmount) {
      return res.status(400).json({ error: 'Schedule array and totalAmount required' });
    }

    // Store plan config
    planConfigs.set(planId, { totalAmount, gracePeriodDays, lateFeePercent, defaultThreshold });

    // Create tracked payments from schedule
    const payments: TrackedPayment[] = schedule.map((item: { paymentNumber: number; dueDate: string; amount: number }, index: number) => ({
      id: generateId('pmt'),
      planId,
      paymentNumber: item.paymentNumber || index + 1,
      dueDate: new Date(item.dueDate),
      amount: item.amount,
      status: determinePaymentStatus(new Date(item.dueDate), 0, item.amount, gracePeriodDays),
      paidAmount: 0,
      transactions: [],
      daysOverdue: 0,
      isGracePeriod: false,
    }));

    trackedPayments.set(planId, payments);

    const summary = generatePaymentSummary(planId, totalAmount, payments, defaultThreshold);

    return res.status(201).json({
      planId,
      payments,
      summary,
    });
  } catch (error) {
    console.error('Init payments error:', error);
    return res.status(500).json({ error: 'Failed to initialize payments' });
  }
});

/**
 * Get payment summary for a plan
 * GET /api/payments/plans/:planId/summary
 */
router.get('/plans/:planId/summary', (req: Request, res: Response) => {
  const { planId } = req.params;

  const payments = trackedPayments.get(planId);
  const config = planConfigs.get(planId);

  if (!payments || !config) {
    return res.status(404).json({ error: 'Plan payments not found' });
  }

  // Refresh statuses
  const updatedPayments = payments.map((p) => ({
    ...p,
    status: p.status === ScheduledPaymentStatus.PAID || p.status === ScheduledPaymentStatus.MISSED
      ? p.status
      : determinePaymentStatus(p.dueDate, p.paidAmount, p.amount, config.gracePeriodDays),
  }));
  trackedPayments.set(planId, updatedPayments);

  const summary = generatePaymentSummary(planId, config.totalAmount, updatedPayments, config.defaultThreshold);

  return res.json(summary);
});

/**
 * Get payment history for a plan
 * GET /api/payments/plans/:planId/history
 */
router.get('/plans/:planId/history', (req: Request, res: Response) => {
  const { planId } = req.params;

  const payments = trackedPayments.get(planId);
  if (!payments) {
    return res.status(404).json({ error: 'Plan payments not found' });
  }

  const history = formatPaymentHistory(payments);

  return res.json({
    planId,
    history,
    totalPayments: payments.length,
  });
});

/**
 * Get upcoming payments for a plan
 * GET /api/payments/plans/:planId/upcoming
 */
router.get('/plans/:planId/upcoming', (req: Request, res: Response) => {
  const { planId } = req.params;
  const { days } = req.query;

  const payments = trackedPayments.get(planId);
  if (!payments) {
    return res.status(404).json({ error: 'Plan payments not found' });
  }

  const upcoming = getUpcomingPayments(payments, days ? parseInt(days as string) : 30);

  return res.json({
    planId,
    upcoming,
    count: upcoming.length,
  });
});

/**
 * Record a payment transaction
 * POST /api/payments/plans/:planId/pay
 */
router.post('/plans/:planId/pay', (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { paymentId, amount, paymentMethod, transactionRef } = req.body;

    const payments = trackedPayments.get(planId);
    const config = planConfigs.get(planId);

    if (!payments || !config) {
      return res.status(404).json({ error: 'Plan payments not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount required' });
    }

    // Find target payment (specific or oldest unpaid)
    let targetPayment = paymentId
      ? payments.find((p) => p.id === paymentId)
      : payments.find((p) =>
          p.status !== ScheduledPaymentStatus.PAID &&
          p.status !== ScheduledPaymentStatus.WAIVED
        );

    if (!targetPayment) {
      return res.status(400).json({ error: 'No outstanding payments found' });
    }

    // Create transaction
    const transaction: PaymentTransaction = {
      id: generateId('txn'),
      planId,
      scheduledPaymentId: targetPayment.id,
      amount,
      status: PaymentStatus.COMPLETED,
      paymentMethod,
      transactionRef,
      processedAt: new Date(),
      createdAt: new Date(),
    };
    transactions.set(transaction.id, transaction);

    // Update payment
    targetPayment.paidAmount += amount;
    targetPayment.transactions.push(transaction);

    if (targetPayment.paidAmount >= targetPayment.amount) {
      targetPayment.status = ScheduledPaymentStatus.PAID;
      targetPayment.paidDate = new Date();
    } else {
      targetPayment.status = ScheduledPaymentStatus.PARTIAL;
    }

    // Update in storage
    const paymentIndex = payments.findIndex((p) => p.id === targetPayment!.id);
    payments[paymentIndex] = targetPayment;
    trackedPayments.set(planId, payments);

    const summary = generatePaymentSummary(planId, config.totalAmount, payments, config.defaultThreshold);

    return res.json({
      success: true,
      transaction,
      payment: targetPayment,
      summary,
    });
  } catch (error) {
    console.error('Payment error:', error);
    return res.status(500).json({ error: 'Failed to process payment' });
  }
});

/**
 * Get late fee for a payment
 * GET /api/payments/:paymentId/late-fee
 */
router.get('/:paymentId/late-fee', (req: Request, res: Response) => {
  const { paymentId } = req.params;

  // Find payment across all plans
  let foundPayment: TrackedPayment | undefined;
  let foundConfig: { lateFeePercent: number } | undefined;

  for (const [planId, payments] of trackedPayments.entries()) {
    const payment = payments.find((p) => p.id === paymentId);
    if (payment) {
      foundPayment = payment;
      foundConfig = planConfigs.get(planId);
      break;
    }
  }

  if (!foundPayment || !foundConfig) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  const now = new Date();
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - foundPayment.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  const lateFee = calculateLateFee(foundPayment.amount, foundConfig.lateFeePercent, daysOverdue);

  return res.json({
    paymentId,
    originalAmount: foundPayment.amount,
    daysOverdue,
    lateFeePercent: foundConfig.lateFeePercent,
    lateFee,
    totalDue: foundPayment.amount - foundPayment.paidAmount + lateFee,
  });
});

/**
 * Get reminders needed
 * GET /api/payments/plans/:planId/reminders
 */
router.get('/plans/:planId/reminders', (req: Request, res: Response) => {
  const { planId } = req.params;

  const payments = trackedPayments.get(planId);
  if (!payments) {
    return res.status(404).json({ error: 'Plan payments not found' });
  }

  const remindersNeeded = payments
    .map((p) => {
      const reminder = shouldSendReminder(p);
      return reminder.send ? { payment: p, daysUntilDue: reminder.daysUntilDue } : null;
    })
    .filter(Boolean);

  return res.json({
    planId,
    reminders: remindersNeeded,
    count: remindersNeeded.length,
  });
});

/**
 * Waive a payment (creditor action)
 * POST /api/payments/:paymentId/waive
 */
router.post('/:paymentId/waive', (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const { reason, waivedBy } = req.body;

  // Find payment
  let foundPayment: TrackedPayment | undefined;
  let foundPlanId: string | undefined;

  for (const [planId, payments] of trackedPayments.entries()) {
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index !== -1) {
      foundPayment = payments[index];
      foundPlanId = planId;
      break;
    }
  }

  if (!foundPayment || !foundPlanId) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  foundPayment.status = ScheduledPaymentStatus.WAIVED;
  foundPayment.paidAmount = foundPayment.amount; // Mark as fully covered

  const payments = trackedPayments.get(foundPlanId)!;
  const index = payments.findIndex((p) => p.id === paymentId);
  payments[index] = foundPayment;
  trackedPayments.set(foundPlanId, payments);

  return res.json({
    success: true,
    payment: foundPayment,
    reason,
    waivedBy,
  });
});

/**
 * Get all transactions for a plan
 * GET /api/payments/plans/:planId/transactions
 */
router.get('/plans/:planId/transactions', (req: Request, res: Response) => {
  const { planId } = req.params;

  const planTransactions: PaymentTransaction[] = [];
  for (const txn of transactions.values()) {
    if (txn.planId === planId) {
      planTransactions.push(txn);
    }
  }

  return res.json({
    planId,
    transactions: planTransactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    ),
    count: planTransactions.length,
  });
});

export default router;
