/**
 * Vector Operations
 * Utility functions for vector manipulation and validation
 */

/**
 * Expected vector dimensions for embeddings
 */
export const VECTOR_DIMENSIONS = 1536;

/**
 * Validate vector dimensions
 */
export function validateDimensions(vector: number[], expected: number = VECTOR_DIMENSIONS): boolean {
  return vector.length === expected;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
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

/**
 * Calculate Euclidean (L2) distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan (L1) distance between two vectors
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }

  return sum;
}

/**
 * Normalize vector to unit length
 * Required for cosine similarity to work correctly
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

  if (magnitude === 0) {
    return new Array(vector.length).fill(0);
  }

  return vector.map((v) => v / magnitude);
}

/**
 * Check if vector is normalized (unit length)
 */
export function isNormalized(vector: number[], tolerance: number = 1e-6): boolean {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return Math.abs(magnitude - 1) < tolerance;
}

/**
 * Calculate average (centroid) of multiple vectors
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot average empty vector list');
  }

  const dimensions = vectors[0].length;
  const result = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${dimensions}, got ${vector.length}`);
    }

    for (let i = 0; i < dimensions; i++) {
      result[i] += vector[i];
    }
  }

  return result.map((v) => v / vectors.length);
}

/**
 * Calculate weighted average of vectors
 */
export function weightedAverageVectors(
  vectors: number[][],
  weights: number[]
): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot average empty vector list');
  }

  if (vectors.length !== weights.length) {
    throw new Error('Number of vectors must match number of weights');
  }

  const dimensions = vectors[0].length;
  const result = new Array(dimensions).fill(0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    throw new Error('Total weight cannot be zero');
  }

  for (let j = 0; j < vectors.length; j++) {
    const vector = vectors[j];
    const weight = weights[j];

    if (vector.length !== dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${dimensions}, got ${vector.length}`);
    }

    for (let i = 0; i < dimensions; i++) {
      result[i] += vector[i] * weight;
    }
  }

  return result.map((v) => v / totalWeight);
}

/**
 * Add two vectors element-wise
 */
export function addVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  return a.map((v, i) => v + b[i]);
}

/**
 * Subtract two vectors element-wise (a - b)
 */
export function subtractVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  return a.map((v, i) => v - b[i]);
}

/**
 * Scale vector by a scalar
 */
export function scaleVector(vector: number[], scalar: number): number[] {
  return vector.map((v) => v * scalar);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

/**
 * Calculate vector magnitude (length)
 */
export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

/**
 * Convert vector to pgvector string format
 * Used for raw SQL queries with pgvector
 */
export function toPgvectorString(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * Parse pgvector string format to number array
 */
export function fromPgvectorString(str: string): number[] {
  // Remove brackets and split by comma
  const cleaned = str.replace(/^\[|\]$/g, '');
  return cleaned.split(',').map((v) => parseFloat(v.trim()));
}

/**
 * Validate vector contains no NaN or Infinity values
 */
export function validateVector(vector: number[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(vector)) {
    return { valid: false, errors: ['Vector must be an array'] };
  }

  if (vector.length === 0) {
    return { valid: false, errors: ['Vector cannot be empty'] };
  }

  if (vector.length !== VECTOR_DIMENSIONS) {
    errors.push(`Expected ${VECTOR_DIMENSIONS} dimensions, got ${vector.length}`);
  }

  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number') {
      errors.push(`Element at index ${i} is not a number`);
    } else if (isNaN(vector[i])) {
      errors.push(`Element at index ${i} is NaN`);
    } else if (!isFinite(vector[i])) {
      errors.push(`Element at index ${i} is Infinity`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export default {
  validateDimensions,
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  normalizeVector,
  isNormalized,
  averageVectors,
  weightedAverageVectors,
  addVectors,
  subtractVectors,
  scaleVector,
  dotProduct,
  magnitude,
  toPgvectorString,
  fromPgvectorString,
  validateVector,
  VECTOR_DIMENSIONS,
};
