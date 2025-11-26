/**
 * Letter Generator Service
 * Orchestrates AI-powered demand letter generation
 */

import type {
  CaseDetails,
  DebtCalculation,
  ComplianceResult,
  GenerationMetadata,
} from '@steno/shared';
import { invokeModel, invokeModelStream, BedrockError } from './bedrockClient.js';
import {
  LETTER_GENERATION_SYSTEM_PROMPT,
  buildUserPrompt,
  buildDefaultPrompt,
  sanitizeInput,
  validateCaseDetailsForAI,
} from './prompts/letterGeneration.js';
import { calculateDebt } from '../debt/calculator.js';
import { validateDemandLetter } from '../compliance/fdcpaValidator.js';
import { logger } from '../../middleware/logger.js';

export interface GeneratedLetter {
  content: string;
  complianceResult: ComplianceResult;
  metadata: GenerationMetadata;
  warnings: string[];
}

export interface StreamedLetterChunk {
  type: 'content' | 'compliance' | 'done' | 'error';
  content?: string;
  complianceResult?: ComplianceResult;
  error?: string;
}

/**
 * Generate a demand letter from case details
 */
export async function generateLetter(
  caseDetails: CaseDetails,
  templateContent?: string
): Promise<GeneratedLetter> {
  // Validate and sanitize inputs
  const warnings = validateCaseDetailsForAI(caseDetails);

  const sanitizedDetails: CaseDetails = {
    ...caseDetails,
    debtorName: sanitizeInput(caseDetails.debtorName),
    creditorName: sanitizeInput(caseDetails.creditorName),
    originalCreditor: caseDetails.originalCreditor
      ? sanitizeInput(caseDetails.originalCreditor)
      : undefined,
    additionalContext: caseDetails.additionalContext
      ? sanitizeInput(caseDetails.additionalContext)
      : undefined,
  };

  // Calculate debt amounts
  const debtCalculation = calculateDebt(sanitizedDetails.debtAmount);

  // Build prompt
  const userPrompt = templateContent
    ? buildUserPrompt(sanitizedDetails, templateContent, debtCalculation)
    : buildDefaultPrompt(sanitizedDetails, debtCalculation);

  logger.info('Generating demand letter', {
    state: sanitizedDetails.stateJurisdiction,
    hasTemplate: !!templateContent,
    debtTotal: debtCalculation.total,
  });

  try {
    // Invoke AI model
    const result = await invokeModel(userPrompt, {
      systemPrompt: LETTER_GENERATION_SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.7,
    });

    // Validate generated content for compliance
    const complianceResult = validateDemandLetter(result.content, {
      state: sanitizedDetails.stateJurisdiction,
      debtDetails: {
        principal: debtCalculation.principal,
        interest: debtCalculation.interest,
        fees: debtCalculation.fees,
        originDate: sanitizedDetails.debtOriginDate,
        creditorName: sanitizedDetails.creditorName,
        originalCreditor: sanitizedDetails.originalCreditor,
        accountNumber: sanitizedDetails.accountNumber,
      },
    });

    // Log compliance result
    logger.info('Letter generated and validated', {
      isCompliant: complianceResult.isCompliant,
      score: complianceResult.score,
      checksRun: complianceResult.checks.length,
    });

    return {
      content: result.content,
      complianceResult,
      metadata: {
        modelId: result.modelId,
        promptTokens: result.usage.inputTokens,
        completionTokens: result.usage.outputTokens,
        totalTokens: result.usage.inputTokens + result.usage.outputTokens,
        latencyMs: result.latencyMs,
      },
      warnings,
    };
  } catch (error) {
    if (error instanceof BedrockError) {
      logger.error('Bedrock error during letter generation', {
        error: error.message,
        cause: error.cause?.message,
      });
      throw new LetterGenerationError(
        'Failed to generate letter: AI service unavailable',
        error
      );
    }
    throw error;
  }
}

/**
 * Generate letter with streaming response
 */
export async function* generateLetterStream(
  caseDetails: CaseDetails,
  templateContent?: string
): AsyncGenerator<StreamedLetterChunk> {
  // Validate and sanitize inputs
  const sanitizedDetails: CaseDetails = {
    ...caseDetails,
    debtorName: sanitizeInput(caseDetails.debtorName),
    creditorName: sanitizeInput(caseDetails.creditorName),
    originalCreditor: caseDetails.originalCreditor
      ? sanitizeInput(caseDetails.originalCreditor)
      : undefined,
    additionalContext: caseDetails.additionalContext
      ? sanitizeInput(caseDetails.additionalContext)
      : undefined,
  };

  // Calculate debt amounts
  const debtCalculation = calculateDebt(sanitizedDetails.debtAmount);

  // Build prompt
  const userPrompt = templateContent
    ? buildUserPrompt(sanitizedDetails, templateContent, debtCalculation)
    : buildDefaultPrompt(sanitizedDetails, debtCalculation);

  logger.info('Starting streaming letter generation', {
    state: sanitizedDetails.stateJurisdiction,
    hasTemplate: !!templateContent,
  });

  let fullContent = '';

  try {
    // Stream AI response
    for await (const chunk of invokeModelStream(userPrompt, {
      systemPrompt: LETTER_GENERATION_SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.7,
    })) {
      if (chunk.type === 'content' && chunk.content) {
        fullContent += chunk.content;
        yield { type: 'content', content: chunk.content };
      } else if (chunk.type === 'error') {
        yield { type: 'error', error: chunk.error };
        return;
      }
    }

    // Run compliance check on complete content
    const complianceResult = validateDemandLetter(fullContent, {
      state: sanitizedDetails.stateJurisdiction,
      debtDetails: {
        principal: debtCalculation.principal,
        interest: debtCalculation.interest,
        fees: debtCalculation.fees,
        originDate: sanitizedDetails.debtOriginDate,
        creditorName: sanitizedDetails.creditorName,
        originalCreditor: sanitizedDetails.originalCreditor,
        accountNumber: sanitizedDetails.accountNumber,
      },
    });

    yield { type: 'compliance', complianceResult };
    yield { type: 'done' };

    logger.info('Streaming letter generation completed', {
      contentLength: fullContent.length,
      isCompliant: complianceResult.isCompliant,
    });
  } catch (error) {
    logger.error('Error during streaming generation', {
      error: (error as Error).message,
    });
    yield { type: 'error', error: (error as Error).message };
  }
}

/**
 * Validate generated content post-generation
 */
export function validateGeneratedContent(
  content: string,
  caseDetails: CaseDetails,
  debtCalculation: DebtCalculation
): ComplianceResult {
  return validateDemandLetter(content, {
    state: caseDetails.stateJurisdiction,
    debtDetails: {
      principal: debtCalculation.principal,
      interest: debtCalculation.interest,
      fees: debtCalculation.fees,
      originDate: caseDetails.debtOriginDate,
      creditorName: caseDetails.creditorName,
      originalCreditor: caseDetails.originalCreditor,
      accountNumber: caseDetails.accountNumber,
    },
  });
}

/**
 * Custom error class for letter generation errors
 */
export class LetterGenerationError extends Error {
  public readonly cause: Error | null;

  constructor(message: string, cause: Error | null = null) {
    super(message);
    this.name = 'LetterGenerationError';
    this.cause = cause;
  }
}
