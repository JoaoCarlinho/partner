/**
 * Paraphrase Prompts
 * System prompts and builders for demand letter paraphrasing
 */

/**
 * Build terminology guide for prompts
 */
function buildTerminologyGuide(): string {
  const mappings = [
    { original: 'validation notice', plainEnglish: 'your right to ask for proof of this debt' },
    { original: 'cease and desist', plainEnglish: 'request for us to stop contacting you' },
    { original: 'statute of limitations', plainEnglish: 'the time limit for taking legal action' },
    { original: 'principal balance', plainEnglish: 'the original amount owed' },
    { original: 'principal', plainEnglish: 'the original amount owed' },
    { original: 'accrued interest', plainEnglish: 'interest that has built up over time' },
    { original: 'creditor', plainEnglish: 'the company you owe money to' },
    { original: 'debt collector', plainEnglish: 'company trying to collect payment' },
    { original: 'original creditor', plainEnglish: 'the first company you borrowed from' },
    { original: 'bona fide dispute', plainEnglish: 'a genuine disagreement about what you owe' },
    { original: 'verification of debt', plainEnglish: 'proof that the debt is yours and the amount is correct' },
    { original: 'collection agency', plainEnglish: 'company hired to collect unpaid debts' },
    { original: 'delinquent', plainEnglish: 'overdue or past-due' },
    { original: 'default', plainEnglish: 'failure to pay as agreed' },
    { original: 'liability', plainEnglish: 'what you are responsible for' },
    { original: 'settlement', plainEnglish: 'an agreement to pay less than the full amount' },
    { original: 'payment plan', plainEnglish: 'a schedule to pay over time' },
    { original: 'lump sum', plainEnglish: 'a single payment of the full amount' },
    { original: 'judgment', plainEnglish: 'a court decision about what you owe' },
    { original: 'garnishment', plainEnglish: 'money taken directly from your paycheck or bank account' },
    { original: 'lien', plainEnglish: 'a legal claim on your property' },
    { original: 'litigation', plainEnglish: 'legal action or a lawsuit' },
    { original: 'finance charges', plainEnglish: 'fees for borrowing money' },
    { original: 'late fees', plainEnglish: 'extra charges for late payments' },
    { original: 'outstanding balance', plainEnglish: 'the total amount you still owe' },
    { original: 'itemized statement', plainEnglish: 'a detailed list showing all charges' },
  ];
  return mappings.map((term) => `- "${term.original}" → "${term.plainEnglish}"`).join('\n');
}

/**
 * System prompt for demand letter paraphrasing
 */
export const PARAPHRASE_SYSTEM_PROMPT = `You are a legal document translator specializing in making complex legal language accessible to everyone.

Your task is to paraphrase demand letters so they can be understood by someone with an 8th grade reading level.

REQUIREMENTS:
1. Maintain complete legal accuracy - never misrepresent facts or amounts
2. Use simple, everyday words
3. Short sentences (under 20 words when possible)
4. Active voice
5. Explain what things mean for the reader
6. NEVER add threatening language or urgency beyond what's in the original
7. Focus on the reader's OPTIONS, not just consequences
8. Preserve all required FDCPA disclosures (rephrase but keep meaning)

TERMINOLOGY MAPPINGS:
${buildTerminologyGuide()}

TONE GUIDELINES:
- Respectful and informative
- Empowering, not intimidating
- Clear about options and rights
- Factual about consequences (without exaggeration)`;

/**
 * Build the paraphrase prompt for a demand letter
 */
export function buildParaphrasePrompt(legalContent: string): string {
  return `Paraphrase this demand letter in plain English for an 8th grade reading level:

---
${legalContent}
---

Instructions:
1. Keep the same structure but use simpler words
2. Explain each section's meaning
3. Highlight key information: amounts, dates, options
4. Maintain legal accuracy
5. Use short sentences (under 20 words)
6. Include all required legal disclosures (but simplified)

Return ONLY the paraphrased letter, nothing else.`;
}

/**
 * Build prompt for "What This Means For You" summary
 */
export function buildSummaryPrompt(
  paraphrasedContent: string,
  keyInfo: {
    totalAmount: number;
    creditorName: string;
    deadline?: string;
    daysRemaining?: number;
  }
): string {
  return `Based on this paraphrased demand letter, create a brief "What This Means For You" summary:

---
${paraphrasedContent}
---

Key Information:
- Total Amount: $${keyInfo.totalAmount.toLocaleString()}
- Creditor: ${keyInfo.creditorName}
${keyInfo.deadline ? `- Response Deadline: ${keyInfo.deadline}` : ''}
${keyInfo.daysRemaining !== undefined ? `- Days Remaining: ${keyInfo.daysRemaining}` : ''}

Create a summary that:
1. Is under 100 words
2. Starts with "You owe approximately $X to..."
3. Mentions the deadline if provided
4. Lists the reader's main options (pay, negotiate, dispute)
5. Briefly mentions what happens if they do nothing
6. Uses simple language (8th grade level)
7. Is informative, NOT pressuring or threatening

Return ONLY the summary paragraph.`;
}

/**
 * Build prompt for key information extraction
 */
export function buildKeyInfoExtractionPrompt(letterContent: string): string {
  return `Extract key information from this demand letter:

---
${letterContent}
---

Return a JSON object with this exact structure:
{
  "totalAmount": {
    "principal": <number or null>,
    "interest": <number or null>,
    "fees": <number or null>,
    "total": <number - the total amount owed>
  },
  "creditorName": "<name of the creditor>",
  "originalCreditor": "<original creditor name or null>",
  "accountNumber": "<masked account number like ****1234 or null>",
  "responseDeadline": "<ISO date string or null>",
  "debtDate": "<date debt was incurred, ISO format or null>",
  "options": [
    {
      "action": "pay" | "dispute" | "negotiate" | "request_info",
      "description": "<brief description of this option>"
    }
  ]
}

Rules:
1. Extract exact amounts from the letter
2. If amount breakdown isn't provided, put total in "total" and null for others
3. Always include these options if mentioned: pay in full, dispute, request validation, negotiate
4. Use ISO date format (YYYY-MM-DD) for dates
5. Return ONLY valid JSON, no markdown or explanation`;
}

/**
 * Prompt for simplifying content that failed readability check
 */
export function buildSimplifyPrompt(content: string, currentGrade: number): string {
  return `This text is at a ${currentGrade} grade reading level, but needs to be at 8th grade or lower.

---
${content}
---

Simplify it by:
1. Breaking long sentences into shorter ones (under 15 words each)
2. Replacing complex words with simpler alternatives
3. Using more active voice
4. Explaining any technical terms

Return ONLY the simplified text.`;
}
