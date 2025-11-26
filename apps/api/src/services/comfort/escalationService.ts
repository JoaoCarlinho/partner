/**
 * Escalation Service
 * Detects and handles escalation triggers for debtor distress
 */

// Escalation keywords for self-harm detection
const SELF_HARM_KEYWORDS = [
  'suicide',
  'kill myself',
  'end it all',
  "can't go on",
  'harm myself',
  'not worth living',
  'better off dead',
  'want to die',
  'end my life',
  'take my life',
];

// Keywords indicating extreme distress
const DISTRESS_KEYWORDS = [
  "can't take it anymore",
  'breaking down',
  'falling apart',
  'at my limit',
  "can't cope",
  'losing my mind',
  'no way out',
  'no hope',
  'desperate',
  'hopeless',
  'giving up',
];

// Keywords for requests for help
const HELP_KEYWORDS = [
  'need to talk to someone',
  'need help now',
  'emergency',
  'crisis',
  'talk to a person',
  'real person',
  'human help',
  'speak to someone',
];

// Threatening language toward creditor
const THREAT_KEYWORDS = [
  "i'll find you",
  'come after you',
  'hurt you',
  'sue you',
  'lawyer up',
  'see you in court',
  'report you',
  "you'll pay",
  'destroy you',
];

// Escalation types
export type EscalationType = 'self_harm' | 'distress' | 'help_request' | 'threat';

// Severity levels
export type EscalationSeverity = 'immediate' | 'urgent' | 'monitor';

// Actions to take
export type EscalationAction = 'crisis_resources' | 'pause_ai' | 'human_review' | 'notify_creditor';

// Escalation result
export interface EscalationResult {
  triggered: boolean;
  type: EscalationType | null;
  severity: EscalationSeverity | null;
  actions: EscalationAction[];
  matchedPhrases: string[];
  crisisResources?: CrisisResource[];
}

// Crisis resources
export interface CrisisResource {
  name: string;
  phone?: string;
  sms?: string;
  url?: string;
  description: string;
}

// Default crisis resources
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    description: '24/7 free and confidential support for people in distress',
  },
  {
    name: 'Crisis Text Line',
    sms: '741741',
    description: 'Text HOME to 741741 for free crisis counseling',
  },
  {
    name: 'National Foundation for Credit Counseling',
    phone: '1-800-388-2227',
    url: 'https://www.nfcc.org',
    description: 'Free or low-cost financial counseling services',
  },
  {
    name: 'Consumer Financial Protection Bureau',
    url: 'https://www.consumerfinance.gov',
    description: 'Resources for understanding your rights and options',
  },
];

/**
 * Check text for escalation triggers
 */
export function checkEscalationTriggers(text: string): EscalationResult {
  const lowercaseText = text.toLowerCase();
  const matchedPhrases: string[] = [];

  // Check for self-harm indicators (highest priority)
  const selfHarmMatches = findMatches(lowercaseText, SELF_HARM_KEYWORDS);
  if (selfHarmMatches.length > 0) {
    return {
      triggered: true,
      type: 'self_harm',
      severity: 'immediate',
      actions: ['crisis_resources', 'pause_ai', 'human_review'],
      matchedPhrases: selfHarmMatches,
      crisisResources: CRISIS_RESOURCES,
    };
  }

  // Check for extreme distress
  const distressMatches = findMatches(lowercaseText, DISTRESS_KEYWORDS);
  if (distressMatches.length >= 2) {
    return {
      triggered: true,
      type: 'distress',
      severity: 'urgent',
      actions: ['crisis_resources', 'human_review'],
      matchedPhrases: distressMatches,
      crisisResources: CRISIS_RESOURCES,
    };
  }

  // Check for help requests
  const helpMatches = findMatches(lowercaseText, HELP_KEYWORDS);
  if (helpMatches.length > 0) {
    return {
      triggered: true,
      type: 'help_request',
      severity: 'urgent',
      actions: ['human_review'],
      matchedPhrases: helpMatches,
    };
  }

  // Check for threats
  const threatMatches = findMatches(lowercaseText, THREAT_KEYWORDS);
  if (threatMatches.length > 0) {
    return {
      triggered: true,
      type: 'threat',
      severity: 'monitor',
      actions: ['notify_creditor', 'human_review'],
      matchedPhrases: threatMatches,
    };
  }

  // No escalation triggered
  return {
    triggered: false,
    type: null,
    severity: null,
    actions: [],
    matchedPhrases: [],
  };
}

/**
 * Check if sustained stress level triggers escalation
 */
export function checkStressEscalation(stressHistory: number[]): EscalationResult {
  // Need at least 3 readings
  if (stressHistory.length < 3) {
    return {
      triggered: false,
      type: null,
      severity: null,
      actions: [],
      matchedPhrases: [],
    };
  }

  // Check recent readings (last 3)
  const recentReadings = stressHistory.slice(-3);
  const allVeryStressed = recentReadings.every((level) => level === 1);
  const mostlyStressed = recentReadings.filter((level) => level <= 2).length >= 2;

  if (allVeryStressed) {
    return {
      triggered: true,
      type: 'distress',
      severity: 'urgent',
      actions: ['crisis_resources', 'human_review'],
      matchedPhrases: ['sustained_very_stressed'],
      crisisResources: CRISIS_RESOURCES,
    };
  }

  if (mostlyStressed) {
    return {
      triggered: true,
      type: 'distress',
      severity: 'monitor',
      actions: ['human_review'],
      matchedPhrases: ['sustained_stressed'],
    };
  }

  return {
    triggered: false,
    type: null,
    severity: null,
    actions: [],
    matchedPhrases: [],
  };
}

/**
 * Find keyword matches in text
 */
function findMatches(text: string, keywords: string[]): string[] {
  const matches: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches.push(keyword);
    }
  }
  return matches;
}

/**
 * Get appropriate response for escalation
 */
export function getEscalationResponse(escalation: EscalationResult): string {
  if (!escalation.triggered) {
    return '';
  }

  switch (escalation.type) {
    case 'self_harm':
      return `I want you to know that your life matters, and there are people who want to help.

If you're having thoughts of harming yourself, please reach out:
- **National Suicide Prevention Lifeline: 988** (call or text, available 24/7)
- **Crisis Text Line: Text HOME to 741741**

You don't have to face this alone. These services are free, confidential, and available right now.

I'm pausing our conversation so you can get the support you need. Your wellbeing is more important than any debt.`;

    case 'distress':
      return `I can hear that you're going through a really difficult time. Financial stress can feel overwhelming, but there are people and resources that can help.

Here are some resources that might help:
- **NFCC Financial Counseling: 1-800-388-2227** - Free guidance on managing debt
- **Crisis Text Line: Text HOME to 741741** - If you need someone to talk to

Would you like me to connect you with a person who can help directly? You don't have to handle this alone.`;

    case 'help_request':
      return `I understand you'd like to speak with someone directly. I'm flagging this for our support team, and someone will reach out to you soon.

In the meantime, if you need immediate assistance, you can call 1-800-388-2227 for financial counseling support.`;

    case 'threat':
      return `I understand you're frustrated. We want to work with you to find a solution.

If you have concerns about how your debt is being handled, you have rights. You can:
- Request debt validation
- File a complaint with the Consumer Financial Protection Bureau
- Consult with a consumer rights attorney

Let's try to work through this together. What specific concerns do you have?`;

    default:
      return '';
  }
}

/**
 * Log escalation event (for audit trail)
 */
export interface EscalationEvent {
  timestamp: Date;
  debtorProfileId: string;
  caseId: string;
  escalationType: EscalationType;
  severity: EscalationSeverity;
  matchedPhrases: string[];
  actionsTaken: EscalationAction[];
  sourceText?: string; // Should be encrypted/redacted in actual log
}

export function createEscalationEvent(
  escalation: EscalationResult,
  debtorProfileId: string,
  caseId: string
): EscalationEvent | null {
  if (!escalation.triggered || !escalation.type || !escalation.severity) {
    return null;
  }

  return {
    timestamp: new Date(),
    debtorProfileId,
    caseId,
    escalationType: escalation.type,
    severity: escalation.severity,
    matchedPhrases: escalation.matchedPhrases,
    actionsTaken: escalation.actions,
  };
}
