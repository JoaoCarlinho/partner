/**
 * Message Rewriting Service
 * Suggests warmer alternatives for low-warmth messages
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  MESSAGE_REWRITE_SYSTEM_PROMPT,
  MESSAGE_REWRITE_USER_PROMPT,
  WARM_PHRASE_REPLACEMENTS,
  WARM_INDICATORS,
} from './prompts/messageRewrite';
import { ToneAnalysisResult } from './toneAnalyzer';

/**
 * Rewrite suggestion interface
 */
export interface RewriteSuggestion {
  id: string;
  originalMessage: string;
  suggestedText: string;
  warmthImprovement: number;
  changes: string[];
}

/**
 * Rewrite response from the service
 */
export interface RewriteResponse {
  original: string;
  originalScore: number;
  suggestions: RewriteSuggestion[];
  generatedAt: Date;
  analysisTime: number;
}

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generate unique ID for suggestions
 */
function generateSuggestionId(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if message is already warm enough
 */
function isAlreadyWarm(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const warmCount = WARM_INDICATORS.filter((indicator) =>
    lowerMessage.includes(indicator.toLowerCase())
  ).length;

  return warmCount >= 2;
}

/**
 * Suggest rewrites using AI (Claude Sonnet for quality)
 */
export async function suggestRewrites(
  message: string,
  toneAnalysis: ToneAnalysisResult
): Promise<RewriteResponse> {
  const startTime = Date.now();

  // If message is already warm, return empty suggestions
  if (toneAnalysis.warmthScore >= 50 || isAlreadyWarm(message)) {
    return {
      original: message,
      originalScore: toneAnalysis.warmthScore,
      suggestions: [],
      generatedAt: new Date(),
      analysisTime: Date.now() - startTime,
    };
  }

  try {
    // Build the prompt with context
    const concerns = toneAnalysis.concerns.length > 0 ? toneAnalysis.concerns.join('\n- ') : 'None';

    const userPrompt = MESSAGE_REWRITE_USER_PROMPT.replace('{originalMessage}', sanitizeForPrompt(message))
      .replace('{concerns}', concerns)
      .replace('{warmthScore}', toneAnalysis.warmthScore.toString());

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      system: MESSAGE_REWRITE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0', // Sonnet for quality rewrites
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content[0]?.text || '';

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        suggestedText: string;
        changes: string[];
        warmthImprovement: number;
      }>;

      const suggestions: RewriteSuggestion[] = parsed.map((item) => ({
        id: generateSuggestionId(),
        originalMessage: message,
        suggestedText: item.suggestedText,
        warmthImprovement: Math.min(30, Math.max(5, item.warmthImprovement || 15)),
        changes: Array.isArray(item.changes) ? item.changes : ['Improved tone'],
      }));

      return {
        original: message,
        originalScore: toneAnalysis.warmthScore,
        suggestions: suggestions.slice(0, 3), // Max 3 suggestions
        generatedAt: new Date(),
        analysisTime: Date.now() - startTime,
      };
    }

    // Fallback to local rewriting if AI fails
    return generateLocalRewrites(message, toneAnalysis, startTime);
  } catch (error) {
    console.error('Message rewrite AI failed:', error);
    // Fallback to local rewriting
    return generateLocalRewrites(message, toneAnalysis, startTime);
  }
}

/**
 * Generate rewrites locally using phrase replacement
 */
function generateLocalRewrites(
  message: string,
  toneAnalysis: ToneAnalysisResult,
  startTime: number
): RewriteResponse {
  const suggestions: RewriteSuggestion[] = [];

  // Version 1: Basic phrase replacement
  let rewrite1 = message;
  const changes1: string[] = [];

  for (const [coldPhrase, warmPhrase] of Object.entries(WARM_PHRASE_REPLACEMENTS)) {
    const regex = new RegExp(coldPhrase, 'gi');
    if (regex.test(rewrite1)) {
      rewrite1 = rewrite1.replace(regex, warmPhrase);
      changes1.push(`Replaced "${coldPhrase}" with warmer language`);
    }
  }

  if (changes1.length > 0) {
    suggestions.push({
      id: generateSuggestionId(),
      originalMessage: message,
      suggestedText: rewrite1,
      warmthImprovement: Math.min(25, changes1.length * 8),
      changes: changes1,
    });
  }

  // Version 2: Add collaborative opener
  const collaborativeOpeners = [
    "We'd like to help you with ",
    "We understand this situation and want to work with you on ",
    "We're reaching out to support you regarding ",
  ];

  const opener = collaborativeOpeners[Math.floor(Math.random() * collaborativeOpeners.length)];
  const lowerMessage = message.toLowerCase();

  // Find the core topic
  let topic = 'this matter';
  if (lowerMessage.includes('payment')) {
    topic = 'finding a payment solution';
  } else if (lowerMessage.includes('debt') || lowerMessage.includes('balance')) {
    topic = 'your account';
  } else if (lowerMessage.includes('contact') || lowerMessage.includes('call')) {
    topic = 'discussing your options';
  }

  const rewrite2 = `${opener}${topic}. We have flexible options available and are here to help when you're ready to discuss.`;

  if (rewrite2 !== message) {
    suggestions.push({
      id: generateSuggestionId(),
      originalMessage: message,
      suggestedText: rewrite2,
      warmthImprovement: 20,
      changes: ['Reframed with collaborative opener', 'Added offer of flexible options'],
    });
  }

  // Version 3: Solution-focused reframe
  const solutionFocused = `We noticed your account needs attention and wanted to reach out. We have several options that might work for your situation, and we're happy to discuss them whenever it's convenient for you. Please feel free to contact us when you're ready.`;

  suggestions.push({
    id: generateSuggestionId(),
    originalMessage: message,
    suggestedText: solutionFocused,
    warmthImprovement: 25,
    changes: [
      'Complete rewrite with solution-focused approach',
      'Added flexibility language',
      'Removed pressure or urgency',
    ],
  });

  return {
    original: message,
    originalScore: toneAnalysis.warmthScore,
    suggestions: suggestions.slice(0, 3),
    generatedAt: new Date(),
    analysisTime: Date.now() - startTime,
  };
}

/**
 * Sanitize message for inclusion in prompt
 */
function sanitizeForPrompt(message: string): string {
  return message.replace(/```/g, '').replace(/\{/g, '(').replace(/\}/g, ')').slice(0, 2000);
}

/**
 * Quick rewrite for very short messages
 */
export function quickRewrite(message: string): string {
  let rewritten = message;

  for (const [coldPhrase, warmPhrase] of Object.entries(WARM_PHRASE_REPLACEMENTS)) {
    const regex = new RegExp(coldPhrase, 'gi');
    rewritten = rewritten.replace(regex, warmPhrase);
  }

  return rewritten;
}

/**
 * Check if a suggestion should be offered for this analysis
 */
export function shouldOfferSuggestions(toneAnalysis: ToneAnalysisResult): boolean {
  return toneAnalysis.warmthScore < 50 || toneAnalysis.concerns.length > 0;
}
