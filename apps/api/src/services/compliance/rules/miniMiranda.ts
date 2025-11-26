import type { ValidationContext, ComplianceCheckResult } from '@steno/shared';

/**
 * Mini-Miranda Warning Check
 * FDCPA Section 15 U.S.C. § 1692e(11)
 *
 * Required language (or substantial equivalent):
 * "This is an attempt to collect a debt and any information obtained will be used for that purpose."
 */

const MINI_MIRANDA_PATTERNS = [
  // Full standard Mini-Miranda
  /this\s+is\s+an?\s+attempt\s+to\s+collect\s+a\s+debt/i,
  // Communication from debt collector variant
  /this\s+communication\s+is\s+from\s+a\s+debt\s+collector/i,
  // We are debt collectors variant
  /we\s+are\s+(?:a\s+)?debt\s+collector(?:s)?/i,
  // Acting as debt collector
  /acting\s+as\s+(?:a\s+)?debt\s+collector/i,
];

const INFORMATION_PURPOSE_PATTERNS = [
  /any\s+information\s+(?:obtained|received|provided)\s+will\s+be\s+used\s+for\s+that\s+purpose/i,
  /information\s+(?:obtained|collected)\s+(?:will\s+be|may\s+be)\s+used\s+(?:for|in)\s+(?:that\s+purpose|debt\s+collection)/i,
];

/**
 * Check for Mini-Miranda warning presence
 */
export function checkMiniMiranda(
  content: string,
  _context: ValidationContext
): ComplianceCheckResult {
  // Check for debt collector identification
  let collectorMatch: string | null = null;
  for (const pattern of MINI_MIRANDA_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      collectorMatch = match[0];
      break;
    }
  }

  // Check for purpose statement
  let purposeMatch: string | null = null;
  for (const pattern of INFORMATION_PURPOSE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      purposeMatch = match[0];
      break;
    }
  }

  // Both parts needed for full compliance
  const hasDebtCollectorId = collectorMatch !== null;
  const hasPurposeStatement = purposeMatch !== null;
  const passed = hasDebtCollectorId && hasPurposeStatement;

  let details: string;
  let suggestion: string | undefined;
  let matchedText: string | undefined;

  if (passed) {
    details = 'Mini-Miranda warning present';
    matchedText = collectorMatch!;
  } else if (hasDebtCollectorId && !hasPurposeStatement) {
    details = 'Debt collector identification found, but purpose statement missing';
    suggestion =
      'Add: "any information obtained will be used for that purpose"';
  } else if (!hasDebtCollectorId && hasPurposeStatement) {
    details = 'Purpose statement found, but debt collector identification missing';
    suggestion =
      'Add: "This is an attempt to collect a debt" or similar language';
  } else {
    details = 'Mini-Miranda warning not detected';
    suggestion =
      'Add: "This is an attempt to collect a debt and any information obtained will be used for that purpose."';
  }

  return {
    id: 'mini_miranda',
    section: '15 U.S.C. § 1692e(11)',
    name: 'Mini-Miranda Warning',
    passed,
    required: true,
    details,
    suggestion,
    matchedText,
  };
}
