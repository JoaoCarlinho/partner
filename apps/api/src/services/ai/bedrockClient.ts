/**
 * AWS Bedrock Client
 * Wraps AWS Bedrock SDK for AI model invocation
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../../middleware/logger.js';

// Model configurations
const MODELS = {
  CLAUDE_SONNET: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  CLAUDE_HAIKU: 'anthropic.claude-3-5-haiku-20241022-v1:0',
} as const;

// Default model for letter generation
const DEFAULT_MODEL = MODELS.CLAUDE_SONNET;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface InvokeOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  modelId?: string;
}

interface InvokeResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  latencyMs: number;
}

interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  error?: string;
}

// Create singleton client
let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      // VPC endpoint will be used automatically when in VPC
    });
  }
  return client;
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
}

/**
 * Invoke Claude model with retry logic
 */
export async function invokeModel(
  prompt: string,
  options: InvokeOptions = {}
): Promise<InvokeResult> {
  const {
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    modelId = DEFAULT_MODEL,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const bedrockClient = getClient();

      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
        ...(systemPrompt && { system: systemPrompt }),
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      logger.info('Invoking Bedrock model', {
        modelId,
        attempt: attempt + 1,
        promptLength: prompt.length,
      });

      const response = await bedrockClient.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));

      const latencyMs = Date.now() - startTime;

      logger.info('Bedrock invocation successful', {
        modelId,
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens,
        latencyMs,
      });

      return {
        content: body.content[0].text,
        usage: {
          inputTokens: body.usage?.input_tokens || 0,
          outputTokens: body.usage?.output_tokens || 0,
        },
        modelId,
        latencyMs,
      };
    } catch (error) {
      lastError = error as Error;
      const isRetryable = isRetryableError(error);

      logger.warn('Bedrock invocation failed', {
        modelId,
        attempt: attempt + 1,
        error: (error as Error).message,
        isRetryable,
      });

      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        break;
      }

      const delay = getBackoffDelay(attempt);
      logger.info(`Retrying after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw new BedrockError(
    `Failed to invoke model after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    lastError
  );
}

/**
 * Invoke Claude model with streaming response
 */
export async function* invokeModelStream(
  prompt: string,
  options: InvokeOptions = {}
): AsyncGenerator<StreamChunk> {
  const {
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    modelId = DEFAULT_MODEL,
  } = options;

  try {
    const bedrockClient = getClient();

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
      ...(systemPrompt && { system: systemPrompt }),
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    logger.info('Starting streaming Bedrock invocation', {
      modelId,
      promptLength: prompt.length,
    });

    const response = await bedrockClient.send(command);

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            yield { type: 'content', content: chunk.delta.text };
          } else if (chunk.type === 'message_stop') {
            yield { type: 'done' };
          }
        }
      }
    }

    logger.info('Streaming invocation completed', { modelId });
  } catch (error) {
    logger.error('Streaming invocation failed', {
      error: (error as Error).message,
    });
    yield { type: 'error', error: (error as Error).message };
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorName = error.name;
    const errorMessage = error.message.toLowerCase();

    // Retryable error types
    if (
      errorName === 'ThrottlingException' ||
      errorName === 'ServiceUnavailableException' ||
      errorName === 'InternalServerException' ||
      errorMessage.includes('throttl') ||
      errorMessage.includes('rate') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('temporarily unavailable')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Custom error class for Bedrock errors
 */
export class BedrockError extends Error {
  public readonly cause: Error | null;

  constructor(message: string, cause: Error | null = null) {
    super(message);
    this.name = 'BedrockError';
    this.cause = cause;
  }
}

/**
 * Get available models
 */
export function getAvailableModels(): Record<string, string> {
  return { ...MODELS };
}

/**
 * Check if Bedrock is available (for health checks)
 */
export async function checkBedrockHealth(): Promise<boolean> {
  try {
    // Simple invocation to check connectivity
    await invokeModel('Say "ok"', {
      maxTokens: 10,
      modelId: MODELS.CLAUDE_HAIKU, // Use cheaper model for health check
    });
    return true;
  } catch {
    return false;
  }
}
