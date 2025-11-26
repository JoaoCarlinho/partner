/**
 * Intention Classifier Service
 * Classifies debtor intentions from their communications
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  INTENTION_SYSTEM_PROMPT,
  INTENTION_USER_PROMPT,
  INTENTION_CATEGORIES,
  INTENTION_SIGNALS,
  INTENTION_DESCRIPTIONS,
  type IntentionCategory,
} from './prompts/intention';

// Intention result interface
export interface IntentionResult {
  primaryIntention: IntentionCategory;
  secondaryIntention: IntentionCategory | null;
  confidence: number; // 0-1
  signals: string[];
  suggestedApproach: string;
}

// Context for classification
export interface ClassificationContext {
  incomeRange?: string;
  hasOtherDebts?: boolean;
  stressLevel?: number;
  previousInteractions?: string;
}

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Classify debtor intention using AI
 */
export async function classifyIntention(
  text: string,
  context: ClassificationContext = {}
): Promise<IntentionResult> {
  // First try keyword-based classification for quick result
  const keywordResult = classifyByKeywords(text);

  // If high confidence from keywords, use that
  if (keywordResult.confidence >= 0.7) {
    return keywordResult;
  }

  // Otherwise use AI for nuanced classification
  try {
    const userPrompt = INTENTION_USER_PROMPT
      .replace('{text}', text)
      .replace('{incomeRange}', context.incomeRange || 'not provided')
      .replace('{hasOtherDebts}', context.hasOtherDebts !== undefined ? String(context.hasOtherDebts) : 'unknown')
      .replace('{stressLevel}', context.stressLevel !== undefined ? String(context.stressLevel) : 'unknown')
      .replace('{previousInteractions}', context.previousInteractions || 'none');

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 400,
      system: INTENTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
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
      return validateIntentionResult(parsed);
    }

    // Fall back to keyword result if AI fails
    return keywordResult;
  } catch (error) {
    console.error('Intention classification failed:', error);
    return keywordResult;
  }
}

/**
 * Classify intention using keyword matching
 */
export function classifyByKeywords(text: string): IntentionResult {
  const lowercaseText = text.toLowerCase();
  const scores: Record<IntentionCategory, { score: number; signals: string[] }> = {} as any;

  // Initialize scores
  for (const category of Object.values(INTENTION_CATEGORIES)) {
    scores[category] = { score: 0, signals: [] };
  }

  // Check each category for matching signals
  for (const [category, signals] of Object.entries(INTENTION_SIGNALS)) {
    for (const signal of signals) {
      if (lowercaseText.includes(signal)) {
        scores[category as IntentionCategory].score += 1;
        scores[category as IntentionCategory].signals.push(signal);
      }
    }
  }

  // Find primary and secondary intentions
  const sortedCategories = Object.entries(scores)
    .filter(([_, value]) => value.score > 0)
    .sort((a, b) => b[1].score - a[1].score);

  const primaryCategory = sortedCategories[0]?.[0] as IntentionCategory || INTENTION_CATEGORIES.UNKNOWN;
  const primaryScore = sortedCategories[0]?.[1].score || 0;
  const primarySignals = sortedCategories[0]?.[1].signals || [];

  const secondaryCategory = sortedCategories[1]?.[0] as IntentionCategory || null;

  // Calculate confidence based on number of matches and text length
  const maxPossibleScore = Math.max(...Object.values(INTENTION_SIGNALS).map((s) => s.length));
  const confidence = Math.min(0.9, primaryScore / maxPossibleScore + 0.2);

  return {
    primaryIntention: primaryCategory,
    secondaryIntention: secondaryCategory,
    confidence: primaryCategory === INTENTION_CATEGORIES.UNKNOWN ? 0.1 : confidence,
    signals: primarySignals,
    suggestedApproach: getSuggestedApproach(primaryCategory, secondaryCategory),
  };
}

/**
 * Get suggested approach based on intention
 */
function getSuggestedApproach(
  primary: IntentionCategory,
  secondary: IntentionCategory | null
): string {
  const approaches: Record<IntentionCategory, string> = {
    [INTENTION_CATEGORIES.READY_TO_PAY]:
      'Present clear payment options and make the process straightforward.',
    [INTENTION_CATEGORIES.WANTS_NEGOTIATION]:
      'Offer flexible payment plan options and emphasize willingness to work together.',
    [INTENTION_CATEGORIES.DISPUTES_DEBT]:
      'Provide validation information and be prepared to answer questions about debt origin.',
    [INTENTION_CATEGORIES.NEEDS_INFORMATION]:
      'Offer clear, detailed explanations and encourage questions.',
    [INTENTION_CATEGORIES.FINANCIAL_HARDSHIP]:
      'Show empathy, discuss hardship programs, and explore minimal payment options.',
    [INTENTION_CATEGORIES.OVERWHELMED]:
      'Take extra care with communication, offer human support option, and simplify choices.',
    [INTENTION_CATEGORIES.UNKNOWN]:
      'Continue gathering information through supportive conversation.',
  };

  let approach = approaches[primary];

  // Add secondary consideration if relevant
  if (secondary && secondary !== primary) {
    const secondaryDescription = INTENTION_DESCRIPTIONS[secondary];
    approach += ` Also consider that they may ${secondaryDescription.toLowerCase()}.`;
  }

  return approach;
}

/**
 * Validate and normalize intention result
 */
function validateIntentionResult(result: Partial<IntentionResult>): IntentionResult {
  const validCategories = Object.values(INTENTION_CATEGORIES);

  let primaryIntention = result.primaryIntention as IntentionCategory;
  if (!validCategories.includes(primaryIntention)) {
    primaryIntention = INTENTION_CATEGORIES.UNKNOWN;
  }

  let secondaryIntention = result.secondaryIntention as IntentionCategory | null;
  if (secondaryIntention && !validCategories.includes(secondaryIntention)) {
    secondaryIntention = null;
  }

  return {
    primaryIntention,
    secondaryIntention,
    confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
    signals: result.signals || [],
    suggestedApproach: result.suggestedApproach || getSuggestedApproach(primaryIntention, secondaryIntention),
  };
}

/**
 * Update intention based on new interaction
 * Uses weighted average favoring recent signals
 */
export function updateIntention(
  currentIntention: IntentionResult,
  newIntention: IntentionResult
): IntentionResult {
  // If new signal is much stronger, switch to it
  if (newIntention.confidence > currentIntention.confidence + 0.2) {
    return newIntention;
  }

  // If same primary intention, increase confidence
  if (newIntention.primaryIntention === currentIntention.primaryIntention) {
    return {
      ...currentIntention,
      confidence: Math.min(0.95, currentIntention.confidence + 0.1),
      signals: [...new Set([...currentIntention.signals, ...newIntention.signals])].slice(-10),
    };
  }

  // Otherwise keep current but note the secondary
  return {
    ...currentIntention,
    secondaryIntention: newIntention.primaryIntention,
    signals: [...new Set([...currentIntention.signals, ...newIntention.signals])].slice(-10),
  };
}

// Export types and constants
export { INTENTION_CATEGORIES, INTENTION_DESCRIPTIONS, type IntentionCategory };
