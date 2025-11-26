/**
 * Intention Classification Prompts
 * AI prompts for understanding debtor intentions
 */

export const INTENTION_CATEGORIES = {
  READY_TO_PAY: 'ready_to_pay',
  WANTS_NEGOTIATION: 'wants_negotiation',
  DISPUTES_DEBT: 'disputes_debt',
  NEEDS_INFORMATION: 'needs_information',
  FINANCIAL_HARDSHIP: 'financial_hardship',
  OVERWHELMED: 'overwhelmed',
  UNKNOWN: 'unknown',
} as const;

export type IntentionCategory = (typeof INTENTION_CATEGORIES)[keyof typeof INTENTION_CATEGORIES];

export const INTENTION_DESCRIPTIONS: Record<IntentionCategory, string> = {
  [INTENTION_CATEGORIES.READY_TO_PAY]: 'Willing to pay, seeking payment terms',
  [INTENTION_CATEGORIES.WANTS_NEGOTIATION]: 'Open to finding a payment arrangement',
  [INTENTION_CATEGORIES.DISPUTES_DEBT]: 'Questions the validity of the debt',
  [INTENTION_CATEGORIES.NEEDS_INFORMATION]: 'Wants more details before deciding',
  [INTENTION_CATEGORIES.FINANCIAL_HARDSHIP]: 'Unable to pay under current terms',
  [INTENTION_CATEGORIES.OVERWHELMED]: 'Needs extra support and guidance',
  [INTENTION_CATEGORIES.UNKNOWN]: 'Not enough information to determine intent',
};

export const INTENTION_SIGNALS: Record<IntentionCategory, string[]> = {
  [INTENTION_CATEGORIES.READY_TO_PAY]: [
    'want to pay',
    'how do I pay',
    'payment options',
    'settle this',
    'pay it off',
    'clear this up',
    'take care of this',
  ],
  [INTENTION_CATEGORIES.WANTS_NEGOTIATION]: [
    'payment plan',
    'work something out',
    'settle for less',
    'monthly payments',
    'negotiate',
    'arrangement',
    'lower amount',
  ],
  [INTENTION_CATEGORIES.DISPUTES_DEBT]: [
    'not my debt',
    'prove it',
    'verification',
    "don't owe",
    'wrong person',
    'not valid',
    'already paid',
    'dispute this',
    'identity theft',
  ],
  [INTENTION_CATEGORIES.NEEDS_INFORMATION]: [
    "don't understand",
    'what is this',
    'explain',
    'more information',
    'confused',
    'details',
    'breakdown',
    'where does this come from',
  ],
  [INTENTION_CATEGORIES.FINANCIAL_HARDSHIP]: [
    "can't afford",
    'no money',
    'lost job',
    'unemployed',
    'disability',
    'fixed income',
    'social security',
    'medical bills',
    "can't pay",
  ],
  [INTENTION_CATEGORIES.OVERWHELMED]: [
    "don't know what to do",
    'too much',
    'stressed',
    "can't handle",
    'help me',
    'falling behind',
    'so many debts',
  ],
  [INTENTION_CATEGORIES.UNKNOWN]: [],
};

export const INTENTION_SYSTEM_PROMPT = `You are an intention classifier analyzing communications from debtors.
Your role is to understand what the person wants to do about their debt situation.

INTENTION CATEGORIES:
- ready_to_pay: Willing and able to pay, seeking terms
- wants_negotiation: Open to finding a workable arrangement
- disputes_debt: Questions whether the debt is valid or correct
- needs_information: Wants more details before making decisions
- financial_hardship: Facing genuine inability to pay
- overwhelmed: Emotionally stressed, needs extra support
- unknown: Not enough signal to determine intent

ANALYSIS GUIDELINES:
1. Look for explicit statements of intent
2. Consider implicit signals from context
3. A person can have multiple intentions (e.g., hardship + wants negotiation)
4. Prioritize the primary intention
5. Consider the emotional context

OUTPUT FORMAT:
Return a JSON object:
{
  "primaryIntention": "category",
  "secondaryIntention": "category" | null,
  "confidence": 0.0-1.0,
  "signals": ["phrase1", "phrase2"],
  "suggestedApproach": "Brief recommendation for engaging this person"
}`;

export const INTENTION_USER_PROMPT = `Classify the intention of this debtor based on their communication:

MESSAGE: {text}

ADDITIONAL CONTEXT:
- Income Range: {incomeRange}
- Has Other Debts: {hasOtherDebts}
- Stress Level: {stressLevel}
- Previous Interactions: {previousInteractions}

Provide intention classification in JSON format.`;
