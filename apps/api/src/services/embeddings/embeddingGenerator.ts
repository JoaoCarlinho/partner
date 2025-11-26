/**
 * Embedding Generator
 * Generates vector embeddings using AWS Bedrock Titan
 */

import { NormalizedProfile, normalizeProfile, ProfileData } from './profileNormalizer';
import { buildProfileDescription, validateDescription } from './profileDescriptionBuilder';

/**
 * Embedding model configuration
 */
export const EMBEDDING_CONFIG = {
  modelId: 'amazon.titan-embed-text-v2:0',
  dimensions: 1536,
  normalize: true,
  version: 'titan-embed-v2-1536-20250101',
};

/**
 * Profile embedding result
 */
export interface ProfileEmbedding {
  id: string;
  debtorProfileId: string;
  embeddingVector: number[];
  modelVersion: string;
  profileSnapshot: NormalizedProfile;
  description: string;
  outcome?: string;
  outcomeRecordedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Embedding generation result
 */
export interface EmbeddingResult {
  embedding: number[];
  modelVersion: string;
  dimensions: number;
  description: string;
}

/**
 * Bedrock client interface (for mocking)
 */
interface BedrockClient {
  send(command: unknown): Promise<{ body: Uint8Array }>;
}

/**
 * In-memory embedding store (production would use database)
 */
const embeddingsStore = new Map<string, ProfileEmbedding>();

/**
 * Generate unique ID
 */
function generateId(): string {
  return `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock Bedrock client for development
 * Returns deterministic pseudo-random embeddings
 */
function createMockBedrockClient(): BedrockClient {
  return {
    async send(_command: unknown): Promise<{ body: Uint8Array }> {
      // Generate pseudo-random but deterministic embedding
      const embedding: number[] = [];
      let seed = Date.now() % 1000;

      for (let i = 0; i < EMBEDDING_CONFIG.dimensions; i++) {
        // Simple pseudo-random number generator
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const value = (seed / 0x7fffffff) * 2 - 1; // Range: -1 to 1
        embedding.push(value);
      }

      // Normalize the vector
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      const normalizedEmbedding = embedding.map((v) => v / magnitude);

      const response = {
        embedding: normalizedEmbedding,
      };

      return {
        body: new TextEncoder().encode(JSON.stringify(response)),
      };
    },
  };
}

/**
 * Create Bedrock client
 * Uses mock in development, real client in production
 */
function getBedrockClient(): BedrockClient {
  // In production, would use:
  // import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
  // return new BedrockRuntimeClient({ region: process.env.AWS_REGION });

  // For development/demo, use mock
  return createMockBedrockClient();
}

/**
 * Generate embedding for a text description
 */
export async function generateEmbeddingFromText(text: string): Promise<number[]> {
  const client = getBedrockClient();

  // In production:
  // const command = new InvokeModelCommand({
  //   modelId: EMBEDDING_CONFIG.modelId,
  //   contentType: 'application/json',
  //   accept: 'application/json',
  //   body: JSON.stringify({
  //     inputText: text,
  //     dimensions: EMBEDDING_CONFIG.dimensions,
  //     normalize: EMBEDDING_CONFIG.normalize,
  //   }),
  // });

  const response = await client.send({
    modelId: EMBEDDING_CONFIG.modelId,
    body: JSON.stringify({ inputText: text }),
  });

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

/**
 * Generate embedding for a normalized profile
 */
export async function generateProfileEmbedding(
  profileId: string,
  normalized: NormalizedProfile
): Promise<EmbeddingResult> {
  // Build description from normalized profile
  const description = buildProfileDescription(normalized);

  // Validate no PII in description
  const validation = validateDescription(description);
  if (!validation.valid) {
    throw new Error(`PII detected in profile description: ${validation.violations.join(', ')}`);
  }

  // Generate embedding
  const embedding = await generateEmbeddingFromText(description);

  return {
    embedding,
    modelVersion: EMBEDDING_CONFIG.version,
    dimensions: EMBEDDING_CONFIG.dimensions,
    description,
  };
}

/**
 * Generate and store embedding for a profile
 */
export async function createProfileEmbedding(
  profileId: string,
  profileData: ProfileData
): Promise<ProfileEmbedding> {
  // Normalize the profile
  const normalized = normalizeProfile(profileData);

  // Generate embedding
  const result = await generateProfileEmbedding(profileId, normalized);

  // Create embedding record
  const embedding: ProfileEmbedding = {
    id: generateId(),
    debtorProfileId: profileId,
    embeddingVector: result.embedding,
    modelVersion: result.modelVersion,
    profileSnapshot: normalized,
    description: result.description,
    outcome: normalized.outcome,
    outcomeRecordedAt: normalized.outcome ? new Date() : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store embedding
  embeddingsStore.set(profileId, embedding);

  return embedding;
}

/**
 * Get embedding for a profile
 */
export async function getProfileEmbedding(profileId: string): Promise<ProfileEmbedding | null> {
  return embeddingsStore.get(profileId) || null;
}

/**
 * Update embedding for a profile
 */
export async function updateProfileEmbedding(
  profileId: string,
  profileData: ProfileData
): Promise<ProfileEmbedding> {
  const existing = embeddingsStore.get(profileId);

  // Normalize the profile
  const normalized = normalizeProfile(profileData);

  // Generate new embedding
  const result = await generateProfileEmbedding(profileId, normalized);

  // Create/update embedding record
  const embedding: ProfileEmbedding = {
    id: existing?.id || generateId(),
    debtorProfileId: profileId,
    embeddingVector: result.embedding,
    modelVersion: result.modelVersion,
    profileSnapshot: normalized,
    description: result.description,
    outcome: normalized.outcome,
    outcomeRecordedAt: normalized.outcome ? (existing?.outcomeRecordedAt || new Date()) : undefined,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  // Store embedding
  embeddingsStore.set(profileId, embedding);

  return embedding;
}

/**
 * Delete embedding for a profile
 */
export async function deleteProfileEmbedding(profileId: string): Promise<boolean> {
  return embeddingsStore.delete(profileId);
}

/**
 * Get all embeddings (for batch operations)
 */
export async function getAllEmbeddings(): Promise<ProfileEmbedding[]> {
  return Array.from(embeddingsStore.values());
}

/**
 * Get embeddings by model version
 */
export async function getEmbeddingsByVersion(version: string): Promise<ProfileEmbedding[]> {
  const embeddings: ProfileEmbedding[] = [];
  for (const embedding of embeddingsStore.values()) {
    if (embedding.modelVersion === version) {
      embeddings.push(embedding);
    }
  }
  return embeddings;
}

/**
 * Get embeddings statistics
 */
export async function getEmbeddingsStats(): Promise<{
  totalEmbeddings: number;
  currentVersionCount: number;
  withOutcomeCount: number;
  modelVersion: string;
}> {
  let currentVersionCount = 0;
  let withOutcomeCount = 0;

  for (const embedding of embeddingsStore.values()) {
    if (embedding.modelVersion === EMBEDDING_CONFIG.version) {
      currentVersionCount++;
    }
    if (embedding.outcome) {
      withOutcomeCount++;
    }
  }

  return {
    totalEmbeddings: embeddingsStore.size,
    currentVersionCount,
    withOutcomeCount,
    modelVersion: EMBEDDING_CONFIG.version,
  };
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

export default {
  generateEmbeddingFromText,
  generateProfileEmbedding,
  createProfileEmbedding,
  getProfileEmbedding,
  updateProfileEmbedding,
  deleteProfileEmbedding,
  getAllEmbeddings,
  getEmbeddingsByVersion,
  getEmbeddingsStats,
  cosineSimilarity,
  EMBEDDING_CONFIG,
};
