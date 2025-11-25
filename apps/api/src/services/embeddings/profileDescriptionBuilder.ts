/**
 * Profile Description Builder
 * Creates natural language descriptions from normalized profiles
 * These descriptions are used as input for embedding generation
 */

import { NormalizedProfile } from './profileNormalizer';

/**
 * Description format version for tracking changes
 */
export const DESCRIPTION_VERSION = 'v1.0.0';

/**
 * Convert stress level number to text
 */
function stressLevelToText(level: number): string {
  const levels: Record<number, string> = {
    1: 'very low',
    2: 'low',
    3: 'moderate',
    4: 'high',
    5: 'very high',
  };
  return levels[level] || 'moderate';
}

/**
 * Convert cooperation level to text
 */
function cooperationToText(level: number): string {
  if (level >= 0.8) return 'very cooperative';
  if (level >= 0.6) return 'cooperative';
  if (level >= 0.4) return 'neutral';
  if (level >= 0.2) return 'reluctant';
  return 'uncooperative';
}

/**
 * Convert engagement level to text
 */
function engagementToText(level: number): string {
  if (level >= 0.7) return 'high';
  if (level >= 0.3) return 'medium';
  return 'low';
}

/**
 * Convert expense ratio to text
 */
function expenseRatioToText(ratio: number): string {
  const percentage = Math.round(ratio * 100);
  if (percentage >= 90) return 'very high expenses';
  if (percentage >= 70) return 'high expenses';
  if (percentage >= 50) return 'moderate expenses';
  if (percentage >= 30) return 'low expenses';
  return 'very low expenses';
}

/**
 * Convert debt age to text
 */
function debtAgeToText(months: number): string {
  if (months <= 3) return 'very recent';
  if (months <= 6) return 'recent';
  if (months <= 12) return 'several months old';
  if (months <= 24) return 'over a year old';
  return 'aged debt';
}

/**
 * Convert completion rate to text
 */
function completionRateToText(rate: number | undefined): string {
  if (rate === undefined) return 'unknown completion';
  const percentage = Math.round(rate * 100);
  if (percentage >= 90) return 'excellent completion';
  if (percentage >= 70) return 'good completion';
  if (percentage >= 50) return 'partial completion';
  if (percentage >= 25) return 'low completion';
  return 'minimal completion';
}

/**
 * Build a natural language description from normalized profile
 * This description is used as input for the embedding model
 */
export function buildProfileDescription(normalized: NormalizedProfile): string {
  const parts: string[] = [];

  // Financial situation
  parts.push(
    `Debt situation: ${normalized.debtRange} range, ${debtAgeToText(normalized.debtAgeMonths)}, type ${normalized.debtType}`
  );

  parts.push(
    `Financial capacity: ${normalized.incomeRange} income, ${expenseRatioToText(normalized.expenseRatio)}`
  );

  // Behavioral patterns
  parts.push(
    `Engagement: ${normalized.responseTimeCategory} response time, ${engagementToText(normalized.engagementLevel)} engagement, ${normalized.communicationFrequency} communication frequency`
  );

  // Emotional indicators
  parts.push(
    `Emotional state: ${stressLevelToText(normalized.stressLevel)} stress, ${cooperationToText(normalized.cooperationLevel)}`
  );

  // Outcome (if available)
  if (normalized.outcome) {
    const outcomeText = [
      `Outcome: ${normalized.outcome}`,
      normalized.resolutionDays ? `resolved in ${normalized.resolutionDays} days` : null,
      normalized.planType ? `${normalized.planType} plan` : null,
      completionRateToText(normalized.completionRate),
    ]
      .filter(Boolean)
      .join(', ');

    parts.push(outcomeText);
  }

  return parts.join('\n');
}

/**
 * Build a compact description for shorter context
 */
export function buildCompactDescription(normalized: NormalizedProfile): string {
  const tags: string[] = [
    `debt:${normalized.debtRange}`,
    `income:${normalized.incomeRange}`,
    `expense_ratio:${Math.round(normalized.expenseRatio * 100)}%`,
    `debt_age:${normalized.debtAgeMonths}mo`,
    `response:${normalized.responseTimeCategory}`,
    `engagement:${engagementToText(normalized.engagementLevel)}`,
    `stress:${normalized.stressLevel}/5`,
    `cooperation:${Math.round(normalized.cooperationLevel * 100)}%`,
  ];

  if (normalized.outcome) {
    tags.push(`outcome:${normalized.outcome}`);
    if (normalized.completionRate !== undefined) {
      tags.push(`completion:${Math.round(normalized.completionRate * 100)}%`);
    }
  }

  return tags.join(' | ');
}

/**
 * Validate description contains no PII
 */
export function validateDescription(description: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // PII patterns to check
  const patterns: Record<string, RegExp> = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    exactDollar: /\$\d{1,}(?:,\d{3})*(?:\.\d{2})?/g,
    name: /\b(Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+/g,
    address: /\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Ave|Rd|Blvd|Dr|Ln|Way|Ct)\b/gi,
    zipCode: /\b\d{5}(-\d{4})?\b/g,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = description.match(pattern);
    if (matches) {
      violations.push(`${type}: ${matches.length} potential match(es) found`);
    }
  }

  // Check for large exact numbers (could be amounts)
  const largeNumbers = description.match(/\b\d{4,}\b/g);
  if (largeNumbers) {
    // Filter out valid patterns like debt ranges
    const suspicious = largeNumbers.filter(
      (n) => !['1000', '5000', '10000', '25000', '50000'].includes(n)
    );
    if (suspicious.length > 0) {
      violations.push(`large_numbers: ${suspicious.length} suspicious number(s) found`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export default {
  buildProfileDescription,
  buildCompactDescription,
  validateDescription,
  DESCRIPTION_VERSION,
};
