/**
 * Embeddings API Handler
 * Endpoints for profile embedding generation and management
 */

import { Request, Response } from 'express';
import {
  createProfileEmbedding,
  getProfileEmbedding,
  getEmbeddingsStats,
  getAllEmbeddings,
  EMBEDDING_CONFIG,
} from '../services/embeddings/embeddingGenerator';
import { ProfileData } from '../services/embeddings/profileNormalizer';

/**
 * Batch job status tracking
 */
interface BatchJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  processed: number;
  total: number;
  errors: number;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * In-memory batch job store
 */
const batchJobsStore = new Map<string, BatchJob>();

/**
 * Generate unique ID
 */
function generateId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate embedding for a specific profile
 * POST /api/v1/profiles/:profileId/embedding
 */
export async function generateForProfile(req: Request, res: Response): Promise<void> {
  try {
    const { profileId } = req.params;
    const profileData = req.body as ProfileData;

    // Validate required data
    if (!profileData.caseId || profileData.debtAmount === undefined) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'caseId and debtAmount are required',
      });
      return;
    }

    // Check if embedding already exists
    const existing = await getProfileEmbedding(profileId);

    // Create or update embedding
    const embedding = await createProfileEmbedding(profileId, profileData);

    res.status(existing ? 200 : 201).json({
      data: {
        id: embedding.id,
        debtorProfileId: embedding.debtorProfileId,
        modelVersion: embedding.modelVersion,
        dimensions: embedding.embeddingVector.length,
        hasOutcome: !!embedding.outcome,
        createdAt: embedding.createdAt.toISOString(),
        updatedAt: embedding.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate embedding',
    });
  }
}

/**
 * Get embedding for a specific profile
 * GET /api/v1/profiles/:profileId/embedding
 */
export async function getForProfile(req: Request, res: Response): Promise<void> {
  try {
    const { profileId } = req.params;
    const includeVector = req.query.includeVector === 'true';

    const embedding = await getProfileEmbedding(profileId);

    if (!embedding) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Embedding not found for profile',
      });
      return;
    }

    res.json({
      data: {
        id: embedding.id,
        debtorProfileId: embedding.debtorProfileId,
        modelVersion: embedding.modelVersion,
        dimensions: embedding.embeddingVector.length,
        hasOutcome: !!embedding.outcome,
        outcome: embedding.outcome,
        profileSnapshot: embedding.profileSnapshot,
        vector: includeVector ? embedding.embeddingVector : undefined,
        createdAt: embedding.createdAt.toISOString(),
        updatedAt: embedding.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting embedding:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get embedding',
    });
  }
}

/**
 * Trigger batch embedding generation
 * POST /api/v1/embeddings/batch
 */
export async function triggerBatch(req: Request, res: Response): Promise<void> {
  try {
    const { filter, batchSize = 50 } = req.body;

    // In production, this would query for profiles needing embeddings
    // and queue them for processing

    const jobId = generateId();
    const job: BatchJob = {
      id: jobId,
      status: 'queued',
      processed: 0,
      total: 0, // Would be calculated from actual profile count
      errors: 0,
      startedAt: new Date(),
    };

    batchJobsStore.set(jobId, job);

    // Simulate starting the job
    setTimeout(() => {
      const j = batchJobsStore.get(jobId);
      if (j) {
        j.status = 'running';
        j.total = 100; // Mock total

        // Simulate processing
        const interval = setInterval(() => {
          const currentJob = batchJobsStore.get(jobId);
          if (currentJob) {
            currentJob.processed += Math.min(10, currentJob.total - currentJob.processed);
            if (currentJob.processed >= currentJob.total) {
              currentJob.status = 'completed';
              currentJob.completedAt = new Date();
              clearInterval(interval);
            }
          }
        }, 1000);
      }
    }, 100);

    res.status(202).json({
      data: {
        jobId,
        status: 'queued',
        estimatedProfiles: 100,
        batchSize,
        filter: filter || { missingOnly: true },
      },
    });
  } catch (error) {
    console.error('Error triggering batch:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to trigger batch processing',
    });
  }
}

/**
 * Get batch job status
 * GET /api/v1/embeddings/batch/:jobId
 */
export async function getBatchStatus(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = batchJobsStore.get(jobId);

    if (!job) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Batch job not found',
      });
      return;
    }

    res.json({
      data: {
        jobId: job.id,
        status: job.status,
        processed: job.processed,
        total: job.total,
        errors: job.errors,
        progress: job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0,
        startedAt: job.startedAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting batch status:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get batch status',
    });
  }
}

/**
 * Get embeddings system status
 * GET /api/v1/embeddings/status
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getEmbeddingsStats();

    // Find any running batch jobs
    let runningJob: BatchJob | undefined;
    for (const job of batchJobsStore.values()) {
      if (job.status === 'running' || job.status === 'queued') {
        runningJob = job;
        break;
      }
    }

    res.json({
      data: {
        currentModelVersion: EMBEDDING_CONFIG.version,
        modelId: EMBEDDING_CONFIG.modelId,
        dimensions: EMBEDDING_CONFIG.dimensions,
        totalProfiles: 0, // Would come from profile count
        profilesWithEmbeddings: stats.totalEmbeddings,
        profilesWithCurrentVersion: stats.currentVersionCount,
        profilesWithOutcome: stats.withOutcomeCount,
        batchJobStatus: runningJob
          ? {
              jobId: runningJob.id,
              status: runningJob.status,
              processed: runningJob.processed,
              total: runningJob.total,
              progress: runningJob.total > 0 ? Math.round((runningJob.processed / runningJob.total) * 100) : 0,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get embeddings status',
    });
  }
}

/**
 * Regenerate all embeddings (for model version updates)
 * POST /api/v1/embeddings/regenerate
 */
export async function regenerateAll(req: Request, res: Response): Promise<void> {
  try {
    const { targetVersion } = req.body;

    // This would queue a job to regenerate all embeddings
    const jobId = generateId();
    const job: BatchJob = {
      id: jobId,
      status: 'queued',
      processed: 0,
      total: 0,
      errors: 0,
      startedAt: new Date(),
    };

    batchJobsStore.set(jobId, job);

    res.status(202).json({
      data: {
        jobId,
        action: 'regenerate',
        targetVersion: targetVersion || EMBEDDING_CONFIG.version,
        status: 'queued',
      },
    });
  } catch (error) {
    console.error('Error triggering regeneration:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to trigger regeneration',
    });
  }
}

/**
 * List all embeddings (admin endpoint)
 * GET /api/v1/embeddings
 */
export async function listEmbeddings(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const all = await getAllEmbeddings();
    const start = (page - 1) * limit;
    const embeddings = all.slice(start, start + limit);

    res.json({
      data: embeddings.map((e) => ({
        id: e.id,
        debtorProfileId: e.debtorProfileId,
        modelVersion: e.modelVersion,
        dimensions: e.embeddingVector.length,
        hasOutcome: !!e.outcome,
        outcome: e.outcome,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    });
  } catch (error) {
    console.error('Error listing embeddings:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list embeddings',
    });
  }
}

export default {
  generateForProfile,
  getForProfile,
  triggerBatch,
  getBatchStatus,
  getStatus,
  regenerateAll,
  listEmbeddings,
};
