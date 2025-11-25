/**
 * Sentiment Analysis Service
 * Analyzes emotional content of debtor communications
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SENTIMENT_SYSTEM_PROMPT, SENTIMENT_USER_PROMPT } from './prompts/sentiment';

// Sentiment result interface
export interface SentimentResult {
  overall: 'positive' | 'neutral' | 'negative';
  emotions: {
    anxious: number;
    frustrated: number;
    hopeful: number;
    calm: number;
    confused: number;
    resigned: number;
  };
  engagement: 'high' | 'medium' | 'low';
  concerningPhrases: string[];
  stressIndicator: number; // 1-5
  analysis: string;
}

// Analysis context
export type AnalysisContext = 'message' | 'assessment' | 'chat' | 'general';

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Analyze sentiment of text using Claude Haiku (fast)
 */
export async function analyzeSentiment(
  text: string,
  context: AnalysisContext = 'general'
): Promise<SentimentResult> {
  // Quick check for empty or very short text
  if (!text || text.trim().length < 5) {
    return getDefaultSentiment();
  }

  try {
    const userPrompt = SENTIMENT_USER_PROMPT
      .replace('{text}', text)
      .replace('{context}', contextDescription(context));

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 500,
      system: SENTIMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Fast model for sentiment
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
      const parsed = JSON.parse(jsonMatch[0]) as SentimentResult;
      return validateSentimentResult(parsed);
    }

    return getDefaultSentiment();
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return getDefaultSentiment();
  }
}

/**
 * Analyze sentiment with keyword-based fallback (no AI)
 * Useful for quick checks or when AI is unavailable
 */
export function analyzeBasicSentiment(text: string): SentimentResult {
  const lowercaseText = text.toLowerCase();

  // Keyword-based emotion detection
  const emotions = {
    anxious: detectKeywords(lowercaseText, ['worried', 'scared', 'anxious', 'nervous', 'afraid', 'panic']),
    frustrated: detectKeywords(lowercaseText, ['frustrated', 'angry', 'annoyed', 'upset', 'irritated', 'mad']),
    hopeful: detectKeywords(lowercaseText, ['hope', 'hopeful', 'optimistic', 'positive', 'looking forward']),
    calm: detectKeywords(lowercaseText, ['calm', 'okay', 'fine', 'alright', 'good', 'comfortable']),
    confused: detectKeywords(lowercaseText, ['confused', "don't understand", 'unclear', 'what does', 'why']),
    resigned: detectKeywords(lowercaseText, ['whatever', "don't care", 'give up', 'no point', 'nothing I can do']),
  };

  // Calculate overall sentiment
  const positiveScore = emotions.hopeful + emotions.calm;
  const negativeScore = emotions.anxious + emotions.frustrated + emotions.resigned;
  const overall: 'positive' | 'neutral' | 'negative' =
    positiveScore > negativeScore + 0.2 ? 'positive' : negativeScore > positiveScore + 0.2 ? 'negative' : 'neutral';

  // Calculate stress indicator
  const stressScore = emotions.anxious + emotions.frustrated + emotions.resigned - emotions.calm - emotions.hopeful;
  const stressIndicator = Math.max(1, Math.min(5, Math.round(3 - stressScore * 2)));

  // Detect concerning phrases
  const concerningPhrases = detectConcerningPhrases(lowercaseText);

  return {
    overall,
    emotions,
    engagement: text.length > 200 ? 'high' : text.length > 50 ? 'medium' : 'low',
    concerningPhrases,
    stressIndicator,
    analysis: `Basic keyword analysis: ${overall} sentiment with stress level ${stressIndicator}`,
  };
}

/**
 * Calculate aggregate stress level from sentiment history
 */
export function calculateAggregateStress(sentimentHistory: SentimentResult[]): number {
  if (sentimentHistory.length === 0) return 3; // Default to moderate

  // Weight recent interactions more heavily
  const weights = sentimentHistory.map((_, index) => Math.pow(1.5, index));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const weightedStress = sentimentHistory.reduce((sum, sentiment, index) => {
    return sum + sentiment.stressIndicator * weights[index];
  }, 0);

  return Math.round(weightedStress / totalWeight);
}

/**
 * Detect keywords in text and return confidence score
 */
function detectKeywords(text: string, keywords: string[]): number {
  let matches = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches++;
    }
  }
  return Math.min(1, matches * 0.3);
}

/**
 * Detect concerning phrases that may indicate distress
 */
function detectConcerningPhrases(text: string): string[] {
  const concerningPatterns = [
    "can't handle",
    'too much',
    'breaking down',
    "can't cope",
    'falling apart',
    'no way out',
    'desperate',
    'hopeless',
    "don't know what to do",
    'end of my rope',
  ];

  return concerningPatterns.filter((pattern) => text.includes(pattern));
}

/**
 * Get context description for prompt
 */
function contextDescription(context: AnalysisContext): string {
  switch (context) {
    case 'message':
      return 'This is a message sent by the debtor through the platform.';
    case 'assessment':
      return 'This is a response from the financial assessment conversation.';
    case 'chat':
      return 'This is a message from a live chat session.';
    default:
      return 'This is a general communication from the debtor.';
  }
}

/**
 * Validate and normalize sentiment result
 */
function validateSentimentResult(result: Partial<SentimentResult>): SentimentResult {
  const defaultResult = getDefaultSentiment();

  return {
    overall: result.overall || defaultResult.overall,
    emotions: {
      anxious: clamp(result.emotions?.anxious ?? 0, 0, 1),
      frustrated: clamp(result.emotions?.frustrated ?? 0, 0, 1),
      hopeful: clamp(result.emotions?.hopeful ?? 0, 0, 1),
      calm: clamp(result.emotions?.calm ?? 0, 0, 1),
      confused: clamp(result.emotions?.confused ?? 0, 0, 1),
      resigned: clamp(result.emotions?.resigned ?? 0, 0, 1),
    },
    engagement: result.engagement || defaultResult.engagement,
    concerningPhrases: result.concerningPhrases || [],
    stressIndicator: clamp(result.stressIndicator ?? 3, 1, 5),
    analysis: result.analysis || 'No analysis available',
  };
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get default neutral sentiment
 */
function getDefaultSentiment(): SentimentResult {
  return {
    overall: 'neutral',
    emotions: {
      anxious: 0,
      frustrated: 0,
      hopeful: 0,
      calm: 0.5,
      confused: 0,
      resigned: 0,
    },
    engagement: 'medium',
    concerningPhrases: [],
    stressIndicator: 3,
    analysis: 'Default sentiment - insufficient data for analysis',
  };
}
