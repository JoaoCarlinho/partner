import type { ValidationContext, ComplianceCheckResult } from '@steno/shared';

/**
 * Debt Amount Check
 * 15 U.S.C. § 1692g(a)(1)
 *
 * Must state the amount of the debt
 */

// Pattern for currency amounts
const CURRENCY_PATTERN = /\$[\d,]+(?:\.\d{2})?/g;

// Patterns for amount context
const AMOUNT_CONTEXT_PATTERNS = [
  /(?:amount|balance|total|sum)\s+(?:owed|due|of)\s*:?\s*\$?[\d,]+(?:\.\d{2})?/i,
  /you\s+owe\s*\$?[\d,]+(?:\.\d{2})?/i,
  /debt\s+(?:amount|balance|total)\s*:?\s*\$?[\d,]+(?:\.\d{2})?/i,
  /\$[\d,]+(?:\.\d{2})?\s+(?:is\s+)?(?:owed|due)/i,
  /(?:principal|interest|fees?)\s*:?\s*\$?[\d,]+(?:\.\d{2})?/i,
];

/**
 * Check for debt amount statement
 */
export function checkDebtAmount(
  content: string,
  context: ValidationContext
): ComplianceCheckResult {
  const { principal, interest, fees } = context.debtDetails;
  const totalExpected = principal + (interest || 0) + (fees || 0);

  // Find all currency amounts in content
  const currencyMatches = content.match(CURRENCY_PATTERN) || [];

  // Check for amount context patterns
  let hasAmountContext = false;
  for (const pattern of AMOUNT_CONTEXT_PATTERNS) {
    if (pattern.test(content)) {
      hasAmountContext = true;
      break;
    }
  }

  // Check if expected total appears in content
  const expectedFormatted = formatCurrency(totalExpected);
  const principalFormatted = formatCurrency(principal);

  const hasTotalAmount = currencyMatches.some(
    (match) =>
      parseCurrency(match) === totalExpected ||
      parseCurrency(match) === principal
  );

  // Check for itemization (principal, interest, fees breakdown)
  const hasItemization = checkItemization(content, context);

  // Pass if amount is stated with proper context
  const passed = currencyMatches.length > 0 && (hasAmountContext || hasTotalAmount);

  let details: string;
  let suggestion: string | undefined;
  let matchedText: string | undefined;

  if (passed && hasTotalAmount) {
    details = `Debt amount stated (${expectedFormatted})`;
    matchedText = currencyMatches.find(
      (m) => parseCurrency(m) === totalExpected || parseCurrency(m) === principal
    );
    if (!hasItemization && (interest || fees)) {
      details += ' - Consider adding itemized breakdown';
    }
  } else if (passed) {
    details = 'Debt amount stated';
    matchedText = currencyMatches[0];
    if (totalExpected > 0) {
      suggestion = `Verify the stated amount matches the debt total of ${expectedFormatted}`;
    }
  } else if (currencyMatches.length > 0) {
    details = 'Currency amounts found but context unclear';
    suggestion = `Add clear language such as "the amount owed is ${expectedFormatted}" or "total balance due: ${expectedFormatted}"`;
  } else {
    details = 'No debt amount found in letter';
    suggestion = `Add the debt amount: ${expectedFormatted}`;
  }

  return {
    id: 'debt_amount',
    section: '15 U.S.C. § 1692g(a)(1)',
    name: 'Debt Amount Statement',
    passed,
    required: true,
    details,
    suggestion,
    matchedText,
  };
}

/**
 * Check if content includes itemized breakdown
 */
function checkItemization(
  content: string,
  context: ValidationContext
): boolean {
  const { principal, interest, fees } = context.debtDetails;

  const hasPrincipal = /principal/i.test(content);
  const hasInterest = interest ? /interest/i.test(content) : true;
  const hasFees = fees ? /fees?/i.test(content) : true;

  return hasPrincipal && hasInterest && hasFees;
}

/**
 * Format number as currency string
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parse currency string to number
 */
function parseCurrency(str: string): number {
  return parseFloat(str.replace(/[$,]/g, ''));
}
