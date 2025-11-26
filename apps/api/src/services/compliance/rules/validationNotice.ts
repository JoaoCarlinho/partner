import type { ValidationContext, ComplianceCheckResult } from '@steno/shared';

/**
 * Validation Notice Check
 * 12 CFR § 1006.34 (Regulation F)
 *
 * Must include debt validation information:
 * - Statement of debt amount
 * - Name of creditor
 * - Statement that debtor can dispute within 30 days
 * - Statement that verification will be provided upon dispute
 * - Statement that original creditor info will be provided on request
 */

const THIRTY_DAY_PATTERNS = [
  /within\s+(?:the\s+)?(?:30|thirty)\s*(?:\((?:30|thirty)\))?\s*days?/i,
  /(?:30|thirty)\s*(?:\((?:30|thirty)\))?\s*[\-–]?\s*day\s+(?:period|window|time(?:frame)?)/i,
  /(?:30|thirty)\s*(?:\((?:30|thirty)\))?\s*days?\s+(?:from|after|of)/i,
  /(?:30|thirty)\s*(?:\((?:30|thirty)\))?\s*day\s+period/i,
];

const DISPUTE_PATTERNS = [
  /dispute\s+(?:the\s+)?(?:debt|validity|accuracy)/i,
  /right\s+to\s+(?:dispute|contest|challenge)/i,
  /may\s+(?:dispute|contest)\s+(?:the\s+)?debt/i,
];

const VERIFICATION_PATTERNS = [
  /verification\s+of\s+(?:the\s+)?debt/i,
  /request\s+(?:verification|validation)/i,
  /provide\s+(?:verification|validation|proof)/i,
  /obtain\s+verification/i,
];

const ORIGINAL_CREDITOR_PATTERNS = [
  /name\s+(?:and\s+address\s+)?of\s+(?:the\s+)?original\s+creditor/i,
  /original\s+creditor(?:'s)?\s+(?:name|information|identity)/i,
  /(?:provide|disclose)\s+(?:the\s+)?original\s+creditor/i,
];

/**
 * Check for validation notice presence
 */
export function checkValidationNotice(
  content: string,
  _context: ValidationContext
): ComplianceCheckResult {
  const results = {
    thirtyDay: false,
    dispute: false,
    verification: false,
    originalCreditor: false,
  };

  // Check 30-day window mention
  for (const pattern of THIRTY_DAY_PATTERNS) {
    if (pattern.test(content)) {
      results.thirtyDay = true;
      break;
    }
  }

  // Check dispute rights
  for (const pattern of DISPUTE_PATTERNS) {
    if (pattern.test(content)) {
      results.dispute = true;
      break;
    }
  }

  // Check verification statement
  for (const pattern of VERIFICATION_PATTERNS) {
    if (pattern.test(content)) {
      results.verification = true;
      break;
    }
  }

  // Check original creditor reference
  for (const pattern of ORIGINAL_CREDITOR_PATTERNS) {
    if (pattern.test(content)) {
      results.originalCreditor = true;
      break;
    }
  }

  // Need at least 3 of 4 components for pass (original creditor is conditional)
  const componentsPassed = Object.values(results).filter(Boolean).length;
  const coreComponentsPassed =
    results.thirtyDay && results.dispute && results.verification;
  const passed = coreComponentsPassed;

  const missing: string[] = [];
  if (!results.thirtyDay) missing.push('30-day dispute window');
  if (!results.dispute) missing.push('dispute rights');
  if (!results.verification) missing.push('verification rights');
  if (!results.originalCreditor) missing.push('original creditor disclosure');

  let details: string;
  let suggestion: string | undefined;

  if (passed) {
    details =
      missing.length === 0
        ? 'Complete validation notice present'
        : `Validation notice present (${missing.join(', ')} optional/conditional)`;
  } else {
    details = `Validation notice incomplete - missing: ${missing.slice(0, 3).join(', ')}`;
    suggestion = generateSuggestion(missing);
  }

  return {
    id: 'validation_notice',
    section: '12 CFR § 1006.34',
    name: 'Validation Notice',
    passed,
    required: true,
    details,
    suggestion,
  };
}

function generateSuggestion(missing: string[]): string {
  const suggestions: string[] = [];

  if (missing.includes('30-day dispute window')) {
    suggestions.push(
      'Add: "Within 30 days of receiving this notice, you may dispute this debt."'
    );
  }

  if (missing.includes('dispute rights')) {
    suggestions.push(
      'Add language explaining the right to dispute the debt validity.'
    );
  }

  if (missing.includes('verification rights')) {
    suggestions.push(
      'Add: "If you dispute this debt, we will provide verification."'
    );
  }

  return suggestions.join(' ');
}
