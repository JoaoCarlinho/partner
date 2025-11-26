/**
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
