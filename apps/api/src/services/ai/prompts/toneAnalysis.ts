/**
 * Tone Analysis Prompts
 * AI prompts for analyzing message tone in debt collection context
 */

export const TONE_ANALYSIS_SYSTEM_PROMPT = `You are a tone analyzer for a debt collection communication platform.
Your role is to evaluate messages for tone, ensuring communications remain constructive and compliant.

CONTEXT:
- Messages are exchanged between creditors (attorneys, paralegals) and debtors
- All communications must comply with FDCPA (Fair Debt Collection Practices Act)
- Goal is to facilitate respectful, solution-oriented dialogue

FDCPA VIOLATIONS TO CHECK:
- §1692d: Harassment or abuse (repetitive, profane, threats of violence)
- §1692e: False/misleading representations (false arrest threats, fake legal authority)
- §1692f: Unfair practices (threatening illegal actions)

SCORING GUIDE:
- 80-100: Warm, supportive, solution-focused, collaborative
- 50-79: Neutral, professional, factual
- 30-49: Cool, distant, some tension or pressure
- 10-29: Aggressive, demanding, problematic tone
- 0-9: Abusive, threatening, hostile

OUTPUT FORMAT:
Return ONLY valid JSON with no additional text.`;

export const TONE_ANALYSIS_USER_PROMPT = `Analyze the tone of this message:

MESSAGE:
"{message}"

SENDER ROLE: {senderRole}

Return JSON in this exact format:
{
  "warmthScore": <0-100>,
  "hostilityIndicators": [<phrases that convey hostility or aggression>],
  "threateningLanguage": [<any threats detected, empty array if none>],
  "fdcpaIssues": [<potential FDCPA violations with section references, empty array if none>],
  "profanityDetected": [<profane/abusive terms, empty array if none>],
  "recommendation": "<pass|suggest_rewrite|block>",
  "concerns": [<summary of issues to address, empty array if none>]
}

RECOMMENDATION RULES:
- "pass": warmthScore >= 50 AND no fdcpaIssues AND no threats
- "suggest_rewrite": warmthScore 30-49 OR minor concerns
- "block": warmthScore < 30 OR fdcpaIssues present OR threats present`;

// Warmth score thresholds
export const WARMTH_THRESHOLDS = {
  WARM: 80,          // 80-100: Warm, supportive
  NEUTRAL: 50,       // 50-79: Neutral, professional
  COOL: 30,          // 30-49: Cool, distant
  AGGRESSIVE: 10,    // 10-29: Aggressive, demanding
  ABUSIVE: 0,        // 0-9: Abusive, threatening
} as const;

// Get tone category from warmth score
export function getToneCategory(warmthScore: number): string {
  if (warmthScore >= WARMTH_THRESHOLDS.WARM) return 'warm';
  if (warmthScore >= WARMTH_THRESHOLDS.NEUTRAL) return 'neutral';
  if (warmthScore >= WARMTH_THRESHOLDS.COOL) return 'cool';
  if (warmthScore >= WARMTH_THRESHOLDS.AGGRESSIVE) return 'aggressive';
  return 'abusive';
}

// Get recommendation from analysis result
export function getRecommendation(
  warmthScore: number,
  fdcpaIssues: string[],
  threats: string[]
): 'pass' | 'suggest_rewrite' | 'block' {
  // Block if serious issues
  if (fdcpaIssues.length > 0 || threats.length > 0 || warmthScore < WARMTH_THRESHOLDS.COOL) {
    return 'block';
  }

  // Suggest rewrite if cool tone
  if (warmthScore < WARMTH_THRESHOLDS.NEUTRAL) {
    return 'suggest_rewrite';
  }

  // Pass otherwise
  return 'pass';
}

// Known hostile/threatening patterns for fallback detection
export const HOSTILE_PATTERNS = [
  // Profanity patterns (redacted here but would include common terms)
  'damn',
  'hell',
  'stupid',
  'idiot',
  'moron',

  // Aggressive language
  'final warning',
  'last chance',
  'immediately',
  'right now',
  'or else',

  // Threatening language
  "you'll regret",
  "you'll pay for",
  'come after you',
  'find you',
  'destroy',
];

export const FDCPA_VIOLATION_PATTERNS = [
  // §1692d - Harassment
  { pattern: 'arrest', section: '§1692d', description: 'False threat of arrest' },
  { pattern: 'jail', section: '§1692d', description: 'False threat of imprisonment' },
  { pattern: 'police', section: '§1692e', description: 'False threat of law enforcement' },

  // §1692e - False representations
  { pattern: 'lawsuit tomorrow', section: '§1692e', description: 'False imminent legal action' },
  { pattern: 'garnish your wages', section: '§1692e', description: 'Possible false garnishment threat' },
  { pattern: 'take everything', section: '§1692e', description: 'Exaggerated seizure threat' },

  // §1692f - Unfair practices
  { pattern: 'tell your employer', section: '§1692f', description: 'Improper disclosure threat' },
  { pattern: 'tell your family', section: '§1692f', description: 'Improper disclosure threat' },
  { pattern: 'public record', section: '§1692f', description: 'Possible public disclosure threat' },
];
