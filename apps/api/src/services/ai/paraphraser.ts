/**
 * Paraphraser Service
 * Transforms legal demand letters into plain English
 */

import { invokeModel } from './bedrockClient.js';
import {
  PARAPHRASE_SYSTEM_PROMPT,
  buildParaphrasePrompt,
  buildSummaryPrompt,
  buildSimplifyPrompt,
} from './prompts/paraphrase.js';
import { validateReadability, type ReadabilityResult } from '../text/readability.js';
import { logger } from '../../middleware/logger.js';

// Max attempts to simplify content to meet readability threshold
const MAX_SIMPLIFICATION_ATTEMPTS = 2;
const TARGET_GRADE_LEVEL = 8;

/**
 * Paraphrasing result
 */
export interface ParaphraseResult {
  success: boolean;
  paraphrasedContent?: string;
  readability?: ReadabilityResult;
  whatThisMeans?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Key information for summary generation
 */
export interface SummaryContext {
  totalAmount: number;
  creditorName: string;
  deadline?: string;
  daysRemaining?: number;
}

/**
 * Paraphrase a demand letter into plain English
 *
 * @param legalContent - Original legal content to paraphrase
 * @param summaryContext - Optional context for generating "What This Means" summary
 * @returns Paraphrased content with readability validation
 */
export async function paraphraseDemandLetter(
  legalContent: string,
  summaryContext?: SummaryContext
): Promise<ParaphraseResult> {
  try {
    logger.info('Starting demand letter paraphrasing', {
      contentLength: legalContent.length,
    });

    // Generate initial paraphrase
    const paraphrasePrompt = buildParaphrasePrompt(legalContent);
    const response = await invokeModel(paraphrasePrompt, {
      systemPrompt: PARAPHRASE_SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.5, // Lower temperature for more consistent output
    });

    let paraphrasedContent = response.content;
    let readability = validateReadability(paraphrasedContent, TARGET_GRADE_LEVEL);

    logger.info('Initial paraphrase generated', {
      grade: readability.grade,
      passes: readability.passes,
    });

    // If readability doesn't pass, attempt to simplify
    let attempts = 0;
    while (!readability.passes && attempts < MAX_SIMPLIFICATION_ATTEMPTS) {
      attempts++;
      logger.info('Simplifying content', {
        attempt: attempts,
        currentGrade: readability.grade,
      });

      const simplifyPrompt = buildSimplifyPrompt(paraphrasedContent, readability.grade);
      const simplifiedResponse = await invokeModel(simplifyPrompt, {
        systemPrompt: PARAPHRASE_SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.3, // Even lower temperature for simplification
      });

      paraphrasedContent = simplifiedResponse.content;
      readability = validateReadability(paraphrasedContent, TARGET_GRADE_LEVEL);

      logger.info('Simplification attempt completed', {
        attempt: attempts,
        grade: readability.grade,
        passes: readability.passes,
      });
    }

    // Generate "What This Means For You" summary if context provided
    let whatThisMeans: string | undefined;
    if (summaryContext) {
      whatThisMeans = await generateSummary(paraphrasedContent, summaryContext);
    }

    logger.info('Paraphrasing complete', {
      finalGrade: readability.grade,
      passes: readability.passes,
      hasSummary: !!whatThisMeans,
    });

    return {
      success: true,
      paraphrasedContent,
      readability,
      whatThisMeans,
    };
  } catch (error) {
    logger.error('Paraphrasing failed', {
      error: (error as Error).message,
    });

    return {
      success: false,
      errorCode: 'PARAPHRASE_FAILED',
      errorMessage: 'Unable to paraphrase the demand letter. Please try again.',
    };
  }
}

/**
 * Generate "What This Means For You" summary
 */
async function generateSummary(
  paraphrasedContent: string,
  context: SummaryContext
): Promise<string> {
  try {
    const summaryPrompt = buildSummaryPrompt(paraphrasedContent, context);
    const response = await invokeModel(summaryPrompt, {
      systemPrompt: PARAPHRASE_SYSTEM_PROMPT,
      maxTokens: 500,
      temperature: 0.5,
    });

    // Validate summary is under 100 words
    const wordCount = response.content.split(/\s+/).length;
    if (wordCount > 100) {
      logger.warn('Summary exceeds word limit', { wordCount });
      // Truncate to approximately 100 words
      const words = response.content.split(/\s+/).slice(0, 100);
      return words.join(' ') + '...';
    }

    return response.content;
  } catch (error) {
    logger.error('Summary generation failed', {
      error: (error as Error).message,
    });

    // Return fallback summary
    return `You owe approximately $${context.totalAmount.toLocaleString()} to ${context.creditorName}. ` +
      `${context.deadline ? `You have until ${context.deadline} to respond. ` : ''}` +
      'Your options include paying in full, setting up a payment plan, disputing the debt, or requesting more information about what you owe.';
  }
}

/**
 * Quick paraphrase for single paragraphs or sections
 * Uses lighter-weight processing without full validation
 */
export async function paraphraseParagraph(text: string): Promise<string> {
  try {
    const prompt = `Paraphrase this text in plain English for an 8th grade reading level:

${text}

Use simple words, short sentences, and active voice. Return only the paraphrased text.`;

    const response = await invokeModel(prompt, {
      systemPrompt: PARAPHRASE_SYSTEM_PROMPT,
      maxTokens: 1000,
      temperature: 0.5,
    });

    return response.content;
  } catch (error) {
    logger.error('Paragraph paraphrase failed', {
      error: (error as Error).message,
    });

    // Return original on failure
    return text;
  }
}
