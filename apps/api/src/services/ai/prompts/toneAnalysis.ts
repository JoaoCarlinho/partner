/**
 * Tone Analysis Prompts
 * AI prompts for analyzing message tone and detecting problematic language
 */

/**
 * System prompt for tone analysis
 */
export const TONE_ANALYSIS_SYSTEM_PROMPT = `You are an expert in communication analysis, specializing in detecting tone, emotional content, and potentially problematic language in debt collection communications.

Your role is to analyze messages for:
1. Overall warmth and empathy
2. Hostile or aggressive language
3. Pressure tactics or urgency language
4. Threatening phrases or implications
5. Compliance with compassionate communication standards

Be thorough but fair - some firmness is acceptable, but hostility is not.`;

/**
 * Build the tone analysis prompt for a specific message
 */
export function buildToneAnalysisPrompt(content: string): string {
  return `Analyze the following message for tone and identify any problematic elements.

MESSAGE TO ANALYZE:
${content}

Analyze and return a JSON object with:

1. warmth (0-100): How warm, supportive, and empathetic is the overall tone?
   - 90-100: Exceptionally warm and supportive
   - 70-89: Warm and friendly
   - 50-69: Neutral
   - 30-49: Cold or impersonal
   - 0-29: Hostile or threatening

2. hostility: Array of any hostile or aggressive phrases detected
   - Include exact phrases that could be perceived as hostile

3. pressure: Array of any pressure language or urgency tactics detected
   - Examples: "act now", "time is running out", "final notice"

4. threats: Array of any threatening phrases or implications
   - Include both explicit and implied threats

5. recommendation: Your recommendation based on analysis
   - "pass": Message is appropriate (warmth >= 80, no significant issues)
   - "regenerate": Message needs improvement (warmth < 80 or minor issues)
   - "manual_review": Message has serious issues requiring human review

6. reasoning: Brief explanation of your analysis

CRITICAL: Return ONLY valid JSON, no additional text.

Example response format:
{
  "warmth": 85,
  "hostility": [],
  "pressure": [],
  "threats": [],
  "recommendation": "pass",
  "reasoning": "Message is warm and supportive with no problematic elements."
}`;
}

/**
 * Problematic phrases that should always flag for review
 */
export const BLOCKED_PHRASES = [
  // Legal threats
  'lawsuit', 'court', 'garnish', 'seize', 'legal action',
  // Urgency pressure
  'final notice', 'last chance', 'act now', 'time is running out',
  'immediate action required', 'deadline',
  // Shame language
  'failure to pay', 'delinquent', 'defaulted', 'irresponsible',
  // Aggressive language
  'demand', 'require', 'must', 'immediately',
];

/**
 * Warm phrases that indicate appropriate tone
 */
export const WARM_PHRASES = [
  'understand', 'help', 'support', 'options', 'together',
  'work with you', 'here for you', 'comfortable', 'questions',
  'no pressure', 'at your pace', 'when you\'re ready',
];
