/**
 * Rewrite Tracking Service
 * Tracks accepted suggestions for learning and improvement
 */

import { RewriteSuggestion } from './messageRewriter';

/**
 * Tracked rewrite record
 */
export interface TrackedRewrite {
  id: string;
  originalMessage: string;
  suggestedRewrites: RewriteSuggestion[];
  acceptedRewrite: string | null;
  acceptedSuggestionId: string | null;
  userId: string;
  userRole: 'ATTORNEY' | 'PARALEGAL' | 'DEBTOR' | 'PUBLIC_DEFENDER';
  wasEdited: boolean; // Did user modify the suggestion after accepting
  createdAt: Date;
  acceptedAt: Date | null;
}

/**
 * Pattern learned from accepted rewrites
 */
export interface LearnedPattern {
  originalPattern: string; // Regex pattern matching original messages
  successfulRewrites: string[];
  acceptanceCount: number;
  averageWarmthImprovement: number;
  lastUsed: Date;
}

// In-memory stores (would use database in production)
const trackedRewrites: Map<string, TrackedRewrite> = new Map();
const learnedPatterns: Map<string, LearnedPattern> = new Map();

/**
 * Track a rewrite request
 */
export function trackRewriteRequest(
  userId: string,
  userRole: TrackedRewrite['userRole'],
  originalMessage: string,
  suggestions: RewriteSuggestion[]
): string {
  const trackId = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const record: TrackedRewrite = {
    id: trackId,
    originalMessage,
    suggestedRewrites: suggestions,
    acceptedRewrite: null,
    acceptedSuggestionId: null,
    userId,
    userRole,
    wasEdited: false,
    createdAt: new Date(),
    acceptedAt: null,
  };

  trackedRewrites.set(trackId, record);
  return trackId;
}

/**
 * Record when a user accepts a suggestion
 */
export function recordAcceptance(
  originalContent: string,
  acceptedSuggestionId: string,
  acceptedText: string,
  userId: string
): { tracked: boolean; wasEdited: boolean } {
  // Find the tracking record
  let foundRecord: TrackedRewrite | undefined;
  for (const record of trackedRewrites.values()) {
    if (record.originalMessage === originalContent && record.userId === userId) {
      foundRecord = record;
      break;
    }
  }

  if (!foundRecord) {
    // Create a new record if not found
    const trackId = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    foundRecord = {
      id: trackId,
      originalMessage: originalContent,
      suggestedRewrites: [],
      acceptedRewrite: acceptedText,
      acceptedSuggestionId,
      userId,
      userRole: 'DEBTOR', // Default, would be determined from auth
      wasEdited: false,
      createdAt: new Date(),
      acceptedAt: new Date(),
    };
    trackedRewrites.set(trackId, foundRecord);
  }

  // Find the original suggestion to check if edited
  const originalSuggestion = foundRecord.suggestedRewrites.find((s) => s.id === acceptedSuggestionId);

  const wasEdited = originalSuggestion
    ? normalizeText(originalSuggestion.suggestedText) !== normalizeText(acceptedText)
    : false;

  // Update the record
  foundRecord.acceptedRewrite = acceptedText;
  foundRecord.acceptedSuggestionId = acceptedSuggestionId;
  foundRecord.wasEdited = wasEdited;
  foundRecord.acceptedAt = new Date();

  // Update learned patterns
  if (originalSuggestion && !wasEdited) {
    updateLearnedPatterns(foundRecord.originalMessage, acceptedText, originalSuggestion.warmthImprovement);
  }

  return { tracked: true, wasEdited };
}

/**
 * Update learned patterns from accepted rewrites
 */
function updateLearnedPatterns(original: string, rewrite: string, warmthImprovement: number): void {
  // Extract patterns from the original message
  const patterns = extractPatterns(original);

  for (const pattern of patterns) {
    const existing = learnedPatterns.get(pattern);

    if (existing) {
      existing.successfulRewrites.push(rewrite);
      existing.acceptanceCount++;
      existing.averageWarmthImprovement =
        (existing.averageWarmthImprovement * (existing.acceptanceCount - 1) + warmthImprovement) /
        existing.acceptanceCount;
      existing.lastUsed = new Date();
    } else {
      learnedPatterns.set(pattern, {
        originalPattern: pattern,
        successfulRewrites: [rewrite],
        acceptanceCount: 1,
        averageWarmthImprovement: warmthImprovement,
        lastUsed: new Date(),
      });
    }
  }
}

/**
 * Extract reusable patterns from a message
 */
function extractPatterns(message: string): string[] {
  const patterns: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Known problematic patterns
  const knownPatterns = [
    'final warning',
    'last chance',
    'immediately',
    'right now',
    'or else',
    'you must',
    'you need to',
    'pay now',
    'contact us immediately',
    'overdue',
    'delinquent',
  ];

  for (const pattern of knownPatterns) {
    if (lowerMessage.includes(pattern)) {
      patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Get acceptance statistics for learning
 */
export function getAcceptanceStats(): {
  totalRequests: number;
  acceptedCount: number;
  editedCount: number;
  acceptanceRate: number;
  mostEffectivePatterns: LearnedPattern[];
} {
  const records = Array.from(trackedRewrites.values());
  const acceptedRecords = records.filter((r) => r.acceptedRewrite !== null);
  const editedRecords = acceptedRecords.filter((r) => r.wasEdited);

  const patterns = Array.from(learnedPatterns.values()).sort(
    (a, b) => b.acceptanceCount - a.acceptanceCount
  );

  return {
    totalRequests: records.length,
    acceptedCount: acceptedRecords.length,
    editedCount: editedRecords.length,
    acceptanceRate: records.length > 0 ? acceptedRecords.length / records.length : 0,
    mostEffectivePatterns: patterns.slice(0, 10),
  };
}

/**
 * Get rewrite history for a user (anonymized)
 */
export function getUserRewriteHistory(userId: string, limit = 10): TrackedRewrite[] {
  const records = Array.from(trackedRewrites.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  return records;
}

/**
 * Clear old tracking data (for privacy)
 */
export function clearOldData(olderThanDays = 90): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  let cleared = 0;
  for (const [id, record] of trackedRewrites) {
    if (record.createdAt < cutoff) {
      trackedRewrites.delete(id);
      cleared++;
    }
  }

  return cleared;
}
