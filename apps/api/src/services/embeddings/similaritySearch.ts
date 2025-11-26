/**
 * Similarity Search Service
 * Implements vector similarity search using pgvector concepts
 * (In-memory implementation for development, production uses actual pgvector)
 */

import { ProfileEmbedding, getAllEmbeddings, cosineSimilarity } from './embeddingGenerator';
import { NormalizedProfile } from './profileNormalizer';

/**
 * Search options
 */
export interface SearchOptions {
  topK: number;
  minSimilarity?: number;
  outcomeFilter?: 'resolved' | 'defaulted' | 'all';
  organizationId?: string;
  excludeProfileId?: string;
  minCompletionRate?: number;
}

/**
 * Similar profile result
 */
export interface SimilarProfile {
  profileId: string;
  embeddingId: string;
  similarity: number;
  metadata: {
    debtRange: string;
    incomeRange: string;
    outcome?: string;
    resolutionDays?: number;
    planType?: string;
    completionRate?: number;
    stressLevel: number;
    cooperationLevel: number;
  };
}

/**
 * Search result with metrics
 */
export interface SearchResult {
  results: SimilarProfile[];
  queryMetrics: {
    latencyMs: number;
    totalCandidates: number;
    filteredCandidates: number;
    indexUsed: string;
  };
}

/**
 * In-memory organization scoping (production would use actual org IDs)
 */
const profileOrgMap = new Map<string, string>();

/**
 * Set organization for a profile (for filtering)
 */
export function setProfileOrganization(profileId: string, orgId: string): void {
  profileOrgMap.set(profileId, orgId);
}

/**
 * Extract metadata from normalized profile
 */
function extractMetadata(profile: NormalizedProfile): SimilarProfile['metadata'] {
  return {
    debtRange: profile.debtRange,
    incomeRange: profile.incomeRange,
    outcome: profile.outcome,
    resolutionDays: profile.resolutionDays,
    planType: profile.planType,
    completionRate: profile.completionRate,
    stressLevel: profile.stressLevel,
    cooperationLevel: profile.cooperationLevel,
  };
}

/**
 * Find similar profiles using cosine similarity
 * Production version would use pgvector query:
 * SELECT *, 1 - (embedding_vector <=> query_vector) as similarity
 * FROM profile_embeddings
 * ORDER BY embedding_vector <=> query_vector
 * LIMIT topK
 */
export async function findSimilarProfiles(
  queryEmbedding: number[],
  options: SearchOptions
): Promise<SearchResult> {
  const startTime = Date.now();

  const {
    topK,
    minSimilarity = 0.5,
    outcomeFilter = 'all',
    organizationId,
    excludeProfileId,
    minCompletionRate,
  } = options;

  // Get all embeddings (in production, this would be a database query)
  const allEmbeddings = await getAllEmbeddings();
  const totalCandidates = allEmbeddings.length;

  // Calculate similarities and filter
  const candidates: Array<{
    embedding: ProfileEmbedding;
    similarity: number;
  }> = [];

  for (const embedding of allEmbeddings) {
    // Skip excluded profile
    if (excludeProfileId && embedding.debtorProfileId === excludeProfileId) {
      continue;
    }

    // Organization filter
    if (organizationId) {
      const profileOrg = profileOrgMap.get(embedding.debtorProfileId);
      if (profileOrg && profileOrg !== organizationId) {
        continue;
      }
    }

    // Outcome filter
    if (outcomeFilter !== 'all') {
      if (embedding.outcome !== outcomeFilter) {
        continue;
      }
    }

    // Completion rate filter
    if (minCompletionRate !== undefined) {
      const completionRate = embedding.profileSnapshot.completionRate;
      if (completionRate === undefined || completionRate < minCompletionRate) {
        continue;
      }
    }

    // Calculate cosine similarity
    const similarity = cosineSimilarity(queryEmbedding, embedding.embeddingVector);

    // Filter by minimum similarity
    if (similarity >= minSimilarity) {
      candidates.push({ embedding, similarity });
    }
  }

  // Sort by similarity (descending)
  candidates.sort((a, b) => b.similarity - a.similarity);

  // Take top K
  const topResults = candidates.slice(0, topK);

  // Map to results
  const results: SimilarProfile[] = topResults.map((c) => ({
    profileId: c.embedding.debtorProfileId,
    embeddingId: c.embedding.id,
    similarity: c.similarity,
    metadata: extractMetadata(c.embedding.profileSnapshot),
  }));

  const latencyMs = Date.now() - startTime;

  return {
    results,
    queryMetrics: {
      latencyMs,
      totalCandidates,
      filteredCandidates: candidates.length,
      indexUsed: 'in-memory', // In production: 'hnsw' or 'ivfflat'
    },
  };
}

/**
 * Find similar profiles by profile ID
 * Looks up the existing embedding and searches for similar profiles
 */
export async function findSimilarByProfileId(
  profileId: string,
  options: Omit<SearchOptions, 'excludeProfileId'>
): Promise<SearchResult> {
  // Get the embedding for this profile
  const allEmbeddings = await getAllEmbeddings();
  const sourceEmbedding = allEmbeddings.find((e) => e.debtorProfileId === profileId);

  if (!sourceEmbedding) {
    return {
      results: [],
      queryMetrics: {
        latencyMs: 0,
        totalCandidates: 0,
        filteredCandidates: 0,
        indexUsed: 'none',
      },
    };
  }

  // Search with the source embedding, excluding itself
  return findSimilarProfiles(sourceEmbedding.embeddingVector, {
    ...options,
    excludeProfileId: profileId,
  });
}

/**
 * Bulk similarity search for multiple profiles
 */
export async function bulkFindSimilar(
  profileIds: string[],
  options: Omit<SearchOptions, 'excludeProfileId'>
): Promise<Map<string, SearchResult>> {
  const results = new Map<string, SearchResult>();

  for (const profileId of profileIds) {
    const result = await findSimilarByProfileId(profileId, options);
    results.set(profileId, result);
  }

  return results;
}

/**
 * Find profiles with successful outcomes similar to a given profile
 * Useful for recommending strategies
 */
export async function findSuccessfulSimilar(
  queryEmbedding: number[],
  topK: number = 5
): Promise<SearchResult> {
  return findSimilarProfiles(queryEmbedding, {
    topK,
    minSimilarity: 0.6,
    outcomeFilter: 'resolved',
    minCompletionRate: 0.8,
  });
}

/**
 * Index statistics (mock for development)
 */
export interface IndexStats {
  indexType: 'hnsw' | 'ivfflat' | 'in-memory';
  totalVectors: number;
  dimensions: number;
  parameters: Record<string, number>;
  sizeBytes: number;
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<IndexStats> {
  const embeddings = await getAllEmbeddings();

  return {
    indexType: 'in-memory',
    totalVectors: embeddings.length,
    dimensions: embeddings.length > 0 ? embeddings[0].embeddingVector.length : 1536,
    parameters: {
      // HNSW would have: m, ef_construction, ef_search
      // IVFFlat would have: lists, probes
    },
    sizeBytes: embeddings.length * 1536 * 4, // 4 bytes per float32
  };
}

export default {
  findSimilarProfiles,
  findSimilarByProfileId,
  bulkFindSimilar,
  findSuccessfulSimilar,
  getIndexStats,
  setProfileOrganization,
};
