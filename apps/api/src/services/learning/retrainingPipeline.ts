/**
 * Retraining Pipeline Service
 * Handles batch embedding regeneration and model retraining triggers
 */

import { getRecentMetrics, shouldTriggerRetraining } from './performanceTracker';
import { batchUpdateEmbeddings } from './embeddingUpdater';
import { getOutcomesByDateRange, PlanOutcome } from './outcomeCapture';

// In-memory store for retraining runs (use database in production)
const retrainingStore = new Map<string, RetrainingRun>();

export type RetrainingStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type TriggerReason =
  | 'SCHEDULED'
  | 'PERFORMANCE_DEGRADATION'
  | 'VOLUME_THRESHOLD'
  | 'MANUAL'
  | 'BIAS_DETECTED';

export interface RetrainingRun {
  id: string;
  triggerReason: TriggerReason;
  status: RetrainingStatus;
  profilesUpdated?: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RetrainingConfig {
  // Scheduled retraining interval in days
  scheduledIntervalDays: number;
  // Minimum accuracy threshold to trigger retraining
  accuracyThreshold: number;
  // Number of new outcomes to trigger volume-based retraining
  volumeThreshold: number;
  // Batch size for embedding updates
  batchSize: number;
  // Maximum concurrent updates
  maxConcurrent: number;
}

const DEFAULT_CONFIG: RetrainingConfig = {
  scheduledIntervalDays: 7,
  accuracyThreshold: 0.55,
  volumeThreshold: 100,
  batchSize: 50,
  maxConcurrent: 5,
};

let currentConfig = { ...DEFAULT_CONFIG };

/**
 * Check if retraining should be triggered
 */
export async function checkRetrainingNeeded(): Promise<{
  needed: boolean;
  reason?: TriggerReason;
  details?: string;
}> {
  // Check performance-based trigger
  const performanceCheck = await shouldTriggerRetraining();
  if (performanceCheck.shouldRetrain) {
    return {
      needed: true,
      reason: 'PERFORMANCE_DEGRADATION',
      details: performanceCheck.reason,
    };
  }

  // Check volume-based trigger
  const recentOutcomes = await getOutcomesByDateRange(
    new Date(Date.now() - currentConfig.scheduledIntervalDays * 24 * 60 * 60 * 1000),
    new Date()
  );

  if (recentOutcomes.length >= currentConfig.volumeThreshold) {
    return {
      needed: true,
      reason: 'VOLUME_THRESHOLD',
      details: `${recentOutcomes.length} new outcomes since last retraining`,
    };
  }

  // Check scheduled trigger
  const lastRun = await getLastSuccessfulRun();
  if (lastRun) {
    const daysSinceLastRun = Math.floor(
      (Date.now() - lastRun.completedAt!.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceLastRun >= currentConfig.scheduledIntervalDays) {
      return {
        needed: true,
        reason: 'SCHEDULED',
        details: `${daysSinceLastRun} days since last retraining`,
      };
    }
  }

  return { needed: false };
}

/**
 * Trigger retraining pipeline
 */
export async function triggerRetraining(reason: TriggerReason): Promise<RetrainingRun> {
  // Check if already running
  const runningRun = await getRunningRun();
  if (runningRun) {
    throw new Error(`Retraining already in progress: ${runningRun.id}`);
  }

  // Create new run
  const run: RetrainingRun = {
    id: generateId(),
    triggerReason: reason,
    status: 'PENDING',
    createdAt: new Date(),
  };

  retrainingStore.set(run.id, run);

  // Start execution asynchronously
  executeRetraining(run.id).catch((error) => {
    console.error(`Retraining ${run.id} failed:`, error);
  });

  return run;
}

/**
 * Execute retraining pipeline
 */
async function executeRetraining(runId: string): Promise<void> {
  const run = retrainingStore.get(runId);
  if (!run) return;

  try {
    // Update status to running
    run.status = 'RUNNING';
    run.startedAt = new Date();
    retrainingStore.set(runId, run);

    // Get profiles that need embedding updates
    const outcomesNeedingUpdate = await getOutcomesForRetraining();

    // Process in batches
    let totalUpdated = 0;
    const batchSize = currentConfig.batchSize;

    for (let i = 0; i < outcomesNeedingUpdate.length; i += batchSize) {
      const batch = outcomesNeedingUpdate.slice(i, i + batchSize);
      const result = await batchUpdateEmbeddings(batch);
      totalUpdated += result.updated;

      if (result.failed > 0) {
        console.warn(`Batch ${i / batchSize + 1}: ${result.failed} failures`, result.errors);
      }
    }

    // Update run status
    run.status = 'COMPLETED';
    run.profilesUpdated = totalUpdated;
    run.completedAt = new Date();
    run.metadata = {
      totalOutcomes: outcomesNeedingUpdate.length,
      batchesProcessed: Math.ceil(outcomesNeedingUpdate.length / batchSize),
    };

    retrainingStore.set(runId, run);
  } catch (error) {
    run.status = 'FAILED';
    run.errorMessage = error instanceof Error ? error.message : String(error);
    run.completedAt = new Date();
    retrainingStore.set(runId, run);
    throw error;
  }
}

/**
 * Get outcomes that need embedding updates
 */
async function getOutcomesForRetraining(): Promise<PlanOutcome[]> {
  const lastRun = await getLastSuccessfulRun();
  const startDate = lastRun?.completedAt || new Date(0);

  return getOutcomesByDateRange(startDate, new Date());
}

/**
 * Get retraining run by ID
 */
export async function getRetrainingRun(runId: string): Promise<RetrainingRun | null> {
  return retrainingStore.get(runId) || null;
}

/**
 * Get last successful retraining run
 */
export async function getLastSuccessfulRun(): Promise<RetrainingRun | null> {
  const runs = Array.from(retrainingStore.values())
    .filter((r) => r.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

  return runs[0] || null;
}

/**
 * Get currently running retraining
 */
export async function getRunningRun(): Promise<RetrainingRun | null> {
  for (const run of retrainingStore.values()) {
    if (run.status === 'RUNNING') {
      return run;
    }
  }
  return null;
}

/**
 * Get all retraining runs
 */
export async function getRetrainingRuns(options?: {
  status?: RetrainingStatus;
  limit?: number;
}): Promise<RetrainingRun[]> {
  let runs = Array.from(retrainingStore.values());

  if (options?.status) {
    runs = runs.filter((r) => r.status === options.status);
  }

  runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    runs = runs.slice(0, options.limit);
  }

  return runs;
}

/**
 * Cancel a pending or running retraining
 */
export async function cancelRetraining(runId: string): Promise<boolean> {
  const run = retrainingStore.get(runId);
  if (!run) return false;

  if (run.status === 'PENDING' || run.status === 'RUNNING') {
    run.status = 'FAILED';
    run.errorMessage = 'Cancelled by user';
    run.completedAt = new Date();
    retrainingStore.set(runId, run);
    return true;
  }

  return false;
}

/**
 * Get retraining configuration
 */
export function getRetrainingConfig(): RetrainingConfig {
  return { ...currentConfig };
}

/**
 * Update retraining configuration
 */
export function updateRetrainingConfig(updates: Partial<RetrainingConfig>): RetrainingConfig {
  currentConfig = { ...currentConfig, ...updates };
  return { ...currentConfig };
}

/**
 * Get retraining statistics
 */
export async function getRetrainingStats(): Promise<{
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalProfilesUpdated: number;
  avgRunDuration: number;
  lastRunDate?: Date;
}> {
  const runs = Array.from(retrainingStore.values());
  const completedRuns = runs.filter((r) => r.status === 'COMPLETED');
  const failedRuns = runs.filter((r) => r.status === 'FAILED');

  const durations = completedRuns
    .filter((r) => r.startedAt && r.completedAt)
    .map((r) => r.completedAt!.getTime() - r.startedAt!.getTime());

  const lastRun = await getLastSuccessfulRun();

  return {
    totalRuns: runs.length,
    completedRuns: completedRuns.length,
    failedRuns: failedRuns.length,
    totalProfilesUpdated: completedRuns.reduce((sum, r) => sum + (r.profilesUpdated || 0), 0),
    avgRunDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    lastRunDate: lastRun?.completedAt,
  };
}

/**
 * Scheduled retraining check (to be called by Lambda)
 */
export async function scheduledRetrainingCheck(): Promise<{
  checked: boolean;
  triggered: boolean;
  runId?: string;
  reason?: TriggerReason;
}> {
  const check = await checkRetrainingNeeded();

  if (check.needed && check.reason) {
    const run = await triggerRetraining(check.reason);
    return {
      checked: true,
      triggered: true,
      runId: run.id,
      reason: check.reason,
    };
  }

  return {
    checked: true,
    triggered: false,
  };
}

function generateId(): string {
  return `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
