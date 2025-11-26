/**
 * Tone Analysis Service
 * Analyzes message tone before delivery using AI
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  TONE_ANALYSIS_SYSTEM_PROMPT,
  TONE_ANALYSIS_USER_PROMPT,
  WARMTH_THRESHOLDS,
  getToneCategory,
  getRecommendation,
  HOSTILE_PATTERNS,
  FDCPA_VIOLATION_PATTERNS,
} from './prompts/toneAnalysis';

// Tone analysis result interface
export interface ToneAnalysisResult {
  warmthScore: number;          // 0-100
  hostilityIndicators: string[];
  threateningLanguage: string[];
  fdcpaIssues: string[];
  profanityDetected: string[];
  recommendation: 'pass' | 'suggest_rewrite' | 'block';
  concerns: string[];
  toneCategory: string;
  analysisTime: number;         // milliseconds
}

// Sender roles for context
export type SenderRole = 'ATTORNEY' | 'PARALEGAL' | 'DEBTOR' | 'PUBLIC_DEFENDER';

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Analyze message tone using Claude Haiku (fast model)
 */
export async function analyzeTone(
  message: string,
  senderRole: SenderRole = 'DEBTOR'
): Promise<ToneAnalysisResult> {
  const startTime = Date.now();

  // Handle edge cases
  if (!message || message.trim().length === 0) {
    return createPassResult(startTime);
  }

  // For very short messages, use quick analysis
  if (message.length < 20) {
    return analyzeQuick(message, startTime);
  }

  try {
    // Build the prompt
    const userPrompt = TONE_ANALYSIS_USER_PROMPT
      .replace('{message}', sanitizeForPrompt(message))
      .replace('{senderRole}', senderRole);

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
 * Tone Analyzer Service
 * AI-powered tone analysis for warmth validation and problematic content detection
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../../middleware/logger.js';
import {
  TONE_ANALYSIS_SYSTEM_PROMPT,
  buildToneAnalysisPrompt,
  BLOCKED_PHRASES,
} from './prompts/toneAnalysis.js';

// Use Haiku for fast tone analysis (smaller model = lower latency)
const TONE_MODEL_ID = process.env.BEDROCK_HAIKU_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Warmth threshold for passing
const WARMTH_THRESHOLD = 80;

/**
 * Tone analysis result
 */
export interface ToneAnalysisResult {
  warmth: number;
  hostility: string[];
  pressure: string[];
  threats: string[];
  recommendation: 'pass' | 'regenerate' | 'manual_review';
  reasoning?: string;
  passed: boolean;
  latencyMs?: number;
}

/**
 * Initialize Bedrock client
 */
function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: AWS_REGION,
  });
}

/**
 * Analyze the tone of a message
 * Uses Claude Haiku for fast analysis
 */
export async function analyzeTone(content: string): Promise<ToneAnalysisResult> {
  const startTime = Date.now();

  // Quick blocked phrase check first (no AI needed)
  const blockedPhraseCheck = quickBlockedPhraseCheck(content);
  if (blockedPhraseCheck.hasBlockedPhrases) {
    return {
      warmth: 0,
      hostility: [],
      pressure: blockedPhraseCheck.foundPhrases,
      threats: [],
      recommendation: 'regenerate',
      reasoning: `Contains blocked phrases: ${blockedPhraseCheck.foundPhrases.join(', ')}`,
      passed: false,
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const client = getBedrockClient();

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      system: TONE_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Fast model for <2s response
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAndEnhance(parsed, message, startTime);
    }

    // Fallback to local analysis if AI fails to return valid JSON
    return analyzeLocal(message, startTime);
  } catch (error) {
    console.error('Tone analysis AI failed:', error);
    // Fallback to local analysis
    return analyzeLocal(message, startTime);
  }
}

/**
 * Quick analysis for very short messages
 */
function analyzeQuick(message: string, startTime: number): ToneAnalysisResult {
  const lowerMessage = message.toLowerCase();

  // Check for obvious issues
  const hasHostility = HOSTILE_PATTERNS.some((p) => lowerMessage.includes(p));

  if (hasHostility) {
    return {
      warmthScore: 35,
      hostilityIndicators: ['Short message with concerning tone'],
      threateningLanguage: [],
      fdcpaIssues: [],
      profanityDetected: [],
      recommendation: 'suggest_rewrite',
      concerns: ['Message tone could be improved'],
      toneCategory: 'cool',
      analysisTime: Date.now() - startTime,
    };
  }

  return createPassResult(startTime);
}

/**
 * Local fallback analysis using pattern matching
 */
function analyzeLocal(message: string, startTime: number): ToneAnalysisResult {
  const lowerMessage = message.toLowerCase();

  // Detect hostile patterns
  const hostilityIndicators: string[] = [];
  for (const pattern of HOSTILE_PATTERNS) {
    if (lowerMessage.includes(pattern)) {
      hostilityIndicators.push(pattern);
    }
  }

  // Detect FDCPA issues
  const fdcpaIssues: string[] = [];
  for (const violation of FDCPA_VIOLATION_PATTERNS) {
    if (lowerMessage.includes(violation.pattern)) {
      fdcpaIssues.push(`${violation.section}: ${violation.description}`);
    }
  }

  // Detect threatening language
  const threateningLanguage: string[] = [];
  const threatPatterns = ['arrest', 'sue you', 'destroy', 'find you', 'hurt'];
  for (const pattern of threatPatterns) {
    if (lowerMessage.includes(pattern)) {
      threateningLanguage.push(pattern);
    }
  }

  // Calculate warmth score based on findings
  let warmthScore = 60; // Start neutral
  warmthScore -= hostilityIndicators.length * 10;
  warmthScore -= fdcpaIssues.length * 20;
  warmthScore -= threateningLanguage.length * 15;
  warmthScore = Math.max(0, Math.min(100, warmthScore));

  const recommendation = getRecommendation(warmthScore, fdcpaIssues, threateningLanguage);

  const concerns: string[] = [];
  if (hostilityIndicators.length > 0) {
    concerns.push('Message contains aggressive language');
  }
  if (fdcpaIssues.length > 0) {
    concerns.push('Potential FDCPA compliance issues detected');
  }
  if (threateningLanguage.length > 0) {
    concerns.push('Threatening language detected');
  }

  return {
    warmthScore,
    hostilityIndicators,
    threateningLanguage,
    fdcpaIssues,
    profanityDetected: [],
    recommendation,
    concerns,
    toneCategory: getToneCategory(warmthScore),
    analysisTime: Date.now() - startTime,
  };
}

/**
 * Validate and enhance AI response
 */
function validateAndEnhance(
  parsed: Partial<ToneAnalysisResult>,
  originalMessage: string,
  startTime: number
): ToneAnalysisResult {
  // Ensure all required fields have valid values
  const warmthScore = Math.max(0, Math.min(100, parsed.warmthScore || 50));
  const hostilityIndicators = Array.isArray(parsed.hostilityIndicators)
    ? parsed.hostilityIndicators
    : [];
  const threateningLanguage = Array.isArray(parsed.threateningLanguage)
    ? parsed.threateningLanguage
    : [];
  const fdcpaIssues = Array.isArray(parsed.fdcpaIssues) ? parsed.fdcpaIssues : [];
  const profanityDetected = Array.isArray(parsed.profanityDetected)
    ? parsed.profanityDetected
    : [];
  const concerns = Array.isArray(parsed.concerns) ? parsed.concerns : [];

  // Recalculate recommendation to ensure consistency
  const recommendation = getRecommendation(warmthScore, fdcpaIssues, threateningLanguage);

  return {
    warmthScore,
    hostilityIndicators,
    threateningLanguage,
    fdcpaIssues,
    profanityDetected,
    recommendation,
    concerns,
    toneCategory: getToneCategory(warmthScore),
    analysisTime: Date.now() - startTime,
  };
}

/**
 * Create a passing result for benign messages
 */
function createPassResult(startTime: number): ToneAnalysisResult {
  return {
    warmthScore: 70,
    hostilityIndicators: [],
    threateningLanguage: [],
    fdcpaIssues: [],
    profanityDetected: [],
    recommendation: 'pass',
    concerns: [],
    toneCategory: 'neutral',
    analysisTime: Date.now() - startTime,
  };
}

/**
 * Sanitize message for inclusion in prompt (prevent injection)
 */
function sanitizeForPrompt(message: string): string {
  // Remove any potential prompt injection attempts
  return message
    .replace(/```/g, '')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .slice(0, 2000); // Limit length
}

/**
 * Check if message should be blocked based on analysis
 */
export function shouldBlockMessage(analysis: ToneAnalysisResult): boolean {
  return analysis.recommendation === 'block';
}

/**
 * Get suggestions for improving blocked message
 */
export function getImprovementSuggestions(analysis: ToneAnalysisResult): string[] {
  const suggestions: string[] = [];

  if (analysis.warmthScore < WARMTH_THRESHOLDS.NEUTRAL) {
    suggestions.push('Consider using a more collaborative tone');
  }

  if (analysis.hostilityIndicators.length > 0) {
    suggestions.push('Remove aggressive language and focus on solutions');
  }

  if (analysis.threateningLanguage.length > 0) {
    suggestions.push('Remove any threatening statements');
  }

  if (analysis.fdcpaIssues.length > 0) {
    suggestions.push('Review message for FDCPA compliance');
    suggestions.push('Avoid making false or exaggerated claims');
  }

  if (analysis.profanityDetected.length > 0) {
    suggestions.push('Remove inappropriate language');
  }

  if (suggestions.length === 0) {
    suggestions.push('Try rephrasing to sound more supportive');
  }

  return suggestions;
}

// Export thresholds for use elsewhere
export { WARMTH_THRESHOLDS, getToneCategory };
          content: buildToneAnalysisPrompt(content),
        },
      ],
    });

    const command = new InvokeModelCommand({
      modelId: TONE_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(body),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content?.[0]?.text || '';

    // Parse JSON response
    const analysis = parseAnalysisResponse(responseText);
    const latencyMs = Date.now() - startTime;

    logger.info('Tone analysis complete', {
      warmth: analysis.warmth,
      recommendation: analysis.recommendation,
      latencyMs,
    });

    return {
      ...analysis,
      passed: analysis.warmth >= WARMTH_THRESHOLD && analysis.recommendation === 'pass',
      latencyMs,
    };
  } catch (error) {
    logger.error('Tone analysis failed', {
      error: (error as Error).message,
    });

    // Return conservative result on error
    return {
      warmth: 0,
      hostility: [],
      pressure: [],
      threats: [],
      recommendation: 'manual_review',
      reasoning: 'Analysis failed - requires manual review',
      passed: false,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Quick check for blocked phrases without AI
 */
function quickBlockedPhraseCheck(content: string): {
  hasBlockedPhrases: boolean;
  foundPhrases: string[];
} {
  const lowerContent = content.toLowerCase();
  const foundPhrases: string[] = [];

  for (const phrase of BLOCKED_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      foundPhrases.push(phrase);
    }
  }

  return {
    hasBlockedPhrases: foundPhrases.length > 0,
    foundPhrases,
  };
}

/**
 * Parse the AI response into structured format
 */
function parseAnalysisResponse(responseText: string): Omit<ToneAnalysisResult, 'passed' | 'latencyMs'> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      warmth: typeof parsed.warmth === 'number' ? Math.min(100, Math.max(0, parsed.warmth)) : 0,
      hostility: Array.isArray(parsed.hostility) ? parsed.hostility : [],
      pressure: Array.isArray(parsed.pressure) ? parsed.pressure : [],
      threats: Array.isArray(parsed.threats) ? parsed.threats : [],
      recommendation: validateRecommendation(parsed.recommendation),
      reasoning: parsed.reasoning || undefined,
    };
  } catch (error) {
    logger.error('Failed to parse tone analysis response', {
      error: (error as Error).message,
      responseText: responseText.substring(0, 200),
    });

    return {
      warmth: 0,
      hostility: [],
      pressure: [],
      threats: [],
      recommendation: 'manual_review',
      reasoning: 'Failed to parse analysis response',
    };
  }
}

/**
 * Validate recommendation value
 */
function validateRecommendation(value: unknown): 'pass' | 'regenerate' | 'manual_review' {
  if (value === 'pass' || value === 'regenerate' || value === 'manual_review') {
    return value;
  }
  return 'regenerate';
}

/**
 * Simple warmth check for pre-approved messages
 * Uses heuristics instead of AI for fallback messages
 */
export function quickWarmthCheck(content: string): { warmth: number; passed: boolean } {
  const lowerContent = content.toLowerCase();
  let score = 50; // Start neutral

  // Positive indicators
  const warmPhrases = [
    'welcome', 'here to help', 'understand', 'options', 'together',
    'support', 'comfortable', 'questions', 'no pressure', 'your pace',
  ];

  for (const phrase of warmPhrases) {
    if (lowerContent.includes(phrase)) {
      score += 8;
    }
  }

  // Negative indicators
  const coldPhrases = [
    'must', 'immediately', 'demand', 'require', 'deadline',
    'final', 'failure', 'consequence',
  ];

  for (const phrase of coldPhrases) {
    if (lowerContent.includes(phrase)) {
      score -= 15;
    }
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    warmth: score,
    passed: score >= WARMTH_THRESHOLD,
  };
}
