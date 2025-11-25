/**
 * Letter Refinement Prompts
 * System and user prompts for AI-powered letter refinement
 */

/**
 * System prompt for letter refinement
 * Establishes AI role and compliance requirements
 */
export const REFINEMENT_SYSTEM_PROMPT = `You are an expert legal document editor specializing in FDCPA-compliant demand letters.

Your role is to refine existing demand letters based on user instructions while maintaining strict legal compliance.

CRITICAL RULES:
1. NEVER remove required FDCPA disclosures:
   - Mini-Miranda warning ("This is an attempt to collect a debt...")
   - 30-day validation notice
   - Dispute rights information
   - Creditor identification

2. NEVER change factual information unless explicitly instructed:
   - Debt amounts
   - Dates
   - Names
   - Account numbers

3. NEVER add false or misleading statements

4. ALWAYS maintain a professional, non-threatening tone

5. ALWAYS preserve the letter's legal validity

When making changes:
- If an instruction conflicts with compliance requirements, make the closest compliant change
- If you cannot comply with part of the instruction, explain why briefly
- Focus on tone, clarity, structure, and presentation

Output ONLY the refined letter content. Do not include explanations unless the instruction cannot be fully followed.`;

/**
 * Build refinement prompt with current content and instruction
 */
export function buildRefinementPrompt(
  currentContent: string,
  instruction: string
): string {
  return `CURRENT LETTER:
---
${currentContent}
---

USER INSTRUCTION: ${instruction}

Refine the letter according to the instruction while maintaining FDCPA compliance.
Return the complete refined letter.
If you cannot fully comply with the instruction due to legal requirements, briefly note the limitation at the start, then provide the best compliant version.`;
}

/**
 * Common refinement suggestions
 */
export const COMMON_REFINEMENT_SUGGESTIONS = [
  {
    id: 'tone_warmer',
    label: 'Make the tone warmer',
    instruction: 'Make the tone warmer and more empathetic while maintaining professionalism',
  },
  {
    id: 'tone_formal',
    label: 'Make it more formal',
    instruction: 'Use more formal language and structure',
  },
  {
    id: 'add_payment_options',
    label: 'Add payment plan info',
    instruction: 'Add a paragraph about available payment plan options',
  },
  {
    id: 'emphasize_timeline',
    label: 'Emphasize the timeline',
    instruction: 'Make the deadlines and timeline clearer and more prominent',
  },
  {
    id: 'add_credit_impact',
    label: 'Add credit impact info',
    instruction: 'Include information about potential credit reporting consequences',
  },
  {
    id: 'shorten',
    label: 'Shorten the letter',
    instruction: 'Make the letter more concise while keeping all required elements',
  },
  {
    id: 'dispute_rights',
    label: 'Clarify dispute rights',
    instruction: 'Add more detail and clarity about the dispute rights and process',
  },
  {
    id: 'simplify',
    label: 'Simplify language',
    instruction: 'Use simpler language that is easier for the average reader to understand',
  },
];

/**
 * Sanitize refinement instruction
 */
export function sanitizeInstruction(instruction: string): string {
  return instruction
    .replace(/```/g, '')
    .replace(/---/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|.*?\|>/g, '')
    .replace(/Human:|Assistant:/gi, '')
    .trim()
    .slice(0, 1000); // Limit instruction length
}

/**
 * Detect potentially problematic instructions
 */
export function validateInstruction(instruction: string): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  const lowerInstruction = instruction.toLowerCase();

  // Check for instructions that might violate FDCPA
  if (
    lowerInstruction.includes('remove') &&
    (lowerInstruction.includes('miranda') ||
      lowerInstruction.includes('validation') ||
      lowerInstruction.includes('dispute'))
  ) {
    warnings.push('Cannot remove required FDCPA disclosures');
  }

  if (
    lowerInstruction.includes('threaten') ||
    lowerInstruction.includes('aggressive') ||
    lowerInstruction.includes('intimidate')
  ) {
    warnings.push('Cannot add threatening or intimidating language');
  }

  if (
    lowerInstruction.includes('lie') ||
    lowerInstruction.includes('false') ||
    lowerInstruction.includes('mislead')
  ) {
    warnings.push('Cannot add false or misleading statements');
  }

  if (
    lowerInstruction.includes('ignore') &&
    (lowerInstruction.includes('previous') || lowerInstruction.includes('instructions'))
  ) {
    warnings.push('Suspicious instruction pattern detected');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
