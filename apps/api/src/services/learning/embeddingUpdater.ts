/**
 * Embedding Updater Service
 * Updates embeddings when outcomes are captured
 */

import { PlanOutcome, createOutcomeSnapshot } from './outcomeCapture';

// In-memory store for embedding updates (use database in production)
const updateStore = new Map<string, EmbeddingUpdate>();

export const EMBEDDING_MODEL_VERSION = '1.0.0';

export interface ProfileEmbedding {
  id: string;
  debtorProfileId: string;
  embeddingVector: number[];
  profileSnapshot: ProfileSnapshot;
  outcome?: string;
  outcomeRecordedAt?: Date;
  modelVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileSnapshot {
  debt_range: string;
  debt_age_months: number;
  income_range: string;
  expense_ratio: string;
  response_time_category: string;
  communication_frequency: string;
  stress_level: string;
  cooperation_level: string;
  outcome?: string;
  resolution_days?: number;
  collection_rate?: number;
  on_time_rate?: number;
  plan_type?: string;
}

export interface EmbeddingUpdate {
  id: string;
  profileEmbeddingId: string;
  updateReason: 'OUTCOME_CAPTURED' | 'PROFILE_CHANGED' | 'MODEL_UPDATE' | 'RETRAINING';
  previousVersion: string;
  newVersion: string;
  outcomeId?: string;
  createdAt: Date;
}

export interface DebtorProfile {
  id: string;
  debtAmount: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  debtAgeMonths: number;
  responseTimeAvg?: number;
  messageCount?: number;
  stressIndicator?: number;
  cooperationScore?: number;
}

// Mock embedding store for development
const embeddingStore = new Map<string, ProfileEmbedding>();

/**
 * Update embedding with outcome data
 */
export async function updateEmbeddingWithOutcome(outcome: PlanOutcome): Promise<void> {
  // Get current embedding record
  const embeddingRecord = await getProfileEmbedding(outcome.debtorProfileId);

  if (!embeddingRecord) {
    console.warn(`No embedding found for profile ${outcome.debtorProfileId}`);
    return;
  }

  // Update profile snapshot with outcome
  const outcomeSnapshot = createOutcomeSnapshot(outcome);
  const updatedSnapshot: ProfileSnapshot = {
    ...embeddingRecord.profileSnapshot,
    outcome: outcome.outcomeType.toLowerCase(),
    resolution_days: outcome.resolutionDays,
    collection_rate: outcome.collectionRate,
    on_time_rate: outcome.onTimePaymentRate,
    plan_type: outcome.planType,
  };

  // Generate new embedding with outcome context
  const description = prepareProfileDescriptionWithOutcome(updatedSnapshot);
  const newEmbedding = await generateEmbeddingVector(description);

  // Update embedding record
  const updatedEmbedding: ProfileEmbedding = {
    ...embeddingRecord,
    embeddingVector: newEmbedding,
    profileSnapshot: updatedSnapshot,
    outcome: outcome.outcomeType,
    outcomeRecordedAt: new Date(),
    modelVersion: EMBEDDING_MODEL_VERSION,
    updatedAt: new Date(),
  };

  embeddingStore.set(outcome.debtorProfileId, updatedEmbedding);

  // Log the update
  const update: EmbeddingUpdate = {
    id: generateId(),
    profileEmbeddingId: embeddingRecord.id,
    updateReason: 'OUTCOME_CAPTURED',
    previousVersion: embeddingRecord.modelVersion,
    newVersion: EMBEDDING_MODEL_VERSION,
    outcomeId: outcome.id,
    createdAt: new Date(),
  };

  updateStore.set(update.id, update);
}

/**
 * Prepare profile description with outcome for embedding
 */
export function prepareProfileDescriptionWithOutcome(snapshot: ProfileSnapshot): string {
  const parts = [
    `Debt situation: ${snapshot.debt_range} range, ${snapshot.debt_age_months} months old`,
    `Financial capacity: ${snapshot.income_range} income, ${snapshot.expense_ratio} expense ratio`,
    `Engagement: ${snapshot.response_time_category}, ${snapshot.communication_frequency}`,
    `Emotional state: ${snapshot.stress_level} stress, ${snapshot.cooperation_level} cooperation`,
  ];

  if (snapshot.outcome) {
    parts.push(`Outcome: ${snapshot.outcome}, resolved in ${snapshot.resolution_days} days`);
    if (snapshot.collection_rate !== undefined) {
      parts.push(`Collection rate: ${(snapshot.collection_rate * 100).toFixed(0)}%`);
    }
    if (snapshot.on_time_rate !== undefined) {
      parts.push(`On-time payment rate: ${(snapshot.on_time_rate * 100).toFixed(0)}%`);
    }
    if (snapshot.plan_type) {
      parts.push(`Plan type used: ${snapshot.plan_type}`);
    }
  }

  return parts.join('\n').trim();
}

/**
 * Generate embedding vector (mock for development)
 */
async function generateEmbeddingVector(description: string): Promise<number[]> {
  // Mock implementation - in production, call Bedrock Titan
  // Generate a deterministic-ish vector based on description
  const vector: number[] = [];
  let hash = 0;
  for (let i = 0; i < description.length; i++) {
    hash = (hash * 31 + description.charCodeAt(i)) % 1000000;
  }

  for (let i = 0; i < 1536; i++) {
    // Seeded pseudo-random
    hash = (hash * 1103515245 + 12345) % 2147483648;
    vector.push((hash / 2147483648) * 2 - 1);
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

/**
 * Get profile embedding
 */
export async function getProfileEmbedding(profileId: string): Promise<ProfileEmbedding | null> {
  return embeddingStore.get(profileId) || null;
}

/**
 * Create or update profile embedding
 */
export async function upsertProfileEmbedding(
  profileId: string,
  profile: DebtorProfile
): Promise<ProfileEmbedding> {
  const snapshot = createProfileSnapshot(profile);
  const description = prepareProfileDescriptionWithOutcome(snapshot);
  const vector = await generateEmbeddingVector(description);

  const existing = embeddingStore.get(profileId);

  const embedding: ProfileEmbedding = {
    id: existing?.id || generateId(),
    debtorProfileId: profileId,
    embeddingVector: vector,
    profileSnapshot: snapshot,
    outcome: existing?.outcome,
    outcomeRecordedAt: existing?.outcomeRecordedAt,
    modelVersion: EMBEDDING_MODEL_VERSION,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  embeddingStore.set(profileId, embedding);
  return embedding;
}

/**
 * Create profile snapshot from debtor profile
 */
function createProfileSnapshot(profile: DebtorProfile): ProfileSnapshot {
  return {
    debt_range: categorizeDebtRange(profile.debtAmount),
    debt_age_months: profile.debtAgeMonths,
    income_range: categorizeIncomeRange(profile.monthlyIncome),
    expense_ratio: categorizeExpenseRatio(profile.monthlyIncome, profile.monthlyExpenses),
    response_time_category: categorizeResponseTime(profile.responseTimeAvg),
    communication_frequency: categorizeCommunicationFrequency(profile.messageCount),
    stress_level: categorizeStressLevel(profile.stressIndicator),
    cooperation_level: categorizeCooperationLevel(profile.cooperationScore),
  };
}

function categorizeDebtRange(amount: number): string {
  if (amount <= 1000) return '0-1000';
  if (amount <= 5000) return '1000-5000';
  if (amount <= 10000) return '5000-10000';
  if (amount <= 25000) return '10000-25000';
  return '25000+';
}

function categorizeIncomeRange(income?: number): string {
  if (!income) return 'unknown';
  if (income <= 2000) return 'low';
  if (income <= 5000) return 'medium';
  if (income <= 10000) return 'high';
  return 'very_high';
}

function categorizeExpenseRatio(income?: number, expenses?: number): string {
  if (!income || !expenses) return 'unknown';
  const ratio = expenses / income;
  if (ratio <= 0.5) return 'low';
  if (ratio <= 0.75) return 'moderate';
  if (ratio <= 0.9) return 'high';
  return 'critical';
}

function categorizeResponseTime(avgHours?: number): string {
  if (!avgHours) return 'unknown';
  if (avgHours <= 4) return 'very_fast';
  if (avgHours <= 24) return 'fast';
  if (avgHours <= 72) return 'moderate';
  return 'slow';
}

function categorizeCommunicationFrequency(messageCount?: number): string {
  if (!messageCount) return 'unknown';
  if (messageCount <= 3) return 'minimal';
  if (messageCount <= 10) return 'moderate';
  if (messageCount <= 25) return 'frequent';
  return 'very_frequent';
}

function categorizeStressLevel(indicator?: number): string {
  if (!indicator) return 'unknown';
  if (indicator <= 0.25) return 'low';
  if (indicator <= 0.5) return 'moderate';
  if (indicator <= 0.75) return 'high';
  return 'severe';
}

function categorizeCooperationLevel(score?: number): string {
  if (!score) return 'unknown';
  if (score <= 0.25) return 'resistant';
  if (score <= 0.5) return 'reluctant';
  if (score <= 0.75) return 'cooperative';
  return 'very_cooperative';
}

/**
 * Batch update embeddings for profiles with new outcomes
 */
export async function batchUpdateEmbeddings(outcomes: PlanOutcome[]): Promise<{
  updated: number;
  failed: number;
  errors: string[];
}> {
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const outcome of outcomes) {
    try {
      await updateEmbeddingWithOutcome(outcome);
      updated++;
    } catch (error) {
      failed++;
      errors.push(`Failed to update embedding for profile ${outcome.debtorProfileId}: ${error}`);
    }
  }

  return { updated, failed, errors };
}

/**
 * Get embedding updates for a profile
 */
export async function getEmbeddingUpdates(profileId: string): Promise<EmbeddingUpdate[]> {
  const embedding = embeddingStore.get(profileId);
  if (!embedding) return [];

  const updates: EmbeddingUpdate[] = [];
  for (const update of updateStore.values()) {
    if (update.profileEmbeddingId === embedding.id) {
      updates.push(update);
    }
  }

  return updates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all embeddings that need outcome updates
 */
export async function getEmbeddingsWithoutOutcome(): Promise<ProfileEmbedding[]> {
  const embeddings: ProfileEmbedding[] = [];
  for (const embedding of embeddingStore.values()) {
    if (!embedding.outcome) {
      embeddings.push(embedding);
    }
  }
  return embeddings;
}

/**
 * Version tracking for model updates
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
}

function generateId(): string {
  return `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
