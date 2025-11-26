/**
 * Profile Normalizer
 * Normalizes debtor profile data for embedding generation
 * Ensures no PII is included in normalized output
 */

/**
 * Debt amount range buckets
 */
export const DEBT_RANGES = [
  '0-1000',
  '1000-5000',
  '5000-10000',
  '10000-25000',
  '25000-50000',
  '50000+',
] as const;

export type DebtRange = (typeof DEBT_RANGES)[number];

/**
 * Income range categories
 */
export const INCOME_RANGES = ['low', 'medium', 'high', 'very_high'] as const;

export type IncomeRange = (typeof INCOME_RANGES)[number];

/**
 * Response time categories
 */
export const RESPONSE_TIME_CATEGORIES = ['fast', 'medium', 'slow'] as const;

export type ResponseTimeCategory = (typeof RESPONSE_TIME_CATEGORIES)[number];

/**
 * Communication frequency levels
 */
export const COMMUNICATION_FREQUENCIES = ['low', 'medium', 'high'] as const;

export type CommunicationFrequency = (typeof COMMUNICATION_FREQUENCIES)[number];

/**
 * Outcome types
 */
export type OutcomeType = 'resolved' | 'defaulted' | 'escalated' | 'in_progress';

/**
 * Normalized profile interface (no PII)
 */
export interface NormalizedProfile {
  // Financial (categorized)
  debtRange: DebtRange;
  incomeRange: IncomeRange;
  expenseRatio: number; // 0-1
  debtAgeMonths: number;
  debtType: string;

  // Behavioral
  responseTimeCategory: ResponseTimeCategory;
  engagementLevel: number; // 0-1
  communicationFrequency: CommunicationFrequency;
  messageCount: number;

  // Emotional
  stressLevel: number; // 1-5
  cooperationLevel: number; // 0-1

  // Outcome (if resolved)
  outcome?: OutcomeType;
  resolutionDays?: number;
  planType?: 'conservative' | 'moderate' | 'aggressive';
  completionRate?: number;

  // Metadata
  normalizedAt: Date;
  version: string;
}

/**
 * Raw profile data input
 */
export interface ProfileData {
  caseId: string;
  debtAmount: number;
  debtType?: string;
  debtOriginDate?: Date;
  incomeRange?: { min: number; max: number };
  totalExpenses?: number;
  avgResponseTimeMinutes?: number;
  engagementScore?: number;
  messageCount?: number;
  stressLevel?: number;
  cooperationScore?: number;
  outcome?: string;
  resolutionDate?: Date;
  createdAt?: Date;
  planType?: string;
  paymentCompletionRate?: number;
}

/**
 * Normalization version for tracking
 */
export const NORMALIZATION_VERSION = 'v1.0.0';

/**
 * Categorize debt amount into range
 */
export function categorizeDebt(amount: number): DebtRange {
  if (amount <= 1000) return '0-1000';
  if (amount <= 5000) return '1000-5000';
  if (amount <= 10000) return '5000-10000';
  if (amount <= 25000) return '10000-25000';
  if (amount <= 50000) return '25000-50000';
  return '50000+';
}

/**
 * Categorize income into range
 */
export function categorizeIncome(annualIncome: number): IncomeRange {
  if (annualIncome < 25000) return 'low';
  if (annualIncome < 50000) return 'medium';
  if (annualIncome < 100000) return 'high';
  return 'very_high';
}

/**
 * Categorize response time
 */
export function categorizeResponseTime(avgMinutes: number): ResponseTimeCategory {
  if (avgMinutes < 60) return 'fast'; // Under 1 hour
  if (avgMinutes < 1440) return 'medium'; // Under 24 hours
  return 'slow';
}

/**
 * Categorize communication frequency
 */
export function categorizeCommunicationFrequency(messageCount: number): CommunicationFrequency {
  if (messageCount <= 3) return 'low';
  if (messageCount <= 10) return 'medium';
  return 'high';
}

/**
 * Calculate months since a date
 */
export function monthsSince(date: Date | undefined): number {
  if (!date) return 0;
  const now = new Date();
  const months =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return Math.max(0, months);
}

/**
 * Normalize plan type
 */
function normalizePlanType(planType?: string): 'conservative' | 'moderate' | 'aggressive' | undefined {
  if (!planType) return undefined;
  const lower = planType.toLowerCase();
  if (lower.includes('conservative') || lower.includes('low')) return 'conservative';
  if (lower.includes('aggressive') || lower.includes('high')) return 'aggressive';
  return 'moderate';
}

/**
 * Normalize outcome type
 */
function normalizeOutcome(outcome?: string): OutcomeType | undefined {
  if (!outcome) return undefined;
  const lower = outcome.toLowerCase();
  if (lower.includes('resolved') || lower.includes('paid') || lower.includes('completed')) {
    return 'resolved';
  }
  if (lower.includes('default') || lower.includes('failed')) {
    return 'defaulted';
  }
  if (lower.includes('escalat') || lower.includes('legal')) {
    return 'escalated';
  }
  return 'in_progress';
}

/**
 * Normalize a debtor profile for embedding
 * Strips all PII and categorizes values
 */
export function normalizeProfile(data: ProfileData): NormalizedProfile {
  // Calculate income midpoint if range provided
  const incomeMidpoint = data.incomeRange
    ? (data.incomeRange.min + data.incomeRange.max) / 2
    : 40000; // Default to medium

  // Calculate expense ratio
  const expenseRatio =
    data.totalExpenses && data.incomeRange ? data.totalExpenses / incomeMidpoint : 0.5;

  // Calculate resolution days if applicable
  let resolutionDays: number | undefined;
  if (data.resolutionDate && data.createdAt) {
    const diffTime = data.resolutionDate.getTime() - data.createdAt.getTime();
    resolutionDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    // Financial (categorized - no exact values)
    debtRange: categorizeDebt(data.debtAmount),
    incomeRange: categorizeIncome(incomeMidpoint),
    expenseRatio: Math.min(1, Math.max(0, expenseRatio)),
    debtAgeMonths: monthsSince(data.debtOriginDate),
    debtType: data.debtType || 'other',

    // Behavioral
    responseTimeCategory: categorizeResponseTime(data.avgResponseTimeMinutes || 720),
    engagementLevel: Math.min(1, Math.max(0, data.engagementScore || 0.5)),
    communicationFrequency: categorizeCommunicationFrequency(data.messageCount || 0),
    messageCount: Math.min(data.messageCount || 0, 100), // Cap at 100

    // Emotional
    stressLevel: Math.min(5, Math.max(1, data.stressLevel || 3)),
    cooperationLevel: Math.min(1, Math.max(0, data.cooperationScore || 0.5)),

    // Outcome
    outcome: normalizeOutcome(data.outcome),
    resolutionDays,
    planType: normalizePlanType(data.planType),
    completionRate: data.paymentCompletionRate,

    // Metadata
    normalizedAt: new Date(),
    version: NORMALIZATION_VERSION,
  };
}

/**
 * Validate that a normalized profile contains no PII
 * Returns true if clean, throws if PII detected
 */
export function validateNoPII(profile: NormalizedProfile): boolean {
  // The normalization process should have already removed all PII
  // This is a safety check
  const serialized = JSON.stringify(profile);

  // Check for patterns that shouldn't exist
  const piiPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, // SSN
    /\$\d{1,}(?:,\d{3})*(?:\.\d{2})?/g, // Exact dollar amounts
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(serialized)) {
      throw new Error('PII detected in normalized profile');
    }
  }

  return true;
}

export default {
  normalizeProfile,
  validateNoPII,
  categorizeDebt,
  categorizeIncome,
  categorizeResponseTime,
  categorizeCommunicationFrequency,
  monthsSince,
  NORMALIZATION_VERSION,
  DEBT_RANGES,
  INCOME_RANGES,
  RESPONSE_TIME_CATEGORIES,
};
