/**
 * Letter Generation Prompts
 * System and user prompts for AI-powered demand letter generation
 */

import type { CaseDetails, DebtCalculation } from '@steno/shared';

/**
 * System prompt for demand letter generation
 * Establishes AI role, constraints, and requirements
 */
export const LETTER_GENERATION_SYSTEM_PROMPT = `You are a professional legal document writer specializing in FDCPA-compliant demand letters.

Your task is to generate demand letters that are:
1. Legally compliant with FDCPA requirements (15 U.S.C. § 1692 et seq.)
2. Firm but respectful in tone - never threatening, harassing, or abusive
3. Clear and easy to understand by the average consumer
4. Professional in formatting and language

You MUST include these required elements:
- Mini-Miranda warning ("This is an attempt to collect a debt...")
- Validation notice with 30-day dispute window
- Accurate debt amount itemization
- Creditor identification
- Clear dispute instructions

PROHIBITED language:
- Threats of violence or criminal prosecution
- False or misleading statements
- Harassment or abuse
- Unfair practices
- Language implying the debtor committed a crime

The letter should:
- Offer the debtor a clear path to resolution
- Maintain the creditor's legitimate position
- Be written at an 8th-grade reading level
- Use short paragraphs and clear structure

Output ONLY the letter content, ready for use. Do not include explanations or commentary.`;

/**
 * Build user prompt with case details and template
 */
export function buildUserPrompt(
  caseDetails: CaseDetails,
  templateContent: string,
  debtCalculation: DebtCalculation
): string {
  const formattedDate = formatDate(caseDetails.debtOriginDate);

  return `Generate a demand letter using the following template structure and case details.

TEMPLATE STRUCTURE:
${templateContent}

CASE DETAILS:
- Debtor Name: ${caseDetails.debtorName}
- Creditor Name: ${caseDetails.creditorName}
- Original Creditor: ${caseDetails.originalCreditor || 'Same as current creditor'}
- Account Number: ${caseDetails.accountNumber || 'N/A'}
- State Jurisdiction: ${caseDetails.stateJurisdiction}

DEBT BREAKDOWN:
- Principal Amount: ${formatCurrency(debtCalculation.principal)}
- Interest: ${formatCurrency(debtCalculation.interest)}
- Fees: ${formatCurrency(debtCalculation.fees)}
- Total Amount Owed: ${formatCurrency(debtCalculation.total)}

DEBT DETAILS:
- Origin Date: ${formattedDate}
${caseDetails.additionalContext ? `- Additional Context: ${caseDetails.additionalContext}` : ''}

INSTRUCTIONS:
1. Follow the template structure but customize for this case
2. Fill in all placeholder variables with the provided details
3. Ensure all FDCPA required elements are present
4. Use a firm but respectful professional tone
5. Include the complete itemized debt breakdown
6. Add the 30-day validation notice
7. Include clear dispute instructions

Return the complete letter text, properly formatted and ready for use.`;
}

/**
 * Build a simple prompt when no template is provided
 */
export function buildDefaultPrompt(
  caseDetails: CaseDetails,
  debtCalculation: DebtCalculation
): string {
  const formattedDate = formatDate(caseDetails.debtOriginDate);

  return `Generate a professional FDCPA-compliant demand letter for the following case:

CASE DETAILS:
- Debtor Name: ${caseDetails.debtorName}
- Creditor Name: ${caseDetails.creditorName}
- Original Creditor: ${caseDetails.originalCreditor || 'Same as current creditor'}
- Account Number: ${caseDetails.accountNumber || 'N/A'}
- State Jurisdiction: ${caseDetails.stateJurisdiction}

DEBT BREAKDOWN:
- Principal Amount: ${formatCurrency(debtCalculation.principal)}
- Interest: ${formatCurrency(debtCalculation.interest)}
- Fees: ${formatCurrency(debtCalculation.fees)}
- Total Amount Owed: ${formatCurrency(debtCalculation.total)}

DEBT DETAILS:
- Origin Date: ${formattedDate}
${caseDetails.additionalContext ? `- Additional Context: ${caseDetails.additionalContext}` : ''}

Generate a standard demand letter that includes:
1. Professional letterhead placeholder
2. Current date
3. Debtor address section
4. Mini-Miranda warning
5. Clear statement of the debt
6. Itemized breakdown of amounts owed
7. 30-day validation notice
8. Dispute instructions
9. Payment instructions
10. Professional closing

Return the complete letter text, properly formatted and ready for use.`;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeInput(input: string): string {
  // Remove potential prompt injection patterns
  return input
    .replace(/```/g, '')
    .replace(/---/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|.*?\|>/g, '')
    .replace(/Human:|Assistant:/gi, '')
    .trim();
}

/**
 * Validate case details for safety
 */
export function validateCaseDetailsForAI(caseDetails: CaseDetails): string[] {
  const warnings: string[] = [];

  // Check for suspicious patterns in user-provided text
  if (caseDetails.additionalContext) {
    const context = caseDetails.additionalContext.toLowerCase();

    if (context.includes('ignore previous') || context.includes('disregard')) {
      warnings.push('Suspicious instruction pattern detected in additional context');
    }

    if (context.length > 2000) {
      warnings.push('Additional context exceeds recommended length');
    }
  }

  // Check debtor name for unusual characters
  if (/[<>{}[\]\\|]/.test(caseDetails.debtorName)) {
    warnings.push('Debtor name contains unusual characters');
  }

  return warnings;
}
