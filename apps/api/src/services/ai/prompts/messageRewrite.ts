/**
 * Message Rewriting Prompts
 * AI prompts for suggesting warmer message alternatives
 */

export const MESSAGE_REWRITE_SYSTEM_PROMPT = `You are a communication coach helping improve message tone in a debt resolution context.
Your role is to suggest warmer, more empathetic alternatives while preserving the original meaning.

CONTEXT:
- Messages are exchanged between creditors and debtors
- Goal is to facilitate respectful, solution-oriented dialogue
- All rewrites must maintain professionalism and legal compliance

REWRITING PRINCIPLES:
1. Preserve the EXACT same meaning and intent
2. Increase warmth and empathy
3. Maintain professionalism
4. Focus on solutions rather than problems
5. Use collaborative "we" language when appropriate
6. Acknowledge the recipient's situation
7. Remove aggressive or demanding language
8. Replace ultimatums with offers of help

OUTPUT FORMAT:
Return ONLY valid JSON array with no additional text.`;

export const MESSAGE_REWRITE_USER_PROMPT = `Rewrite this message to be WARMER and more EMPATHETIC:

ORIGINAL MESSAGE:
"{originalMessage}"

TONE ANALYSIS CONCERNS:
{concerns}

CURRENT WARMTH SCORE: {warmthScore}

Provide 2-3 alternative phrasings that:
1. Preserve the exact same meaning and intent
2. Sound more supportive and collaborative
3. Remove any aggressive or pressuring language
4. Acknowledge the recipient's perspective

TRANSFORMATION EXAMPLES:
| Original | Warmer Version |
|----------|----------------|
| "You must pay immediately or face consequences" | "We'd like to help you find a payment solution that works for your situation" |
| "This is your final warning" | "We want to make sure you're aware of the timeline so we can help you avoid any additional complications" |
| "Don't ignore this" | "We're here when you're ready to discuss options" |
| "Your debt is overdue" | "We noticed your payment date has passed and wanted to reach out to see how we can help" |
| "Pay now" | "When you're ready, we have several flexible payment options available" |

Return JSON array in this format:
[
  {
    "suggestedText": "<rewritten message>",
    "changes": ["<description of what was changed>"],
    "warmthImprovement": <estimated score increase 5-30>
  }
]

Return ONLY valid JSON array.`;

/**
 * Common warm phrase replacements for fallback
 */
export const WARM_PHRASE_REPLACEMENTS: Record<string, string> = {
  // Demanding -> Collaborative
  'you must': "we'd like to help you",
  'you need to': 'we can work together to',
  'you have to': "let's find a way to",
  'you should': 'it might help to',

  // Threatening -> Supportive
  'final warning': 'important update',
  'last chance': 'opportunity to',
  'or else': 'so we can help you',
  'consequences': 'next steps',
  'immediately': 'at your earliest convenience',
  'right now': 'when you have a moment',

  // Negative -> Solution-focused
  "don't ignore": "we're here for you",
  'stop ignoring': "we'd love to hear from you",
  overdue: 'past the scheduled date',
  delinquent: 'needs attention',
  'in default': 'requires your attention',

  // Accusatory -> Neutral
  'you failed to': "we haven't received",
  'you never': "we haven't been able to connect",
  'your problem': 'the situation',
  'your fault': 'this situation',

  // Cold -> Warm
  'pay now': 'explore payment options',
  'contact us immediately': "reach out when it's convenient",
  'we demand': 'we kindly request',
  notice: 'message',
  demand: 'request',
};

/**
 * Phrases that indicate warm communication (no change needed)
 */
export const WARM_INDICATORS = [
  'we understand',
  "we're here to help",
  'work together',
  'flexible options',
  'at your convenience',
  'please let us know',
  "we'd like to",
  "we're happy to",
  'support you',
  'assist you',
  'thank you',
  'appreciate',
];
