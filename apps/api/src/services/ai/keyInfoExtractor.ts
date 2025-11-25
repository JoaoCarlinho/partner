/**
 * Key Information Extractor Service
 * Extracts structured key information from demand letters
 */

import { invokeModel } from './bedrockClient.js';
import { buildKeyInfoExtractionPrompt } from './prompts/paraphrase.js';
import { logger } from '../../middleware/logger.js';

/**
 * Amount breakdown structure
 */
export interface AmountBreakdown {
  principal: number | null;
  interest: number | null;
  fees: number | null;
  total: number;
}

/**
 * Available action/option for debtor
 */
export interface DebtorOption {
  action: 'pay' | 'dispute' | 'negotiate' | 'request_info';
  description: string;
  link?: string;
}

/**
 * Extracted key information from demand letter
 */
export interface KeyInfo {
  totalAmount: AmountBreakdown;
  creditorName: string;
  originalCreditor: string | null;
  accountNumber: string | null;
  responseDeadline: string | null;
  debtDate: string | null;
  options: DebtorOption[];
}

/**
 * Display-ready key information
 */
export interface KeyInfoDisplay {
  amount: {
    total: string;
    breakdown: {
      principal: string | null;
      interest: string | null;
      fees: string | null;
    };
  };
  creditor: {
    name: string;
    original: string | null;
    account: string | null;
  };
  timeline: {
    debtDate: string | null;
    deadline: string | null;
    daysRemaining: number | null;
    urgencyLevel: 'low' | 'medium' | 'high';
  };
  options: {
    primary: 'pay' | 'negotiate' | 'dispute';
    available: DebtorOption[];
  };
}

/**
 * Extraction result
 */
export interface KeyInfoExtractionResult {
  success: boolean;
  keyInfo?: KeyInfo;
  displayInfo?: KeyInfoDisplay;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Extract key information from demand letter content
 */
export async function extractKeyInfo(letterContent: string): Promise<KeyInfoExtractionResult> {
  try {
    logger.info('Extracting key information from demand letter', {
      contentLength: letterContent.length,
    });

    const prompt = buildKeyInfoExtractionPrompt(letterContent);
    const response = await invokeModel(prompt, {
      systemPrompt: 'You are a legal document analyst. Extract information accurately and return valid JSON only.',
      maxTokens: 2000,
      temperature: 0.2, // Low temperature for consistent extraction
    });

    // Parse JSON response
    let keyInfo: KeyInfo;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      keyInfo = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('Failed to parse key info JSON', {
        error: (parseError as Error).message,
        response: response.content.substring(0, 500),
      });
      return {
        success: false,
        errorCode: 'PARSE_ERROR',
        errorMessage: 'Unable to extract key information from the letter.',
      };
    }

    // Validate required fields
    if (!keyInfo.totalAmount || typeof keyInfo.totalAmount.total !== 'number') {
      logger.error('Invalid key info structure: missing total amount');
      return {
        success: false,
        errorCode: 'INVALID_DATA',
        errorMessage: 'Could not determine the total amount owed.',
      };
    }

    // Generate display-ready information
    const displayInfo = formatForDisplay(keyInfo);

    logger.info('Key information extracted successfully', {
      total: keyInfo.totalAmount.total,
      creditor: keyInfo.creditorName,
      optionsCount: keyInfo.options?.length || 0,
    });

    return {
      success: true,
      keyInfo,
      displayInfo,
    };
  } catch (error) {
    logger.error('Key info extraction failed', {
      error: (error as Error).message,
    });

    return {
      success: false,
      errorCode: 'EXTRACTION_FAILED',
      errorMessage: 'Unable to extract key information. Please try again.',
    };
  }
}

/**
 * Format key info for display
 */
function formatForDisplay(keyInfo: KeyInfo): KeyInfoDisplay {
  const formatCurrency = (amount: number | null): string | null => {
    if (amount === null) return null;
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (keyInfo.responseDeadline) {
    const deadline = new Date(keyInfo.responseDeadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Determine urgency level
  let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
  if (daysRemaining !== null) {
    if (daysRemaining <= 7) {
      urgencyLevel = 'high';
    } else if (daysRemaining <= 14) {
      urgencyLevel = 'medium';
    }
  }

  // Determine primary option (default to negotiate)
  let primaryOption: 'pay' | 'negotiate' | 'dispute' = 'negotiate';
  if (keyInfo.options?.some(o => o.action === 'dispute')) {
    // If dispute is available and amount is contested, prioritize it
    primaryOption = 'dispute';
  }

  // Ensure default options are available
  const defaultOptions: DebtorOption[] = [
    { action: 'pay', description: 'Pay the full amount' },
    { action: 'negotiate', description: 'Set up a payment plan' },
    { action: 'dispute', description: 'Dispute this debt' },
    { action: 'request_info', description: 'Request more information' },
  ];

  const options = keyInfo.options?.length > 0 ? keyInfo.options : defaultOptions;

  return {
    amount: {
      total: formatCurrency(keyInfo.totalAmount.total) || '$0.00',
      breakdown: {
        principal: formatCurrency(keyInfo.totalAmount.principal),
        interest: formatCurrency(keyInfo.totalAmount.interest),
        fees: formatCurrency(keyInfo.totalAmount.fees),
      },
    },
    creditor: {
      name: keyInfo.creditorName || 'Unknown Creditor',
      original: keyInfo.originalCreditor,
      account: keyInfo.accountNumber,
    },
    timeline: {
      debtDate: keyInfo.debtDate,
      deadline: keyInfo.responseDeadline,
      daysRemaining,
      urgencyLevel,
    },
    options: {
      primary: primaryOption,
      available: options,
    },
  };
}

/**
 * Mask account number for display (show last 4 digits)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }
  const lastFour = accountNumber.slice(-4);
  return `****${lastFour}`;
}
