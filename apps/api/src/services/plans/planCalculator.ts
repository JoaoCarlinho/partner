/**
 * Plan Calculator Service
 * Calculates payment plan details and schedules
 */

/**
 * Payment frequency types
 */
export enum Frequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

/**
 * Plan status types
 */
export enum PlanStatus {
  PROPOSED = 'PROPOSED',
  COUNTERED = 'COUNTERED',
  ACCEPTED = 'ACCEPTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
}

/**
 * Payment status types
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  MISSED = 'MISSED',
  PARTIAL = 'PARTIAL',
}

/**
 * Plan input parameters
 */
export interface PlanInput {
  totalAmount: number;
  downPayment: number;
  paymentAmount: number;
  frequency: Frequency;
  startDate: Date;
}

/**
 * Scheduled payment entry
 */
export interface ScheduledPayment {
  paymentNumber: number;
  dueDate: Date;
  amount: number;
  status: PaymentStatus;
}

/**
 * Plan calculation result
 */
export interface PlanCalculation {
  remainingBalance: number;
  numPayments: number;
  endDate: Date;
  schedule: ScheduledPayment[];
  totalWithDownPayment: number;
  durationMonths: number;
  durationWeeks: number;
}

/**
 * Add intervals to a date based on frequency
 */
export function addIntervals(date: Date, frequency: Frequency, count: number): Date {
  const result = new Date(date);
  switch (frequency) {
    case Frequency.WEEKLY:
      result.setDate(result.getDate() + 7 * count);
      break;
    case Frequency.BIWEEKLY:
      result.setDate(result.getDate() + 14 * count);
      break;
    case Frequency.MONTHLY:
      result.setMonth(result.getMonth() + count);
      break;
  }
  return result;
}

/**
 * Get days between two dates
 */
function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate plan details from input parameters
 */
export function calculatePlanDetails(input: PlanInput): PlanCalculation {
  const remainingBalance = input.totalAmount - input.downPayment;

  // Handle edge case of zero or negative remaining balance
  if (remainingBalance <= 0) {
    return {
      remainingBalance: 0,
      numPayments: 0,
      endDate: input.startDate,
      schedule: [],
      totalWithDownPayment: input.totalAmount,
      durationMonths: 0,
      durationWeeks: 0,
    };
  }

  // Calculate number of full payments
  const fullPayments = Math.floor(remainingBalance / input.paymentAmount);
  const finalPaymentAmount = remainingBalance % input.paymentAmount;

  // Total payments (including partial final payment if needed)
  const numPayments = finalPaymentAmount > 0 ? fullPayments + 1 : fullPayments;

  // Generate payment schedule
  const schedule = generatePaymentSchedule(
    input.startDate,
    input.frequency,
    input.paymentAmount,
    numPayments,
    remainingBalance
  );

  // Calculate end date (last payment date)
  const endDate =
    schedule.length > 0 ? schedule[schedule.length - 1].dueDate : input.startDate;

  // Calculate duration
  const totalDays = getDaysBetween(input.startDate, endDate);
  const durationWeeks = Math.ceil(totalDays / 7);
  const durationMonths = Math.ceil(totalDays / 30);

  return {
    remainingBalance,
    numPayments,
    endDate,
    schedule,
    totalWithDownPayment: input.totalAmount,
    durationMonths,
    durationWeeks,
  };
}

/**
 * Generate payment schedule with dates and amounts
 */
export function generatePaymentSchedule(
  startDate: Date,
  frequency: Frequency,
  paymentAmount: number,
  numPayments: number,
  totalRemaining: number
): ScheduledPayment[] {
  const schedule: ScheduledPayment[] = [];
  let remaining = totalRemaining;

  for (let i = 0; i < numPayments; i++) {
    const dueDate = addIntervals(startDate, frequency, i);

    // Calculate amount for this payment
    let amount: number;
    if (i === numPayments - 1 && remaining < paymentAmount) {
      // Final payment - may be partial
      amount = Math.round(remaining * 100) / 100;
    } else {
      amount = paymentAmount;
    }

    remaining -= amount;

    schedule.push({
      paymentNumber: i + 1,
      dueDate,
      amount,
      status: PaymentStatus.PENDING,
    });
  }

  return schedule;
}

/**
 * Normalize payment amount to monthly equivalent
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case Frequency.WEEKLY:
      return amount * 4.33; // Average weeks per month
    case Frequency.BIWEEKLY:
      return amount * 2.17;
    case Frequency.MONTHLY:
      return amount;
    default:
      return amount;
  }
}

/**
 * Get frequency interval in days
 */
export function getFrequencyDays(frequency: Frequency): number {
  switch (frequency) {
    case Frequency.WEEKLY:
      return 7;
    case Frequency.BIWEEKLY:
      return 14;
    case Frequency.MONTHLY:
      return 30; // Approximate
    default:
      return 30;
  }
}

/**
 * Calculate suggested payment amount for target duration
 */
export function suggestPaymentAmount(
  totalAmount: number,
  downPayment: number,
  frequency: Frequency,
  targetMonths: number
): number {
  const remaining = totalAmount - downPayment;
  const frequencyDays = getFrequencyDays(frequency);
  const totalDays = targetMonths * 30;
  const numPayments = Math.ceil(totalDays / frequencyDays);

  const suggestedAmount = remaining / numPayments;

  // Round to nearest dollar
  return Math.ceil(suggestedAmount);
}

/**
 * Validate plan parameters
 */
export function validatePlanInput(input: PlanInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.totalAmount <= 0) {
    errors.push('Total amount must be positive');
  }

  if (input.downPayment < 0) {
    errors.push('Down payment cannot be negative');
  }

  if (input.downPayment >= input.totalAmount) {
    errors.push('Down payment cannot exceed total amount');
  }

  if (input.paymentAmount <= 0) {
    errors.push('Payment amount must be positive');
  }

  const remaining = input.totalAmount - input.downPayment;
  if (input.paymentAmount > remaining) {
    errors.push('Payment amount cannot exceed remaining balance');
  }

  const numPayments = Math.ceil(remaining / input.paymentAmount);
  if (numPayments > 120) {
    // 10 years max
    errors.push('Plan duration exceeds maximum (10 years)');
  }

  if (input.startDate < new Date()) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (input.startDate < today) {
      errors.push('Start date cannot be in the past');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
