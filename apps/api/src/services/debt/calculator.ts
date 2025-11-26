/**
 * Debt Calculator Service
 * Handles debt amount calculations and itemization
 */

import type { DebtAmount, DebtCalculation, DebtItemization } from '@steno/shared';

/**
 * Calculate total debt and generate itemization
 */
export function calculateDebt(debtAmount: DebtAmount): DebtCalculation {
  const principal = debtAmount.principal;
  const interest = debtAmount.interest || 0;
  const fees = debtAmount.fees || 0;
  const total = principal + interest + fees;

  const itemization: DebtItemization[] = [
    { description: 'Principal Balance', amount: principal },
  ];

  if (interest > 0) {
    itemization.push({ description: 'Accrued Interest', amount: interest });
  }

  if (fees > 0) {
    itemization.push({ description: 'Fees and Charges', amount: fees });
  }

  itemization.push({ description: 'Total Amount Due', amount: total });

  return {
    principal,
    interest,
    fees,
    total,
    itemization,
  };
}

/**
 * Calculate interest accrual
 * @param principal - Principal amount
 * @param annualRate - Annual interest rate (decimal, e.g., 0.18 for 18%)
 * @param days - Number of days to accrue
 * @returns Accrued interest amount
 */
export function calculateInterestAccrual(
  principal: number,
  annualRate: number,
  days: number
): number {
  if (annualRate <= 0 || days <= 0) {
    return 0;
  }

  // Simple interest calculation: P * r * t
  const dailyRate = annualRate / 365;
  const interest = principal * dailyRate * days;

  return Math.round(interest * 100) / 100; // Round to cents
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/**
 * Format amount for letter insertion
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Generate itemization text for letter
 */
export function formatItemizationForLetter(calculation: DebtCalculation): string {
  const lines = calculation.itemization.map((item) => {
    if (item.description === 'Total Amount Due') {
      return `\n${item.description}: ${formatAmount(item.amount)}`;
    }
    return `${item.description}: ${formatAmount(item.amount)}`;
  });

  return lines.join('\n');
}

/**
 * Validate debt amounts
 */
export function validateDebtAmounts(debtAmount: DebtAmount): string[] {
  const errors: string[] = [];

  if (debtAmount.principal <= 0) {
    errors.push('Principal amount must be greater than zero');
  }

  if (debtAmount.principal > 10000000) {
    errors.push('Principal amount exceeds maximum allowed value');
  }

  if (debtAmount.interest !== undefined && debtAmount.interest < 0) {
    errors.push('Interest cannot be negative');
  }

  if (debtAmount.fees !== undefined && debtAmount.fees < 0) {
    errors.push('Fees cannot be negative');
  }

  return errors;
}

/**
 * Round amount to cents
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
