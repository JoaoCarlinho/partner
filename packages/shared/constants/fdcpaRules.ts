import type {
  ComplianceRequirement,
  StateRule,
  CommunicationTiming,
} from '../types/compliance.js';

/**
 * FDCPA Compliance Rules
 * Reference: 15 U.S.C. § 1692 et seq. and 12 CFR § 1006
 */

/**
 * US State codes type
 */
export type USStateCode =
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'DC';

/**
 * Array of valid US state codes
 */
export const US_STATE_CODES: USStateCode[] = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
];

/**
 * Core FDCPA requirements that must be checked
 */
export const FDCPA_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'validation_notice',
    section: '12 CFR § 1006.34',
    name: 'Validation Notice',
    description:
      'Must include validation information within 5 days of initial communication',
    required: true,
  },
  {
    id: 'mini_miranda',
    section: '15 U.S.C. § 1692e(11)',
    name: 'Mini-Miranda Warning',
    description:
      'Must disclose that this is an attempt to collect a debt and any information obtained will be used for that purpose',
    required: true,
  },
  {
    id: 'creditor_identification',
    section: '15 U.S.C. § 1692g(a)(2)',
    name: 'Creditor Identification',
    description: 'Must identify the name of the creditor to whom the debt is owed',
    required: true,
  },
  {
    id: 'debt_amount',
    section: '15 U.S.C. § 1692g(a)(1)',
    name: 'Debt Amount Statement',
    description: 'Must state the amount of the debt',
    required: true,
  },
  {
    id: 'dispute_rights',
    section: '15 U.S.C. § 1692g(a)(3-5)',
    name: 'Dispute Rights Disclosure',
    description:
      'Must inform debtor of 30-day dispute window and verification rights',
    required: true,
  },
  {
    id: 'time_barred_disclosure',
    section: 'State-specific',
    name: 'Time-Barred Debt Disclosure',
    description:
      'Must disclose if debt is beyond statute of limitations (state-specific requirement)',
    required: 'conditional',
    conditionDescription: 'Required if debt exceeds state statute of limitations',
  },
  {
    id: 'original_creditor',
    section: '15 U.S.C. § 1692g(a)(5)',
    name: 'Original Creditor Information',
    description:
      'Upon request, must provide name and address of original creditor if different from current',
    required: 'conditional',
    conditionDescription:
      'Required upon debtor request if original creditor differs from current',
  },
];

/**
 * Mini-Miranda detection patterns
 * Any of these patterns satisfies the requirement
 */
export const MINI_MIRANDA_PATTERNS = [
  /this\s+(?:is\s+an?\s+)?(?:communication|letter|notice)\s+is\s+(?:from\s+a\s+)?debt\s+collector/i,
  /this\s+is\s+an?\s+attempt\s+to\s+collect\s+a\?\s+debt/i,
  /any\s+information\s+(?:obtained|received)\s+will\s+be\s+used\s+for\s+that\s+purpose/i,
  /we\s+are\s+(?:a\s+)?debt\s+collector/i,
  /this\s+communication\s+is\s+from\s+a\s+debt\s+collector/i,
];

/**
 * Validation notice patterns
 */
export const VALIDATION_NOTICE_PATTERNS = {
  thirtyDayWindow: [
    /within\s+(?:30|thirty)\s+days/i,
    /(?:30|thirty)\s*(?:-|\s)?\s*day\s+(?:period|window|time)/i,
  ],
  disputeRights: [
    /dispute\s+(?:the\s+)?(?:debt|validity)/i,
    /right\s+to\s+(?:dispute|contest)/i,
  ],
  verificationRights: [
    /verification\s+of\s+(?:the\s+)?debt/i,
    /request\s+(?:verification|validation)/i,
  ],
  originalCreditor: [
    /name\s+(?:and\s+address\s+)?of\s+(?:the\s+)?original\s+creditor/i,
    /original\s+creditor(?:'s)?\s+(?:name|information)/i,
  ],
};

/**
 * Debt amount patterns
 */
export const DEBT_AMOUNT_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?/,
  /(?:amount|balance|total)\s+(?:owed|due|of)\s*:?\s*\$?[\d,]+(?:\.\d{2})?/i,
  /you\s+owe\s*\$?[\d,]+(?:\.\d{2})?/i,
  /debt\s+(?:amount|balance)\s*:?\s*\$?[\d,]+(?:\.\d{2})?/i,
];

/**
 * State-specific rules including statute of limitations
 */
export const STATE_RULES: Record<string, StateRule> = {
  AL: { stateCode: 'AL', stateName: 'Alabama', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  AK: { stateCode: 'AK', stateName: 'Alaska', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  AZ: { stateCode: 'AZ', stateName: 'Arizona', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  AR: { stateCode: 'AR', stateName: 'Arkansas', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  CA: {
    stateCode: 'CA',
    stateName: 'California',
    statuteOfLimitations: 4,
    additionalRequirements: ['Rosenthal Fair Debt Collection Practices Act compliance'],
    timeBarredDisclosureRequired: true,
    additionalDisclosures: [
      'The law limits how long you can be sued on a debt. Because of the age of your debt, we will not sue you for it.',
    ],
  },
  CO: { stateCode: 'CO', stateName: 'Colorado', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  CT: { stateCode: 'CT', stateName: 'Connecticut', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  DE: { stateCode: 'DE', stateName: 'Delaware', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  FL: {
    stateCode: 'FL',
    stateName: 'Florida',
    statuteOfLimitations: 5,
    additionalRequirements: ['Florida Consumer Collection Practices Act compliance'],
    timeBarredDisclosureRequired: true,
  },
  GA: { stateCode: 'GA', stateName: 'Georgia', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  HI: { stateCode: 'HI', stateName: 'Hawaii', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  ID: { stateCode: 'ID', stateName: 'Idaho', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  IL: { stateCode: 'IL', stateName: 'Illinois', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  IN: { stateCode: 'IN', stateName: 'Indiana', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  IA: { stateCode: 'IA', stateName: 'Iowa', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  KS: { stateCode: 'KS', stateName: 'Kansas', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  KY: { stateCode: 'KY', stateName: 'Kentucky', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  LA: { stateCode: 'LA', stateName: 'Louisiana', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  ME: { stateCode: 'ME', stateName: 'Maine', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MD: { stateCode: 'MD', stateName: 'Maryland', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MA: { stateCode: 'MA', stateName: 'Massachusetts', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MI: { stateCode: 'MI', stateName: 'Michigan', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MN: { stateCode: 'MN', stateName: 'Minnesota', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MS: { stateCode: 'MS', stateName: 'Mississippi', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MO: { stateCode: 'MO', stateName: 'Missouri', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  MT: { stateCode: 'MT', stateName: 'Montana', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  NE: { stateCode: 'NE', stateName: 'Nebraska', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  NV: { stateCode: 'NV', stateName: 'Nevada', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  NH: { stateCode: 'NH', stateName: 'New Hampshire', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  NJ: { stateCode: 'NJ', stateName: 'New Jersey', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  NM: {
    stateCode: 'NM',
    stateName: 'New Mexico',
    statuteOfLimitations: 6,
    additionalRequirements: ['New Mexico time-barred debt disclosure'],
    timeBarredDisclosureRequired: true,
  },
  NY: {
    stateCode: 'NY',
    stateName: 'New York',
    statuteOfLimitations: 6,
    additionalRequirements: ['NYC specific disclosure requirements'],
    timeBarredDisclosureRequired: true,
    additionalDisclosures: [
      'The law limits how long you can be sued on a debt. Because of the age of your debt, we will not sue you for it, and we will not report it to any credit reporting agency.',
    ],
  },
  NC: { stateCode: 'NC', stateName: 'North Carolina', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  ND: { stateCode: 'ND', stateName: 'North Dakota', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  OH: { stateCode: 'OH', stateName: 'Ohio', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  OK: { stateCode: 'OK', stateName: 'Oklahoma', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  OR: { stateCode: 'OR', stateName: 'Oregon', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  PA: { stateCode: 'PA', stateName: 'Pennsylvania', statuteOfLimitations: 4, additionalRequirements: [], timeBarredDisclosureRequired: false },
  RI: { stateCode: 'RI', stateName: 'Rhode Island', statuteOfLimitations: 10, additionalRequirements: [], timeBarredDisclosureRequired: false },
  SC: { stateCode: 'SC', stateName: 'South Carolina', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
  SD: { stateCode: 'SD', stateName: 'South Dakota', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  TN: { stateCode: 'TN', stateName: 'Tennessee', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  TX: {
    stateCode: 'TX',
    stateName: 'Texas',
    statuteOfLimitations: 4,
    additionalRequirements: ['Texas time-barred debt notice'],
    timeBarredDisclosureRequired: true,
    additionalDisclosures: [
      'This debt is too old for you to be sued on it. If you pay any amount on this debt or promise to pay, the debt may become enforceable again.',
    ],
  },
  UT: { stateCode: 'UT', stateName: 'Utah', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  VT: { stateCode: 'VT', stateName: 'Vermont', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  VA: { stateCode: 'VA', stateName: 'Virginia', statuteOfLimitations: 5, additionalRequirements: [], timeBarredDisclosureRequired: false },
  WA: { stateCode: 'WA', stateName: 'Washington', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  WV: { stateCode: 'WV', stateName: 'West Virginia', statuteOfLimitations: 10, additionalRequirements: [], timeBarredDisclosureRequired: false },
  WI: { stateCode: 'WI', stateName: 'Wisconsin', statuteOfLimitations: 6, additionalRequirements: [], timeBarredDisclosureRequired: false },
  WY: { stateCode: 'WY', stateName: 'Wyoming', statuteOfLimitations: 8, additionalRequirements: [], timeBarredDisclosureRequired: false },
  DC: { stateCode: 'DC', stateName: 'District of Columbia', statuteOfLimitations: 3, additionalRequirements: [], timeBarredDisclosureRequired: false },
};

/**
 * Default federal communication timing restrictions
 * FDCPA prohibits calls before 8am or after 9pm local time
 */
export const DEFAULT_COMMUNICATION_TIMING: CommunicationTiming = {
  earliestHour: 8,
  latestHour: 21, // 9 PM
  allowWeekends: true,
  allowHolidays: true,
};

/**
 * Get statute of limitations for a state
 */
export function getStatuteOfLimitations(stateCode: string): number {
  const rule = STATE_RULES[stateCode.toUpperCase()];
  return rule?.statuteOfLimitations ?? 6; // Default to 6 years if unknown
}

/**
 * Check if a debt is time-barred based on state SOL
 */
export function isDebtTimeBarred(
  originDate: string,
  stateCode: string
): boolean {
  const sol = getStatuteOfLimitations(stateCode);
  const origin = new Date(originDate);
  const now = new Date();
  const yearsDiff = (now.getTime() - origin.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return yearsDiff > sol;
}

/**
 * Check if state requires time-barred disclosure
 */
export function requiresTimeBarredDisclosure(stateCode: string): boolean {
  const rule = STATE_RULES[stateCode.toUpperCase()];
  return rule?.timeBarredDisclosureRequired ?? false;
}

/**
 * Get state rule or default
 */
export function getStateRule(stateCode: string): StateRule | null {
  return STATE_RULES[stateCode.toUpperCase()] ?? null;
}
