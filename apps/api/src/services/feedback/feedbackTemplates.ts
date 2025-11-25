/**
 * Feedback Templates
 * Structured templates for debtor feedback categories
 */

/**
 * Feedback category types
 */
export enum FeedbackCategory {
  FINANCIAL_HARDSHIP = 'financial_hardship',
  DISPUTE_VALIDITY = 'dispute_validity',
  PAYMENT_TERMS = 'payment_terms',
  REQUEST_INFO = 'request_info',
  GENERAL = 'general',
}

/**
 * Template prompt
 */
export interface TemplatePrompt {
  id: string;
  question: string;
  placeholder?: string;
  optional: boolean;
  inputType: 'text' | 'textarea' | 'select' | 'radio';
  options?: string[];
}

/**
 * Feedback template structure
 */
export interface FeedbackTemplate {
  category: FeedbackCategory;
  title: string;
  description: string;
  prompts: TemplatePrompt[];
  freeformAllowed: boolean;
  icon: string;
}

/**
 * Available feedback templates
 */
export const FEEDBACK_TEMPLATES: FeedbackTemplate[] = [
  {
    category: FeedbackCategory.FINANCIAL_HARDSHIP,
    title: 'Explain Your Financial Situation',
    description: 'Help the creditor understand your current circumstances so they can work with you on a solution.',
    icon: '💼',
    freeformAllowed: true,
    prompts: [
      {
        id: 'employment',
        question: 'What is your current employment situation?',
        placeholder: 'e.g., Full-time, part-time, unemployed, recently laid off...',
        optional: false,
        inputType: 'select',
        options: [
          'Employed full-time',
          'Employed part-time',
          'Self-employed',
          'Recently unemployed',
          'Long-term unemployed',
          'Retired',
          'Disabled',
          'Other',
        ],
      },
      {
        id: 'income_impact',
        question: 'How has your income been affected recently?',
        placeholder: 'Describe any changes to your income...',
        optional: true,
        inputType: 'textarea',
      },
      {
        id: 'major_expenses',
        question: 'What major expenses are affecting your ability to pay?',
        placeholder: 'e.g., Medical bills, rent increase, family obligations...',
        optional: true,
        inputType: 'textarea',
      },
      {
        id: 'proposed_amount',
        question: 'What monthly payment amount might work for you?',
        placeholder: 'Be honest about what you can realistically manage...',
        optional: false,
        inputType: 'text',
      },
      {
        id: 'additional_context',
        question: 'Is there anything else you want the creditor to understand?',
        placeholder: 'Share any other relevant context...',
        optional: true,
        inputType: 'textarea',
      },
    ],
  },
  {
    category: FeedbackCategory.DISPUTE_VALIDITY,
    title: 'Dispute This Debt',
    description: 'Formally dispute the debt and request verification. You have the right to dispute any debt.',
    icon: '⚖️',
    freeformAllowed: true,
    prompts: [
      {
        id: 'dispute_reason',
        question: 'Why do you believe this debt is incorrect?',
        placeholder: 'Explain your reason for disputing...',
        optional: false,
        inputType: 'select',
        options: [
          'I do not recognize this debt',
          'The amount is incorrect',
          'This debt has already been paid',
          'This debt was discharged in bankruptcy',
          'This debt is past the statute of limitations',
          'This is not my debt (identity issue)',
          'Other reason',
        ],
      },
      {
        id: 'dispute_details',
        question: 'Please provide more details about your dispute:',
        placeholder: 'Explain the specifics of why you believe this debt is incorrect...',
        optional: false,
        inputType: 'textarea',
      },
      {
        id: 'documentation',
        question: 'Do you have documentation to support your dispute?',
        placeholder: 'Describe any records, receipts, or documents you have...',
        optional: true,
        inputType: 'textarea',
      },
      {
        id: 'verification_request',
        question: 'What information do you need from the creditor?',
        optional: false,
        inputType: 'select',
        options: [
          'Original signed contract or agreement',
          'Complete payment history',
          'Proof of debt ownership',
          'Itemization of current balance',
          'All of the above',
        ],
      },
    ],
  },
  {
    category: FeedbackCategory.PAYMENT_TERMS,
    title: 'Request Modified Payment Terms',
    description: 'Propose a payment arrangement that works for your situation.',
    icon: '📅',
    freeformAllowed: true,
    prompts: [
      {
        id: 'current_situation',
        question: 'Briefly describe your current financial situation:',
        placeholder: 'Help them understand why you need modified terms...',
        optional: false,
        inputType: 'textarea',
      },
      {
        id: 'proposed_payment',
        question: 'What monthly payment amount are you proposing?',
        placeholder: 'e.g., $50, $100, etc.',
        optional: false,
        inputType: 'text',
      },
      {
        id: 'payment_frequency',
        question: 'How often can you make payments?',
        optional: false,
        inputType: 'select',
        options: ['Weekly', 'Bi-weekly', 'Monthly', 'Twice monthly'],
      },
      {
        id: 'start_date',
        question: 'When can you start making payments?',
        optional: false,
        inputType: 'select',
        options: [
          'Immediately',
          'In 1-2 weeks',
          'Next month',
          'In 30+ days',
        ],
      },
      {
        id: 'settlement_interest',
        question: 'Are you interested in a settlement offer?',
        optional: true,
        inputType: 'radio',
        options: [
          'Yes, I would like to discuss a lump-sum settlement',
          'No, I prefer a payment plan',
          'I would like to hear options for both',
        ],
      },
    ],
  },
  {
    category: FeedbackCategory.REQUEST_INFO,
    title: 'Request More Information',
    description: 'Ask questions about the debt or the collection process.',
    icon: '❓',
    freeformAllowed: true,
    prompts: [
      {
        id: 'info_type',
        question: 'What type of information do you need?',
        optional: false,
        inputType: 'select',
        options: [
          'Account balance and breakdown',
          'Payment history',
          'Original creditor information',
          'Available payment options',
          'Settlement possibilities',
          'Legal rights and process',
          'Other',
        ],
      },
      {
        id: 'specific_questions',
        question: 'What specific questions do you have?',
        placeholder: 'List your questions here...',
        optional: false,
        inputType: 'textarea',
      },
      {
        id: 'preferred_response',
        question: 'How would you like to receive this information?',
        optional: true,
        inputType: 'select',
        options: [
          'Through this messaging system',
          'By email',
          'By mail',
          'Phone call',
        ],
      },
    ],
  },
  {
    category: FeedbackCategory.GENERAL,
    title: 'Share Your Concerns',
    description: "Express any concerns or feedback that doesn't fit other categories.",
    icon: '💬',
    freeformAllowed: true,
    prompts: [
      {
        id: 'concern_type',
        question: 'What would you like to discuss?',
        optional: true,
        inputType: 'select',
        options: [
          'Communication preferences',
          'Previous experiences',
          'General concerns',
          'Suggestions',
          'Other',
        ],
      },
      {
        id: 'message',
        question: 'Share your thoughts:',
        placeholder: 'Write your message here...',
        optional: false,
        inputType: 'textarea',
      },
    ],
  },
];

/**
 * Get template by category
 */
export function getTemplateByCategory(category: FeedbackCategory): FeedbackTemplate | undefined {
  return FEEDBACK_TEMPLATES.find((t) => t.category === category);
}

/**
 * Get all template summaries
 */
export function getTemplateSummaries(): Array<{
  category: FeedbackCategory;
  title: string;
  description: string;
  icon: string;
}> {
  return FEEDBACK_TEMPLATES.map((t) => ({
    category: t.category,
    title: t.title,
    description: t.description,
    icon: t.icon,
  }));
}

/**
 * Get category label
 */
export function getCategoryLabel(category: FeedbackCategory): string {
  const labels: Record<FeedbackCategory, string> = {
    [FeedbackCategory.FINANCIAL_HARDSHIP]: 'Financial Hardship Explanation',
    [FeedbackCategory.DISPUTE_VALIDITY]: 'Debt Dispute',
    [FeedbackCategory.PAYMENT_TERMS]: 'Payment Terms Request',
    [FeedbackCategory.REQUEST_INFO]: 'Information Request',
    [FeedbackCategory.GENERAL]: 'General Feedback',
  };
  return labels[category] || 'Feedback';
}
