/**
 * Comfort Tracker Service
 * Aggregates and tracks debtor comfort/stress levels over time
 */

import { analyzeSentiment, calculateAggregateStress, type SentimentResult } from '../ai/sentimentAnalyzer';
import {
  classifyIntention,
  updateIntention,
  type IntentionResult,
  INTENTION_CATEGORIES,
} from '../ai/intentionClassifier';
import { checkEscalationTriggers, checkStressEscalation, type EscalationResult } from './escalationService';

// Comfort assessment data structure
export interface ComfortAssessment {
  sentimentHistory: SentimentResult[];
  currentStressLevel: number;
  intention: IntentionResult;
  readinessScore: number;
  lastAssessed: Date;
  escalationHistory: EscalationResult[];
}

// Interaction types for tracking
export type InteractionType = 'message' | 'assessment_response' | 'page_view' | 'action';

// Interaction record
export interface InteractionRecord {
  type: InteractionType;
  content?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// In-memory store for development (would use database in production)
const comfortData = new Map<string, ComfortAssessment>();

/**
 * Get default comfort assessment
 */
function getDefaultAssessment(): ComfortAssessment {
  return {
    sentimentHistory: [],
    currentStressLevel: 3, // Moderate (neutral)
    intention: {
      primaryIntention: INTENTION_CATEGORIES.UNKNOWN,
      secondaryIntention: null,
      confidence: 0,
      signals: [],
      suggestedApproach: 'Gather more information through conversation.',
    },
    readinessScore: 0,
    lastAssessed: new Date(),
    escalationHistory: [],
  };
}

/**
 * Get comfort assessment for a debtor
 */
export function getComfortAssessment(debtorProfileId: string): ComfortAssessment {
  return comfortData.get(debtorProfileId) || getDefaultAssessment();
}

/**
 * Process an interaction and update comfort assessment
 */
export async function processInteraction(
  debtorProfileId: string,
  interaction: InteractionRecord
): Promise<{
  assessment: ComfortAssessment;
  escalation: EscalationResult | null;
}> {
  let assessment = getComfortAssessment(debtorProfileId);
  let escalation: EscalationResult | null = null;

  // Only analyze text-based interactions
  if (interaction.content && (interaction.type === 'message' || interaction.type === 'assessment_response')) {
    // Check for escalation triggers first
    escalation = checkEscalationTriggers(interaction.content);

    // Analyze sentiment - convert type to AnalysisContext
    const contextType = interaction.type === 'message' ? 'message' : 'assessment';
    const sentiment = await analyzeSentiment(interaction.content, contextType);

    // Add to history (keep last 20)
    assessment.sentimentHistory = [...assessment.sentimentHistory.slice(-19), sentiment];

    // Update stress level
    assessment.currentStressLevel = calculateAggregateStress(assessment.sentimentHistory);

    // Check for stress-based escalation
    if (!escalation?.triggered) {
      const stressEscalation = checkStressEscalation(
        assessment.sentimentHistory.map((s) => s.stressIndicator)
      );
      if (stressEscalation.triggered) {
        escalation = stressEscalation;
      }
    }

    // Update intention
    const newIntention = await classifyIntention(interaction.content, {
      stressLevel: assessment.currentStressLevel,
    });
    assessment.intention = updateIntention(assessment.intention, newIntention);

    // Record escalation if triggered
    if (escalation?.triggered) {
      assessment.escalationHistory = [...assessment.escalationHistory.slice(-9), escalation];
    }
  }

  // Update timestamp
  assessment.lastAssessed = new Date();

  // Save assessment
  comfortData.set(debtorProfileId, assessment);

  return { assessment, escalation };
}

/**
 * Update readiness score based on profile data
 */
export function updateReadinessScore(
  debtorProfileId: string,
  profileData: {
    profileComplete: boolean;
    assessmentComplete: boolean;
    responseRate: number; // 0-1
    timeOnPlatform: number; // minutes
    actionsCount: number;
    viewedOptions: boolean;
    startedNegotiation: boolean;
  }
): number {
  let assessment = getComfortAssessment(debtorProfileId);

  // Calculate readiness score (0-100)
  let score = 0;

  // Profile completeness (0-20)
  score += profileData.profileComplete ? 20 : 10;

  // Assessment completion (0-15)
  score += profileData.assessmentComplete ? 15 : 0;

  // Response rate (0-15)
  score += Math.round(profileData.responseRate * 15);

  // Time engagement (0-15)
  score += Math.min(15, Math.round(profileData.timeOnPlatform / 5));

  // Actions taken (0-15)
  score += Math.min(15, profileData.actionsCount * 3);

  // Viewed payment options (0-10)
  score += profileData.viewedOptions ? 10 : 0;

  // Started negotiation (0-10)
  score += profileData.startedNegotiation ? 10 : 0;

  assessment.readinessScore = Math.min(100, score);

  // Save assessment
  comfortData.set(debtorProfileId, assessment);

  return assessment.readinessScore;
}

/**
 * Get readiness category from score
 */
export function getReadinessCategory(score: number): 'not_ready' | 'warming_up' | 'ready_to_engage' {
  if (score >= 60) return 'ready_to_engage';
  if (score >= 30) return 'warming_up';
  return 'not_ready';
}

/**
 * Get debtor insights for creditor view (sanitized)
 */
export function getDebtorInsights(debtorProfileId: string): {
  intention: string;
  intentionDescription: string;
  readiness: 'not_ready' | 'warming_up' | 'ready_to_engage';
  readinessScore: number;
  suggestedApproach: string;
  needsSupport: boolean;
  lastActivity: string;
} {
  const assessment = getComfortAssessment(debtorProfileId);

  return {
    intention: assessment.intention.primaryIntention,
    intentionDescription: assessment.intention.suggestedApproach,
    readiness: getReadinessCategory(assessment.readinessScore),
    readinessScore: assessment.readinessScore,
    suggestedApproach: assessment.intention.suggestedApproach,
    // Only show "needs support" flag, not actual stress level
    needsSupport: assessment.currentStressLevel <= 2,
    lastActivity: assessment.lastAssessed.toISOString(),
  };
}

/**
 * Clear comfort data for a debtor (for data deletion requests)
 */
export function clearComfortData(debtorProfileId: string): void {
  comfortData.delete(debtorProfileId);
}
