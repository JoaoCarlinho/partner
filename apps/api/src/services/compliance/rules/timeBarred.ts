import type { ValidationContext, ComplianceCheckResult } from '@steno/shared';
import {
  isDebtTimeBarred,
  requiresTimeBarredDisclosure,
  getStateRule,
  getStatuteOfLimitations,
} from '@steno/shared';

/**
 * Time-Barred Debt Disclosure Check
 * State-specific requirement
 *
 * Many states require disclosure when attempting to collect
 * debts that are past the statute of limitations
 */

// Common time-barred disclosure patterns
const TIME_BARRED_PATTERNS = [
  /(?:law\s+)?limits\s+how\s+long\s+(?:you\s+)?can\s+(?:be\s+)?sued/i,
  /statute\s+of\s+limitations/i,
  /time[\-\s]?barred/i,
  /too\s+old\s+(?:to\s+)?(?:sue|enforce)/i,
  /(?:will\s+)?not\s+sue\s+(?:you\s+)?(?:for|on)\s+(?:this|it)/i,
  /debt\s+(?:is\s+)?(?:beyond|past|outside)\s+(?:the\s+)?(?:legal|statute)/i,
  /cannot\s+(?:legally\s+)?sue/i,
  /legal\s+time\s+(?:limit|period)\s+(?:has\s+)?(?:expired|passed)/i,
];

// Warning about reviving debt
const REVIVAL_WARNING_PATTERNS = [
  /(?:paying|payment|promise)\s+(?:may|could|will)\s+(?:restart|revive|renew)/i,
  /(?:may\s+)?become\s+enforceable\s+(?:again)?/i,
  /reset\s+(?:the\s+)?(?:clock|limitation)/i,
];

/**
 * Check for time-barred debt disclosure
 */
export function checkTimeBarred(
  content: string,
  context: ValidationContext
): ComplianceCheckResult {
  const { state, debtDetails } = context;
  const { originDate } = debtDetails;

  // Check if debt is time-barred
  const timeBarred = isDebtTimeBarred(originDate, state);
  const requiresDisclosure = requiresTimeBarredDisclosure(state);
  const stateRule = getStateRule(state);
  const sol = getStatuteOfLimitations(state);

  // If debt is not time-barred, this check is not applicable
  if (!timeBarred) {
    return {
      id: 'time_barred_disclosure',
      section: 'State-specific',
      name: 'Time-Barred Debt Disclosure',
      passed: true,
      required: false,
      details: `Debt is within ${state} statute of limitations (${sol} years)`,
    };
  }

  // If state doesn't require disclosure, pass with note
  if (!requiresDisclosure) {
    return {
      id: 'time_barred_disclosure',
      section: 'State-specific',
      name: 'Time-Barred Debt Disclosure',
      passed: true,
      required: false,
      details: `${state} does not require time-barred disclosure, but consider adding for consumer protection`,
    };
  }

  // Check for time-barred disclosure language
  let hasTimeBarredDisclosure = false;
  for (const pattern of TIME_BARRED_PATTERNS) {
    if (pattern.test(content)) {
      hasTimeBarredDisclosure = true;
      break;
    }
  }

  // Check for revival warning
  let hasRevivalWarning = false;
  for (const pattern of REVIVAL_WARNING_PATTERNS) {
    if (pattern.test(content)) {
      hasRevivalWarning = true;
      break;
    }
  }

  // Some states require specific disclosure text
  let hasStateSpecificDisclosure = true;
  if (stateRule?.additionalDisclosures?.length) {
    // Check if any state-specific language is present
    // This is a simplified check - real implementation might be stricter
    hasStateSpecificDisclosure = stateRule.additionalDisclosures.some(
      (disclosure) => {
        // Check for key phrases from the disclosure
        const keyPhrases = disclosure.toLowerCase().split(/[.,;]+/).filter(p => p.trim().length > 10);
        return keyPhrases.some((phrase) =>
          content.toLowerCase().includes(phrase.trim())
        );
      }
    );
  }

  const passed = hasTimeBarredDisclosure;

  let details: string;
  let suggestion: string | undefined;

  if (passed) {
    details = `Time-barred debt disclosure present for ${state}`;
    if (!hasRevivalWarning) {
      details += ' (consider adding revival warning)';
    }
    if (!hasStateSpecificDisclosure && stateRule?.additionalDisclosures?.length) {
      details += ` (${state} may require specific language)`;
    }
  } else {
    details = `Missing required time-barred debt disclosure for ${state} (SOL: ${sol} years)`;
    suggestion = generateTimeBarredSuggestion(state, stateRule);
  }

  return {
    id: 'time_barred_disclosure',
    section: 'State-specific',
    name: 'Time-Barred Debt Disclosure',
    passed,
    required: requiresDisclosure,
    details,
    suggestion,
  };
}

function generateTimeBarredSuggestion(
  state: string,
  stateRule: ReturnType<typeof getStateRule>
): string {
  if (stateRule?.additionalDisclosures?.length) {
    return `Add ${state}-required disclosure: "${stateRule.additionalDisclosures[0]}"`;
  }

  return (
    'Add disclosure: "The law limits how long you can be sued on a debt. ' +
    'Because of the age of your debt, we will not sue you for it."'
  );
}
