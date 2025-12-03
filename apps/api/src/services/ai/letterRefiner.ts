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

export interface LetterIssue {
  severity: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
}

export interface AnalysisResult {
  analysis: string;
  issues: LetterIssue[];
  overallTone: string;
  suggestedActions: string[];
  modelMetadata: {
    modelId: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
  };
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert legal writing analyst specializing in debt collection communications and FDCPA compliance. Your role is to analyze demand letters and provide constructive feedback to help improve them.

You should:
1. Identify tone issues (aggressive, threatening, unprofessional language)
2. Check for potential compliance concerns
3. Suggest improvements that maintain effectiveness while being professional
4. Highlight positive aspects of the letter
5. Focus on helping the paralegal create an effective, compliant, and professional letter

Be specific and actionable in your feedback. Your tone should be helpful and supportive, like a senior colleague reviewing work.`;

/**
 * Analyze a demand letter and provide feedback
 */
export async function analyzeLetter(
  content: string,
  context?: RefinementContext
): Promise<AnalysisResult> {
  const prompt = `Please analyze the following demand letter and provide feedback.

<letter>
${content}
</letter>

Analyze this letter for:
1. Overall tone and professionalism
2. Potential issues that should be addressed
3. Suggested improvements

Respond in the following JSON format:
{
  "analysis": "A brief overall assessment of the letter (2-3 sentences)",
  "overallTone": "One of: professional, formal, neutral, somewhat aggressive, aggressive, threatening",
  "issues": [
    {
      "severity": "high|medium|low",
      "issue": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "suggestedActions": ["List of specific improvements to make"]
}

Focus on the most important issues first. Be constructive and helpful.`;

  logger.info('Analyzing letter', {
    contentLength: content.length,
  });

  try {
    const result = await invokeModel(prompt, {
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      maxTokens: 2048,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    // Parse the JSON response
    let analysisData: {
      analysis: string;
      overallTone: string;
      issues: LetterIssue[];
      suggestedActions: string[];
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      logger.warn('Failed to parse analysis JSON, using fallback', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
      });
      // Fallback response if parsing fails
      analysisData = {
        analysis: 'I reviewed the letter and have some suggestions for improvement.',
        overallTone: 'neutral',
        issues: [],
        suggestedActions: ['Consider reviewing the tone of the letter', 'Ensure all required disclosures are present'],
      };
    }

    logger.info('Letter analysis completed', {
      overallTone: analysisData.overallTone,
      issueCount: analysisData.issues.length,
      latencyMs: result.latencyMs,
    });

    return {
      analysis: analysisData.analysis,
      overallTone: analysisData.overallTone,
      issues: analysisData.issues || [],
      suggestedActions: analysisData.suggestedActions || [],
      modelMetadata: {
        modelId: result.modelId,
        latencyMs: result.latencyMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
    };
  } catch (error) {
    if (error instanceof BedrockError) {
      logger.error('Bedrock error during letter analysis', {
        error: error.message,
        cause: error.cause?.message,
      });
      throw new RefinementError(
        'Failed to analyze letter: AI service unavailable',
        error
      );
    }
    throw error;
  }
}
