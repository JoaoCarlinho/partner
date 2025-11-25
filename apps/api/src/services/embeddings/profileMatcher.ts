/**
 * Profile Matcher Service
 * Finds similar debtor profiles for pattern learning
 */

/**
 * Similarity threshold levels
 */
export const THRESHOLDS = {
  strict: 0.8,
  standard: 0.6,
  relaxed: 0.4,
} as const;

export type ThresholdLevel = keyof typeof THRESHOLDS;

/**
 * Search scope options
 */
export type SearchScope = 'own' | 'global' | 'hybrid';

/**
 * Match options
 */
export interface MatchOptions {
  topK: number;
  threshold: ThresholdLevel;
  scope: SearchScope;
  successOnly: boolean;
  minCompletionRate?: number;
}

/**
 * Default match options
 */
export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  topK: 10,
  threshold: 'standard',
  scope: 'hybrid',
  successOnly: true,
  minCompletionRate: 0.8,
};

/**
 * Raw match from similarity search
 */
export interface RawMatch {
  profileId: string;
  similarity: number;
  organizationId: string;
  metadata: {
    debtRange: string;
    incomeRange: string;
    outcome?: string;
    resolutionDays?: number;
    planType?: string;
    completionRate?: number;
    stressLevel: number;
    cooperationLevel: number;
    frequency?: string;
    paymentRatio?: number;
  };
  outcomeRecordedAt?: Date;
  isOwnOrganization: boolean;
}

/**
 * Scored match with composite score
 */
export interface ScoredMatch extends RawMatch {
  compositeScore: number;
}

/**
 * Anonymized match for API response
 */
export interface AnonymizedMatch {
  matchId: string;
  similarity: number;
  compositeScore: number;
  metadata: {
    debtRange: string;
    incomeRange: string;
    resolutionDays?: number;
    planType?: string;
    completionRate?: number;
  };
  isOwnOrganization: boolean;
}

/**
 * Pattern summary from matches
 */
export interface PatternSummary {
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
  patterns: {
    commonPlanType: { value: string; frequency: number } | null;
    avgResolutionDays: { value: number; stdDev: number } | null;
    avgCompletionRate: { value: number; range: [number, number] } | null;
    commonFrequency: { value: string; frequency: number } | null;
    engagementCorrelation: string;
  } | null;
  successInsights: string[];
}

/**
 * Matching result
 */
export interface MatchingResult {
  matches: AnonymizedMatch[];
  patterns: PatternSummary;
  searchMetrics: {
    candidatesEvaluated: number;
    threshold: number;
    scope: SearchScope;
    latencyMs: number;
  };
}

/**
 * In-memory mock data store (production would use actual embeddings)
 */
const mockProfiles: RawMatch[] = [];
const profileOrgMap = new Map<string, string>();

/**
 * Scoring weights
 */
const WEIGHTS = {
  similarity: 0.5,
  recency: 0.3,
  completion: 0.2,
  ownOrgBonus: 0.2, // Multiplier bonus
};

/**
 * Generate anonymous ID from profile ID
 */
function generateAnonymousId(profileId: string): string {
  // Simple hash for demo - production would use crypto
  let hash = 0;
  for (let i = 0; i < profileId.length; i++) {
    const char = profileId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate recency score (more recent = higher score)
 */
function getRecencyScore(outcomeDate?: Date): number {
  if (!outcomeDate) return 0.5; // Default for unknown

  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - outcomeDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Score decreases with age, minimum 0.1
  if (daysSince <= 30) return 1.0;
  if (daysSince <= 90) return 0.9;
  if (daysSince <= 180) return 0.7;
  if (daysSince <= 365) return 0.5;
  return 0.3;
}

/**
 * Calculate composite score for a match
 */
function calculateCompositeScore(match: RawMatch): number {
  let score =
    match.similarity * WEIGHTS.similarity +
    getRecencyScore(match.outcomeRecordedAt) * WEIGHTS.recency +
    (match.metadata.completionRate || 0) * WEIGHTS.completion;

  // Apply own-organization bonus
  if (match.isOwnOrganization) {
    score *= 1 + WEIGHTS.ownOrgBonus;
  }

  return Math.min(1, score); // Cap at 1
}

/**
 * Calculate mean of numbers
 */
function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = mean(numbers);
  const squareDiffs = numbers.map((n) => Math.pow(n - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Find most common value (mode)
 */
function mode<T>(values: T[]): { value: T; frequency: number } | null {
  if (values.length === 0) return null;

  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  let maxCount = 0;
  let modeValue = values[0];
  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      modeValue = value;
    }
  }

  return { value: modeValue, frequency: maxCount / values.length };
}

/**
 * Analyze engagement correlation with success
 */
function analyzeEngagementCorrelation(matches: ScoredMatch[]): string {
  const engagementLevels = matches.map((m) =>
    m.metadata.cooperationLevel >= 0.7
      ? 'high'
      : m.metadata.cooperationLevel >= 0.4
        ? 'medium'
        : 'low'
  );

  const highEngagement = engagementLevels.filter((e) => e === 'high').length;
  const percentage = Math.round((highEngagement / engagementLevels.length) * 100);

  if (percentage >= 70) {
    return 'Strong positive correlation: high engagement leads to better outcomes';
  } else if (percentage >= 50) {
    return 'Moderate correlation: engagement helps but is not deterministic';
  } else {
    return 'Weak correlation: outcomes depend on other factors';
  }
}

/**
 * Generate success insights from matches
 */
function generateInsights(matches: ScoredMatch[]): string[] {
  const insights: string[] = [];

  if (matches.length === 0) {
    return ['No similar successful profiles found to generate insights'];
  }

  // Resolution time insight
  const resolutionDays = matches
    .map((m) => m.metadata.resolutionDays)
    .filter((d): d is number => d !== undefined);
  if (resolutionDays.length > 0) {
    const avgResolution = Math.round(mean(resolutionDays));
    insights.push(`Similar profiles resolved in an average of ${avgResolution} days`);
  }

  // Completion rate insight
  const completionRates = matches
    .map((m) => m.metadata.completionRate)
    .filter((r): r is number => r !== undefined);
  if (completionRates.length > 0) {
    const avgCompletion = Math.round(mean(completionRates) * 100);
    insights.push(`${avgCompletion}% of similar profiles completed their payment plans`);
  }

  // Common plan type insight
  const planTypes = matches
    .map((m) => m.metadata.planType)
    .filter((p): p is string => p !== undefined);
  if (planTypes.length > 0) {
    const commonPlan = mode(planTypes);
    if (commonPlan) {
      insights.push(
        `Most common successful approach: ${commonPlan.value} plan (${Math.round(commonPlan.frequency * 100)}% of cases)`
      );
    }
  }

  // Cooperation insight
  const avgCooperation = mean(matches.map((m) => m.metadata.cooperationLevel));
  if (avgCooperation >= 0.7) {
    insights.push('High cooperation levels correlate with successful resolutions');
  }

  return insights;
}

/**
 * Extract patterns from matches
 */
export function extractPatterns(matches: ScoredMatch[]): PatternSummary {
  if (matches.length === 0) {
    return {
      sampleSize: 0,
      confidence: 'low',
      patterns: null,
      successInsights: ['No similar profiles found'],
    };
  }

  const planTypes = matches
    .map((m) => m.metadata.planType)
    .filter((p): p is string => p !== undefined);

  const resolutionDays = matches
    .map((m) => m.metadata.resolutionDays)
    .filter((d): d is number => d !== undefined);

  const completionRates = matches
    .map((m) => m.metadata.completionRate)
    .filter((r): r is number => r !== undefined);

  const frequencies = matches
    .map((m) => m.metadata.frequency)
    .filter((f): f is string => f !== undefined);

  return {
    sampleSize: matches.length,
    confidence: matches.length >= 10 ? 'high' : matches.length >= 5 ? 'medium' : 'low',
    patterns: {
      commonPlanType: mode(planTypes),
      avgResolutionDays:
        resolutionDays.length > 0
          ? { value: mean(resolutionDays), stdDev: stdDev(resolutionDays) }
          : null,
      avgCompletionRate:
        completionRates.length > 0
          ? {
              value: mean(completionRates),
              range: [Math.min(...completionRates), Math.max(...completionRates)],
            }
          : null,
      commonFrequency: mode(frequencies),
      engagementCorrelation: analyzeEngagementCorrelation(matches),
    },
    successInsights: generateInsights(matches),
  };
}

/**
 * Anonymize a match for API response
 */
function anonymizeMatch(match: ScoredMatch): AnonymizedMatch {
  return {
    matchId: generateAnonymousId(match.profileId),
    similarity: Math.round(match.similarity * 1000) / 1000,
    compositeScore: Math.round(match.compositeScore * 1000) / 1000,
    metadata: {
      debtRange: match.metadata.debtRange,
      incomeRange: match.metadata.incomeRange,
      resolutionDays: match.metadata.resolutionDays,
      planType: match.metadata.planType,
      completionRate: match.metadata.completionRate,
    },
    isOwnOrganization: match.isOwnOrganization,
  };
}

/**
 * Mock search function (production would use actual pgvector)
 */
async function searchSimilar(
  _embedding: number[],
  options: {
    organizationId?: string;
    excludeOrganizationId?: string;
    topK: number;
    minSimilarity: number;
    successOnly: boolean;
  }
): Promise<RawMatch[]> {
  // In production, this would be a pgvector query
  // For now, return mock data based on filters

  let results = [...mockProfiles];

  // Filter by organization
  if (options.organizationId) {
    results = results.filter((r) => r.organizationId === options.organizationId);
  }
  if (options.excludeOrganizationId) {
    results = results.filter((r) => r.organizationId !== options.excludeOrganizationId);
  }

  // Filter by success
  if (options.successOnly) {
    results = results.filter((r) => r.metadata.outcome === 'resolved');
  }

  // Filter by similarity
  results = results.filter((r) => r.similarity >= options.minSimilarity);

  // Sort by similarity and take top K
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, options.topK);
}

/**
 * Find similar profiles for a given profile
 */
export async function findSimilarProfiles(
  profileId: string,
  embedding: number[],
  organizationId: string,
  options: Partial<MatchOptions> = {}
): Promise<MatchingResult> {
  const startTime = Date.now();

  const opts: MatchOptions = { ...DEFAULT_MATCH_OPTIONS, ...options };
  const threshold = THRESHOLDS[opts.threshold];

  let matches: RawMatch[] = [];

  // Search based on scope
  if (opts.scope === 'own' || opts.scope === 'hybrid') {
    const ownMatches = await searchSimilar(embedding, {
      organizationId,
      topK: opts.scope === 'hybrid' ? Math.ceil(opts.topK / 2) : opts.topK,
      minSimilarity: threshold,
      successOnly: opts.successOnly,
    });
    matches.push(
      ...ownMatches.map((m) => ({ ...m, isOwnOrganization: true }))
    );
  }

  if (opts.scope === 'global' || opts.scope === 'hybrid') {
    const globalMatches = await searchSimilar(embedding, {
      excludeOrganizationId: organizationId,
      topK: opts.scope === 'hybrid' ? opts.topK - matches.length : opts.topK,
      minSimilarity: threshold,
      successOnly: opts.successOnly,
    });
    matches.push(
      ...globalMatches.map((m) => ({ ...m, isOwnOrganization: false }))
    );
  }

  // Calculate composite scores
  const scoredMatches: ScoredMatch[] = matches.map((m) => ({
    ...m,
    compositeScore: calculateCompositeScore(m),
  }));

  // Sort by composite score
  scoredMatches.sort((a, b) => b.compositeScore - a.compositeScore);

  // Take top K
  const topMatches = scoredMatches.slice(0, opts.topK);

  // Extract patterns
  const patterns = extractPatterns(topMatches);

  // Anonymize matches
  const anonymizedMatches = topMatches.map(anonymizeMatch);

  const latencyMs = Date.now() - startTime;

  return {
    matches: anonymizedMatches,
    patterns,
    searchMetrics: {
      candidatesEvaluated: matches.length,
      threshold,
      scope: opts.scope,
      latencyMs,
    },
  };
}

/**
 * Find similar profiles by embedding only (for new profiles)
 */
export async function findSimilarByEmbedding(
  embedding: number[],
  organizationId: string,
  options: Partial<MatchOptions> = {}
): Promise<MatchingResult> {
  return findSimilarProfiles('new', embedding, organizationId, options);
}

/**
 * Add mock profile for testing
 */
export function addMockProfile(profile: RawMatch): void {
  mockProfiles.push(profile);
}

/**
 * Clear mock profiles
 */
export function clearMockProfiles(): void {
  mockProfiles.length = 0;
}

/**
 * Get profile organization mapping
 */
export function setProfileOrganization(profileId: string, orgId: string): void {
  profileOrgMap.set(profileId, orgId);
}

export default {
  findSimilarProfiles,
  findSimilarByEmbedding,
  extractPatterns,
  addMockProfile,
  clearMockProfiles,
  setProfileOrganization,
  THRESHOLDS,
  DEFAULT_MATCH_OPTIONS,
};
