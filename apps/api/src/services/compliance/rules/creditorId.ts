import type { ValidationContext, ComplianceCheckResult } from '@steno/shared';

/**
 * Creditor Identification Check
 * 15 U.S.C. § 1692g(a)(2)
 *
 * Must identify the name of the creditor to whom the debt is owed
 */

/**
 * Check for creditor identification in content
 */
export function checkCreditorId(
  content: string,
  context: ValidationContext
): ComplianceCheckResult {
  const { creditorName, originalCreditor } = context.debtDetails;

  // Check if creditor name is mentioned
  const creditorMentioned = creditorName
    ? content.toLowerCase().includes(creditorName.toLowerCase())
    : false;

  // Check for creditor-related language
  const hasCreditorLanguage =
    /(?:creditor|owed\s+to|debt\s+(?:is\s+)?(?:owed\s+)?to|behalf\s+of)/i.test(
      content
    );

  // Check if original creditor is mentioned (if different)
  let originalCreditorMentioned = true; // Default to true if not needed
  if (originalCreditor && originalCreditor !== creditorName) {
    originalCreditorMentioned = content
      .toLowerCase()
      .includes(originalCreditor.toLowerCase());
  }

  // Pass if creditor name is mentioned and appropriate language exists
  const passed = creditorMentioned && hasCreditorLanguage;

  let details: string;
  let suggestion: string | undefined;
  let matchedText: string | undefined;

  if (passed) {
    details = `Creditor "${creditorName}" identified in letter`;
    matchedText = creditorName;
  } else if (!creditorMentioned) {
    details = 'Creditor name not found in letter content';
    suggestion = `Ensure the creditor name "${creditorName}" appears in the letter`;
  } else {
    details = 'Creditor name present but context unclear';
    suggestion =
      'Add clear language like "debt owed to [creditor name]" or "on behalf of [creditor name]"';
  }

  // Add warning about original creditor if applicable
  if (originalCreditor && originalCreditor !== creditorName) {
    if (!originalCreditorMentioned) {
      if (passed) {
        details += `. Note: Original creditor "${originalCreditor}" not mentioned (may be required upon request)`;
      }
    }
  }

  return {
    id: 'creditor_identification',
    section: '15 U.S.C. § 1692g(a)(2)',
    name: 'Creditor Identification',
    passed,
    required: true,
    details,
    suggestion,
    matchedText,
  };
}
