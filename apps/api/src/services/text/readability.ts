/**
 * Readability Service
 * Calculates readability scores using Flesch-Kincaid formula
 */

/**
 * Result of readability validation
 */
export interface ReadabilityResult {
  grade: number;
  passes: boolean;
  sentences: number;
  words: number;
  syllables: number;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
}

/**
 * Count syllables in a word
 * Uses common English syllable patterns
 */
export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');

  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  // Remove silent e, -ed, -es endings
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  // Count vowel groups
  const matches = word.match(/[aeiouy]{1,2}/g);
  const count = matches ? matches.length : 1;

  // Minimum 1 syllable
  return Math.max(1, count);
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Split text into words
 */
export function splitIntoWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9'-]/g, ''))
    .filter((w) => w.length > 0);
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Formula: 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
 *
 * @param text - The text to analyze
 * @returns Grade level (e.g., 8.0 = 8th grade reading level)
 */
export function calculateFleschKincaidGrade(text: string): number {
  const sentences = splitIntoSentences(text);
  const words = splitIntoWords(text);

  if (sentences.length === 0 || words.length === 0) {
    return 0;
  }

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  const grade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  // Clamp to reasonable range
  return Math.max(0, Math.min(20, grade));
}

/**
 * Validate that text meets readability requirements
 *
 * @param text - The text to validate
 * @param maxGrade - Maximum acceptable grade level (default: 8)
 * @returns Detailed readability result
 */
export function validateReadability(
  text: string,
  maxGrade: number = 8
): ReadabilityResult {
  const sentences = splitIntoSentences(text);
  const words = splitIntoWords(text);

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const avgSentenceLength = words.length > 0 && sentences.length > 0
    ? words.length / sentences.length
    : 0;
  const avgSyllablesPerWord = words.length > 0
    ? totalSyllables / words.length
    : 0;

  const grade = calculateFleschKincaidGrade(text);

  return {
    grade: Math.round(grade * 10) / 10,
    passes: grade <= maxGrade,
    sentences: sentences.length,
    words: words.length,
    syllables: totalSyllables,
    averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    averageSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
  };
}

/**
 * Get a human-readable description of the grade level
 */
export function getReadabilityDescription(grade: number): string {
  if (grade <= 5) return 'Very Easy (Elementary School)';
  if (grade <= 8) return 'Easy (Middle School)';
  if (grade <= 12) return 'Average (High School)';
  if (grade <= 16) return 'Difficult (College)';
  return 'Very Difficult (Graduate Level)';
}

/**
 * Suggest improvements for text that doesn't meet readability requirements
 */
export function suggestReadabilityImprovements(result: ReadabilityResult): string[] {
  const suggestions: string[] = [];

  if (result.averageSentenceLength > 20) {
    suggestions.push(
      `Break up long sentences. Average is ${result.averageSentenceLength} words; aim for under 20.`
    );
  }

  if (result.averageSyllablesPerWord > 1.5) {
    suggestions.push(
      `Use simpler words. Average syllables per word is ${result.averageSyllablesPerWord}; aim for under 1.5.`
    );
  }

  if (!result.passes && suggestions.length === 0) {
    suggestions.push(
      'Consider using shorter words and breaking complex ideas into multiple sentences.'
    );
  }

  return suggestions;
}
