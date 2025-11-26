/**
 * Letter Refiner Service
 * AI-powered letter refinement with compliance preservation
 */

import type { ComplianceResult, ValidationContext } from '@steno/shared';
import { invokeModel, BedrockError } from './bedrockClient.js';
import {
  REFINEMENT_SYSTEM_PROMPT,
  buildRefinementPrompt,
  sanitizeInstruction,
  validateInstruction,
} from './prompts/letterRefinement.js';
import { validateDemandLetter } from '../compliance/fdcpaValidator.js';
import { generateDiff, type DiffResult } from '../diff/textDiff.js';
import { logger } from '../../middleware/logger.js';

export interface RefinementResult {
  content: string;
  complianceResult: ComplianceResult;
  diff: DiffResult;
  instructionWarnings: string[];
  modelMetadata: {
    modelId: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
  };
}

export interface RefinementContext {
  state: string;
  debtDetails: {
    principal: number;
    interest?: number;
    fees?: number;
    originDate: string;
    creditorName: string;
    originalCreditor?: string;
    accountNumber?: string;
  };
}

/**
 * Refine a letter based on user instruction
 */
export async function refineLetter(
  currentContent: string,
  instruction: string,
  context: RefinementContext
): Promise<RefinementResult> {
  // Sanitize and validate instruction
  const sanitizedInstruction = sanitizeInstruction(instruction);
  const validation = validateInstruction(sanitizedInstruction);

  if (!validation.isValid) {
    logger.warn('Potentially problematic refinement instruction', {
      warnings: validation.warnings,
    });
  }

  // Build refinement prompt
  const prompt = buildRefinementPrompt(currentContent, sanitizedInstruction);

  logger.info('Refining letter', {
    instructionLength: sanitizedInstruction.length,
    currentContentLength: currentContent.length,
  });

  try {
    // Invoke AI model
    const result = await invokeModel(prompt, {
      systemPrompt: REFINEMENT_SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.5, // Lower temperature for more consistent refinements
    });

    // Validate refined content for compliance
    const validationContext: ValidationContext = {
      state: context.state,
      debtDetails: context.debtDetails,
    };

    const complianceResult = validateDemandLetter(result.content, validationContext);

    // Generate diff
    const diff = generateDiff(currentContent, result.content);

    logger.info('Letter refinement completed', {
      isCompliant: complianceResult.isCompliant,
      score: complianceResult.score,
      additions: diff.additions,
      deletions: diff.deletions,
      latencyMs: result.latencyMs,
    });

    return {
      content: result.content,
      complianceResult,
      diff,
      instructionWarnings: validation.warnings,
      modelMetadata: {
        modelId: result.modelId,
        latencyMs: result.latencyMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
    };
  } catch (error) {
    if (error instanceof BedrockError) {
      logger.error('Bedrock error during letter refinement', {
        error: error.message,
        cause: error.cause?.message,
      });
      throw new RefinementError(
        'Failed to refine letter: AI service unavailable',
        error
      );
    }
    throw error;
  }
}

/**
 * Validate if refinement maintains compliance
 */
export function validateRefinementCompliance(
  originalCompliance: ComplianceResult,
  newCompliance: ComplianceResult
): {
  isAcceptable: boolean;
  complianceLost: string[];
} {
  const complianceLost: string[] = [];

  // Check if any required checks that passed now fail
  for (const originalCheck of originalCompliance.checks) {
    if (originalCheck.required && originalCheck.passed) {
      const newCheck = newCompliance.checks.find((c) => c.id === originalCheck.id);
      if (newCheck && !newCheck.passed) {
        complianceLost.push(originalCheck.name);
      }
    }
  }

  return {
    isAcceptable: complianceLost.length === 0,
    complianceLost,
  };
}

/**
 * Custom error class for refinement errors
 */
export class RefinementError extends Error {
  public readonly cause: Error | null;

  constructor(message: string, cause: Error | null = null) {
    super(message);
    this.name = 'RefinementError';
    this.cause = cause;
  }
}
