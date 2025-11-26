/**
 * Welcome Message Generator Service
 * AI-powered generation of warm, supportive welcome messages for debtors
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../../middleware/logger.js';
import { analyzeTone, quickWarmthCheck, ToneAnalysisResult } from './toneAnalyzer.js';
import {
  WELCOME_SYSTEM_PROMPT,
  buildWelcomePrompt,
  FALLBACK_WELCOME_MESSAGES,
  PLATFORM_INFO,
  OPT_OUT_INFO,
  WelcomeContext,
} from './prompts/welcome.js';

const CLAUDE_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Maximum regeneration attempts
const MAX_REGENERATION_ATTEMPTS = 3;
// Warmth threshold
const WARMTH_THRESHOLD = 80;

/**
 * Welcome message generation result
 */
export interface WelcomeResult {
  message: string;
  toneAnalysis: {
    warmth: number;
    passed: boolean;
  };
  isAiGenerated: boolean;
  regenerationAttempts: number;
  latencyMs: number;
}

/**
 * Full welcome response for API
 */
export interface WelcomeResponse {
  welcomeMessage: string;
  debtorFirstName: string;
  toneAnalysis: {
    warmth: number;
    passed: boolean;
  };
  platformInfo: {
    purpose: string;
    howItWorks: string[];
    yourOptions: string[];
  };
  optOutOptions: {
    requestNoContact: boolean;
    requestVerification: boolean;
    traditionalContact: {
      phone: string;
      email: string;
      address: string;
    };
  };
  isFirstVisit: boolean;
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
 * Generate a warm welcome message for a debtor
 * Includes automatic tone validation and regeneration if needed
 */
export async function generateWelcomeMessage(
  debtorFirstName: string,
  context: WelcomeContext
): Promise<WelcomeResult> {
  const startTime = Date.now();
  let attempts = 0;
  let lastToneAnalysis: ToneAnalysisResult | null = null;

  while (attempts < MAX_REGENERATION_ATTEMPTS) {
    attempts++;

    try {
      // Generate message
      const message = await callBedrockForWelcome(debtorFirstName, context);

      // Analyze tone
      const toneAnalysis = await analyzeTone(message);
      lastToneAnalysis = toneAnalysis;

      // Check if it passes warmth threshold
      if (toneAnalysis.passed) {
        logger.info('Welcome message generated', {
          attempts,
          warmth: toneAnalysis.warmth,
          latencyMs: Date.now() - startTime,
        });

        return {
          message,
          toneAnalysis: {
            warmth: toneAnalysis.warmth,
            passed: true,
          },
          isAiGenerated: true,
          regenerationAttempts: attempts,
          latencyMs: Date.now() - startTime,
        };
      }

      logger.warn('Welcome message failed tone check, regenerating', {
        attempt: attempts,
        warmth: toneAnalysis.warmth,
        recommendation: toneAnalysis.recommendation,
      });
    } catch (error) {
      logger.error('Welcome generation attempt failed', {
        attempt: attempts,
        error: (error as Error).message,
      });
    }
  }

  // All attempts failed, use fallback
  logger.warn('Using fallback welcome message after failed attempts', {
    attempts,
    lastWarmth: lastToneAnalysis?.warmth,
  });

  return useFallbackMessage(debtorFirstName, startTime);
}

/**
 * Call Bedrock to generate welcome message
 */
async function callBedrockForWelcome(
  debtorFirstName: string,
  context: WelcomeContext
): Promise<string> {
  const client = getBedrockClient();

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 500,
    temperature: 0.7, // Allow some creativity for warmth
    system: WELCOME_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildWelcomePrompt(debtorFirstName, context),
      },
    ],
  });

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: Buffer.from(body),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const message = responseBody.content?.[0]?.text || '';

  return message.trim();
}

/**
 * Use a pre-approved fallback message
 */
function useFallbackMessage(debtorFirstName: string, startTime: number): WelcomeResult {
  // Select random fallback
  const fallbackIndex = Math.floor(Math.random() * FALLBACK_WELCOME_MESSAGES.length);
  const template = FALLBACK_WELCOME_MESSAGES[fallbackIndex];
  const message = template.replace('{{name}}', debtorFirstName);

  // Quick warmth check on fallback (should always pass)
  const warmthCheck = quickWarmthCheck(message);

  return {
    message,
    toneAnalysis: {
      warmth: warmthCheck.warmth,
      passed: true, // Fallbacks are pre-approved
    },
    isAiGenerated: false,
    regenerationAttempts: MAX_REGENERATION_ATTEMPTS,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Build full welcome response for API
 */
export function buildWelcomeResponse(
  welcomeResult: WelcomeResult,
  debtorFirstName: string,
  isFirstVisit: boolean,
  organizationContact?: {
    phone?: string;
    email?: string;
    address?: string;
  }
): WelcomeResponse {
  return {
    welcomeMessage: welcomeResult.message,
    debtorFirstName,
    toneAnalysis: welcomeResult.toneAnalysis,
    platformInfo: PLATFORM_INFO,
    optOutOptions: {
      requestNoContact: true,
      requestVerification: true,
      traditionalContact: {
        phone: organizationContact?.phone || '1-800-XXX-XXXX',
        email: organizationContact?.email || 'support@example.com',
        address: organizationContact?.address || 'P.O. Box XXXXX, City, State ZIP',
      },
    },
    isFirstVisit,
  };
}

/**
 * Format debt amount into a range for privacy
 */
export function formatAmountRange(amount: number): string {
  if (amount < 1000) return 'under $1,000';
  if (amount < 5000) return '$1,000 - $5,000';
  if (amount < 10000) return '$5,000 - $10,000';
  if (amount < 25000) return '$10,000 - $25,000';
  if (amount < 50000) return '$25,000 - $50,000';
  return 'over $50,000';
}
