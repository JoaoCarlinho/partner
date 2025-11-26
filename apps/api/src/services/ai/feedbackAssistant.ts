/**
 * Feedback Assistant Service
 * AI-powered assistance for helping debtors articulate their concerns
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  FEEDBACK_ASSIST_SYSTEM_PROMPT,
  FEEDBACK_ASSIST_USER_PROMPT,
  DEBTOR_TONE_COACHING_PROMPT,
  CATEGORY_GUIDANCE,
  CONSTRUCTIVE_TRANSFORMS,
  EMOTIONAL_FRAMINGS,
} from './prompts/feedbackAssist';
import { FeedbackCategory } from '../feedback/feedbackTemplates';

/**
 * Assisted feedback result
 */
export interface AssistedFeedback {
  structuredFeedback: string;
  keyPoints: string[];
  suggestedTone: 'respectful' | 'empathetic' | 'firm' | 'urgent';
  preservedIntents: string[];
  proposedActions: string[];
  wasAssisted: boolean;
  assistanceTime: number;
}

/**
 * Tone coaching result
 */
export interface ToneCoachingResult {
  toneAssessment: 'appropriate' | 'could_improve' | 'needs_attention';
  emotionalState: string;
  coachingNote: string;
  suggestedRevision: string | null;
  preserveElements: string[];
}

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Assist debtor with articulating their feedback
 */
export async function assistFeedback(
  rawInput: string,
  category: FeedbackCategory
): Promise<AssistedFeedback> {
  const startTime = Date.now();

  // Handle empty input
  if (!rawInput || rawInput.trim().length === 0) {
    return createEmptyResult(startTime);
  }

  // For very short inputs, use local processing
  if (rawInput.length < 30) {
    return processLocally(rawInput, category, startTime);
  }

  try {
    // Build the prompt with category-specific guidance
    const categoryGuidance = CATEGORY_GUIDANCE[category] || CATEGORY_GUIDANCE.general;
    const userPrompt = FEEDBACK_ASSIST_USER_PROMPT.replace('{rawInput}', sanitizeForPrompt(rawInput))
      .replace('{category}', category)
      + `\n\nCategory-specific guidance:\n${categoryGuidance}`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      system: FEEDBACK_ASSIST_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Fast model for assistance
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
      return validateAssistedFeedback(parsed, rawInput, startTime);
    }

    // Fallback to local processing
    return processLocally(rawInput, category, startTime);
  } catch (error) {
    console.error('Feedback assistance AI failed:', error);
    return processLocally(rawInput, category, startTime);
  }
}

/**
 * Provide tone coaching for debtor message
 */
export async function coachTone(message: string): Promise<ToneCoachingResult> {
  // Handle empty input
  if (!message || message.trim().length === 0) {
    return {
      toneAssessment: 'appropriate',
      emotionalState: 'neutral',
      coachingNote: 'Please share what you would like to communicate.',
      suggestedRevision: null,
      preserveElements: [],
    };
  }

  try {
    const userPrompt = DEBTOR_TONE_COACHING_PROMPT.replace('{message}', sanitizeForPrompt(message));

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
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

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateToneCoaching(parsed);
    }

    return coachLocally(message);
  } catch (error) {
    console.error('Tone coaching AI failed:', error);
    return coachLocally(message);
  }
}

/**
 * Local fallback processing for feedback assistance
 */
function processLocally(
  rawInput: string,
  category: FeedbackCategory,
  startTime: number
): AssistedFeedback {
  let processedText = rawInput;

  // Apply constructive transforms
  for (const transform of CONSTRUCTIVE_TRANSFORMS) {
    processedText = processedText.replace(transform.pattern, transform.replacement);
  }

  // Extract key points (simple sentence splitting)
  const sentences = processedText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const keyPoints = sentences.slice(0, 3).map((s) => s.trim());

  // Determine tone based on content
  const lowerText = rawInput.toLowerCase();
  let suggestedTone: AssistedFeedback['suggestedTone'] = 'respectful';

  if (lowerText.includes('urgent') || lowerText.includes('immediately') || lowerText.includes('asap')) {
    suggestedTone = 'urgent';
  } else if (
    lowerText.includes('difficult') ||
    lowerText.includes('struggling') ||
    lowerText.includes('hard')
  ) {
    suggestedTone = 'empathetic';
  } else if (
    lowerText.includes('dispute') ||
    lowerText.includes('incorrect') ||
    lowerText.includes('wrong')
  ) {
    suggestedTone = 'firm';
  }

  // Extract proposed actions
  const proposedActions: string[] = [];
  if (lowerText.includes('pay') || lowerText.includes('payment')) {
    proposedActions.push('Discussing payment options');
  }
  if (lowerText.includes('information') || lowerText.includes('question')) {
    proposedActions.push('Requesting information');
  }
  if (lowerText.includes('dispute') || lowerText.includes('verify')) {
    proposedActions.push('Disputing or requesting verification');
  }

  return {
    structuredFeedback: processedText.trim(),
    keyPoints,
    suggestedTone,
    preservedIntents: keyPoints,
    proposedActions: proposedActions.length > 0 ? proposedActions : ['General communication'],
    wasAssisted: true,
    assistanceTime: Date.now() - startTime,
  };
}

/**
 * Local tone coaching fallback
 */
function coachLocally(message: string): ToneCoachingResult {
  const lowerMessage = message.toLowerCase();

  // Detect emotional state
  let emotionalState = 'neutral';
  let toneAssessment: ToneCoachingResult['toneAssessment'] = 'appropriate';
  let coachingNote = 'Your message is clear and appropriate.';
  let suggestedRevision: string | null = null;
  const preserveElements: string[] = [];

  // Check for concerning patterns
  const hasAggression =
    lowerMessage.includes('hate') ||
    lowerMessage.includes('stupid') ||
    lowerMessage.includes('idiot');

  const hasFrustration =
    lowerMessage.includes('frustrated') ||
    lowerMessage.includes("can't believe") ||
    lowerMessage.includes('ridiculous');

  const hasAnxiety =
    lowerMessage.includes('worried') ||
    lowerMessage.includes('scared') ||
    lowerMessage.includes('anxious');

  if (hasAggression) {
    emotionalState = 'angry';
    toneAssessment = 'needs_attention';
    const framing = EMOTIONAL_FRAMINGS.angry;
    coachingNote = `${framing.acknowledgment} ${framing.coaching}`;

    // Apply transforms for suggested revision
    suggestedRevision = message;
    for (const transform of CONSTRUCTIVE_TRANSFORMS) {
      suggestedRevision = suggestedRevision.replace(transform.pattern, transform.replacement);
    }
  } else if (hasFrustration) {
    emotionalState = 'frustrated';
    toneAssessment = 'could_improve';
    const framing = EMOTIONAL_FRAMINGS.frustrated;
    coachingNote = `${framing.acknowledgment} ${framing.coaching}`;
    preserveElements.push('Your honest expression of frustration');
  } else if (hasAnxiety) {
    emotionalState = 'anxious';
    toneAssessment = 'appropriate';
    const framing = EMOTIONAL_FRAMINGS.scared;
    coachingNote = `${framing.acknowledgment} ${framing.coaching}`;
    preserveElements.push('Your honest sharing of concerns');
  }

  // Check for positive elements
  if (lowerMessage.includes('thank') || lowerMessage.includes('appreciate')) {
    preserveElements.push('Your polite tone');
  }
  if (lowerMessage.includes('willing') || lowerMessage.includes('want to work')) {
    preserveElements.push('Your willingness to collaborate');
  }

  return {
    toneAssessment,
    emotionalState,
    coachingNote,
    suggestedRevision,
    preserveElements,
  };
}

/**
 * Validate AI response for assisted feedback
 */
function validateAssistedFeedback(
  parsed: Partial<AssistedFeedback>,
  originalInput: string,
  startTime: number
): AssistedFeedback {
  return {
    structuredFeedback: parsed.structuredFeedback || originalInput,
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    suggestedTone: (['respectful', 'empathetic', 'firm', 'urgent'] as const).includes(
      parsed.suggestedTone as AssistedFeedback['suggestedTone']
    )
      ? (parsed.suggestedTone as AssistedFeedback['suggestedTone'])
      : 'respectful',
    preservedIntents: Array.isArray(parsed.preservedIntents) ? parsed.preservedIntents : [],
    proposedActions: Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [],
    wasAssisted: true,
    assistanceTime: Date.now() - startTime,
  };
}

/**
 * Validate AI response for tone coaching
 */
function validateToneCoaching(parsed: Partial<ToneCoachingResult>): ToneCoachingResult {
  return {
    toneAssessment: (['appropriate', 'could_improve', 'needs_attention'] as const).includes(
      parsed.toneAssessment as ToneCoachingResult['toneAssessment']
    )
      ? (parsed.toneAssessment as ToneCoachingResult['toneAssessment'])
      : 'appropriate',
    emotionalState: parsed.emotionalState || 'neutral',
    coachingNote: parsed.coachingNote || 'Your message looks good.',
    suggestedRevision: parsed.suggestedRevision || null,
    preserveElements: Array.isArray(parsed.preserveElements) ? parsed.preserveElements : [],
  };
}

/**
 * Create empty result
 */
function createEmptyResult(startTime: number): AssistedFeedback {
  return {
    structuredFeedback: '',
    keyPoints: [],
    suggestedTone: 'respectful',
    preservedIntents: [],
    proposedActions: [],
    wasAssisted: false,
    assistanceTime: Date.now() - startTime,
  };
}

/**
 * Sanitize for prompt
 */
function sanitizeForPrompt(text: string): string {
  return text.replace(/```/g, '').replace(/\{/g, '(').replace(/\}/g, ')').slice(0, 2000);
}
