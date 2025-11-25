/**
 * Embeddings Service Module
 */

// Profile normalizer
export {
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
} from './profileNormalizer';

export type {
  NormalizedProfile,
  ProfileData,
  DebtRange,
  IncomeRange,
  ResponseTimeCategory,
  CommunicationFrequency,
  OutcomeType,
} from './profileNormalizer';

// Description builder
export {
  buildProfileDescription,
  buildCompactDescription,
  validateDescription,
  DESCRIPTION_VERSION,
} from './profileDescriptionBuilder';

// Embedding generator
export {
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
} from './embeddingGenerator';

export type { ProfileEmbedding, EmbeddingResult } from './embeddingGenerator';
