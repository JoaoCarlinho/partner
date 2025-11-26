/**
 * Feedback Formatter Service
 * Formats debtor feedback for constructive creditor viewing
 */

import { FeedbackCategory, getCategoryLabel } from './feedbackTemplates';

/**
 * Formatted feedback for creditor view
 */
export interface FormattedFeedback {
  category: FeedbackCategory;
  categoryLabel: string;
  emotionalContext: string;
  keyPoints: string[];
  proposedActions: string[];
  formattedContent: string;
  originalToneIndicator: string;
  isDispute: boolean;
  requiresResponse: boolean;
}

/**
 * Emotional context descriptions
 */
const EMOTIONAL_CONTEXTS: Record<string, string> = {
  frustrated:
    'The debtor is expressing frustration with the situation while trying to communicate their concerns.',
  anxious: 'The debtor appears anxious about their financial situation and is reaching out for help.',
  stressed: 'The debtor is experiencing financial stress and is seeking a constructive solution.',
  hopeful: 'The debtor is hopeful about finding a resolution and wants to work together.',
  determined: 'The debtor is firm in their position but open to discussion.',
  cooperative: 'The debtor is cooperative and willing to work toward a solution.',
  neutral: 'The debtor is sharing information about their situation.',
};

/**
 * Format feedback for creditor viewing
 */
export function formatForCreditor(
  originalContent: string,
  category: FeedbackCategory,
  aiAnalysis?: {
    keyPoints?: string[];
    proposedActions?: string[];
    emotionalState?: string;
  }
): FormattedFeedback {
  // Determine emotional context
  const emotionalState = aiAnalysis?.emotionalState || detectEmotionalState(originalContent);
  const emotionalContext =
    EMOTIONAL_CONTEXTS[emotionalState] || EMOTIONAL_CONTEXTS.neutral;

  // Extract or use provided key points
  const keyPoints = aiAnalysis?.keyPoints || extractKeyPoints(originalContent);

  // Extract or use provided proposed actions
  const proposedActions = aiAnalysis?.proposedActions || extractProposedActions(originalContent, category);

  // Clean content for presentation
  const formattedContent = cleanForPresentation(originalContent);

  // Determine tone indicator
  const originalToneIndicator = getToneIndicator(originalContent, emotionalState);

  // Check if requires response
  const requiresResponse = checkRequiresResponse(category, originalContent);

  return {
    category,
    categoryLabel: getCategoryLabel(category),
    emotionalContext,
    keyPoints,
    proposedActions,
    formattedContent,
    originalToneIndicator,
    isDispute: category === FeedbackCategory.DISPUTE_VALIDITY,
    requiresResponse,
  };
}

/**
 * Detect emotional state from content
 */
function detectEmotionalState(content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('frustrated') || lowerContent.includes('annoyed')) {
    return 'frustrated';
  }
  if (
    lowerContent.includes('worried') ||
    lowerContent.includes('scared') ||
    lowerContent.includes('anxious')
  ) {
    return 'anxious';
  }
  if (
    lowerContent.includes('stress') ||
    lowerContent.includes('overwhelm') ||
    lowerContent.includes('difficult')
  ) {
    return 'stressed';
  }
  if (lowerContent.includes('hope') || lowerContent.includes('willing')) {
    return 'hopeful';
  }
  if (
    lowerContent.includes('dispute') ||
    lowerContent.includes('incorrect') ||
    lowerContent.includes('not valid')
  ) {
    return 'determined';
  }
  if (
    lowerContent.includes('thank') ||
    lowerContent.includes('appreciate') ||
    lowerContent.includes('work together')
  ) {
    return 'cooperative';
  }

  return 'neutral';
}

/**
 * Extract key points from content
 */
function extractKeyPoints(content: string): string[] {
  const points: string[] = [];
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  // Take most relevant sentences as key points
  for (const sentence of sentences.slice(0, 4)) {
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      // Capitalize first letter
      points.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
    }
  }

  return points;
}

/**
 * Extract proposed actions based on category and content
 */
function extractProposedActions(content: string, category: FeedbackCategory): string[] {
  const actions: string[] = [];
  const lowerContent = content.toLowerCase();

  // Category-specific action detection
  switch (category) {
    case FeedbackCategory.FINANCIAL_HARDSHIP:
      if (lowerContent.includes('pay') || lowerContent.includes('payment')) {
        actions.push('Requesting modified payment terms');
      }
      if (lowerContent.includes('understand') || lowerContent.includes('consider')) {
        actions.push('Asking for consideration of circumstances');
      }
      break;

    case FeedbackCategory.DISPUTE_VALIDITY:
      actions.push('Formally disputing the debt');
      if (lowerContent.includes('verification') || lowerContent.includes('proof')) {
        actions.push('Requesting debt verification');
      }
      if (lowerContent.includes('documentation') || lowerContent.includes('records')) {
        actions.push('Requesting supporting documentation');
      }
      break;

    case FeedbackCategory.PAYMENT_TERMS:
      if (lowerContent.match(/\$\d+/) || lowerContent.includes('payment of')) {
        actions.push('Proposing specific payment amount');
      }
      if (lowerContent.includes('monthly') || lowerContent.includes('weekly')) {
        actions.push('Proposing payment schedule');
      }
      if (lowerContent.includes('settlement')) {
        actions.push('Interested in settlement options');
      }
      break;

    case FeedbackCategory.REQUEST_INFO:
      actions.push('Requesting additional information');
      if (lowerContent.includes('question')) {
        actions.push('Has specific questions to address');
      }
      break;

    case FeedbackCategory.GENERAL:
      if (lowerContent.includes('communicate') || lowerContent.includes('contact')) {
        actions.push('Communication preference discussion');
      }
      break;
  }

  if (actions.length === 0) {
    actions.push('General communication - review for specific requests');
  }

  return actions;
}

/**
 * Clean content for professional presentation
 */
function cleanForPresentation(content: string): string {
  let cleaned = content;

  // Remove excessive punctuation
  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/\?{2,}/g, '?');

  // Remove excessive caps (but keep first letter of sentences)
  const sentences = cleaned.split(/([.!?]+\s*)/);
  cleaned = sentences
    .map((part) => {
      if (/^[.!?]+\s*$/.test(part)) {
        return part;
      }
      // Lowercase if entire sentence is caps
      if (part === part.toUpperCase() && part.length > 3) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }
      return part;
    })
    .join('');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Get tone indicator for creditor context
 */
function getToneIndicator(content: string, emotionalState: string): string {
  const indicators: Record<string, string> = {
    frustrated: 'Frustrated but communicating',
    anxious: 'Anxious but reaching out',
    stressed: 'Under financial stress',
    hopeful: 'Hopeful and collaborative',
    determined: 'Firm but respectful',
    cooperative: 'Cooperative and solution-focused',
    neutral: 'Neutral communication',
  };

  return indicators[emotionalState] || indicators.neutral;
}

/**
 * Check if feedback requires a response
 */
function checkRequiresResponse(category: FeedbackCategory, content: string): boolean {
  // Disputes always require response
  if (category === FeedbackCategory.DISPUTE_VALIDITY) {
    return true;
  }

  // Information requests require response
  if (category === FeedbackCategory.REQUEST_INFO) {
    return true;
  }

  // Check for explicit questions
  if (content.includes('?')) {
    return true;
  }

  // Check for action requests
  const lowerContent = content.toLowerCase();
  if (
    lowerContent.includes('please respond') ||
    lowerContent.includes('let me know') ||
    lowerContent.includes('can you')
  ) {
    return true;
  }

  return false;
}

/**
 * Generate creditor-friendly summary
 */
export function generateCreditorSummary(formatted: FormattedFeedback): string {
  const lines: string[] = [];

  // Header
  lines.push(`DEBTOR FEEDBACK: ${formatted.categoryLabel}`);
  lines.push('');

  // Emotional context
  lines.push(`Emotional Context: ${formatted.emotionalContext}`);
  lines.push('');

  // Key points
  if (formatted.keyPoints.length > 0) {
    lines.push('Key Points:');
    formatted.keyPoints.forEach((point) => {
      lines.push(`  - ${point}`);
    });
    lines.push('');
  }

  // Proposed actions
  if (formatted.proposedActions.length > 0) {
    lines.push('Debtor Is Requesting:');
    formatted.proposedActions.forEach((action) => {
      lines.push(`  - ${action}`);
    });
    lines.push('');
  }

  // Tone indicator
  lines.push(`Tone: ${formatted.originalToneIndicator}`);

  // Response requirement
  if (formatted.requiresResponse) {
    lines.push('');
    lines.push('* This feedback requires a response');
  }

  return lines.join('\n');
}
