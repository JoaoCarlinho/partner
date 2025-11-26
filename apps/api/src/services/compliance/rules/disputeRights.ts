import type { ValidationContext, ComplianceCheckResult } from '@steno/shared';

/**
 * Dispute Rights Check
 * 15 U.S.C. § 1692g(a)(3-5)
 *
 * Must inform debtor of:
 * (3) That unless the debtor disputes within 30 days, debt will be assumed valid
 * (4) That if disputed, verification will be obtained and mailed
 * (5) That upon written request within 30 days, name/address of original creditor
 *     will be provided (if different from current creditor)
 */

// 30-day window patterns
const THIRTY_DAY_PATTERNS = [
  /within\s+(?:the\s+)?(?:30|thirty)\s*(?:\((?:30|thirty)\))?\s*days?/i,
  /(?:30|thirty)\s*(?:\((?:30|thirty)\))?\s*[\-–]?\s*day/i,
];

// Assume valid patterns (§1692g(a)(3))
const ASSUME_VALID_PATTERNS = [
  /(?:assumed|presumed|considered)\s+(?:to\s+be\s+)?valid/i,
  /debt\s+(?:will\s+be\s+)?(?:assumed|presumed)\s+valid/i,
  /not\s+disputed.*(?:valid|owed)/i,
];

// Verification patterns (§1692g(a)(4))
const VERIFICATION_PATTERNS = [
  /(?:obtain|provide|mail|send)\s+(?:you\s+)?(?:a\s+)?(?:verification|validation)/i,
  /verification.*(?:mailed|sent|provided)/i,
  /(?:copy|proof)\s+of\s+(?:the\s+)?(?:debt|judgment)/i,
];

// Written request patterns (§1692g(a)(5))
const WRITTEN_REQUEST_PATTERNS = [
  /written\s+request/i,
  /request\s+in\s+writing/i,
  /write\s+(?:to\s+)?us/i,
];

/**
 * Check for complete dispute rights disclosure
 */
export function checkDisputeRights(
  content: string,
  _context: ValidationContext
): ComplianceCheckResult {
  const results = {
    thirtyDays: false,
    assumeValid: false,
    verification: false,
    writtenRequest: false,
  };

  // Check 30-day window
  for (const pattern of THIRTY_DAY_PATTERNS) {
    if (pattern.test(content)) {
      results.thirtyDays = true;
      break;
    }
  }

  // Check assumption of validity language
  for (const pattern of ASSUME_VALID_PATTERNS) {
    if (pattern.test(content)) {
      results.assumeValid = true;
      break;
    }
  }

  // Check verification provision
  for (const pattern of VERIFICATION_PATTERNS) {
    if (pattern.test(content)) {
      results.verification = true;
      break;
    }
  }

  // Check written request reference
  for (const pattern of WRITTEN_REQUEST_PATTERNS) {
    if (pattern.test(content)) {
      results.writtenRequest = true;
      break;
    }
  }

  // Core requirements: 30-day window and verification
  // Assume valid and written request enhance but aren't strictly required
  const coreRequirementsMet = results.thirtyDays && results.verification;
  const passed = coreRequirementsMet;

  const missing: string[] = [];
  if (!results.thirtyDays) missing.push('30-day dispute window');
  if (!results.verification) missing.push('verification provision');
  if (!results.assumeValid) missing.push('validity assumption statement');
  if (!results.writtenRequest) missing.push('written request instruction');

  let details: string;
  let suggestion: string | undefined;

  if (passed) {
    const extras = missing.length;
    if (extras === 0) {
      details = 'Complete dispute rights disclosure present';
    } else {
      details = `Core dispute rights present (consider adding: ${missing.join(', ')})`;
    }
  } else {
    details = `Dispute rights incomplete - missing: ${missing.slice(0, 2).join(', ')}`;
    suggestion = generateDisputeSuggestion(missing);
  }

  return {
    id: 'dispute_rights',
    section: '15 U.S.C. § 1692g(a)(3-5)',
    name: 'Dispute Rights Disclosure',
    passed,
    required: true,
    details,
    suggestion,
  };
}

function generateDisputeSuggestion(missing: string[]): string {
  const suggestions: string[] = [];

  if (missing.includes('30-day dispute window')) {
    suggestions.push(
      '"You have 30 days from receipt of this notice to dispute this debt."'
    );
  }

  if (missing.includes('verification provision')) {
    suggestions.push(
      '"If you dispute this debt in writing, we will provide verification."'
    );
  }

  if (missing.includes('validity assumption statement')) {
    suggestions.push(
      '"If not disputed within 30 days, the debt will be assumed valid."'
    );
  }

  return suggestions.length > 0 ? `Add: ${suggestions.join(' ')}` : '';
}
