/**
 * Assessment Conversation Prompts
 * AI prompts for financial assessment conversation
 */

export const ASSESSMENT_SYSTEM_PROMPT = `You are a compassionate financial counselor helping someone understand their financial situation.

Your role is to guide them through sharing relevant information that will help find a payment solution.

CRITICAL RULES:
1. Be warm, supportive, and non-judgmental
2. NEVER pressure for information - everything detailed is optional
3. Use simple language
4. Acknowledge that finances can be stressful
5. Remind them they're in control of what they share
6. Focus on understanding, not interrogating

CONVERSATION STYLE:
- Conversational, like talking to a supportive friend
- Short messages (2-3 sentences max)
- Ask one thing at a time
- Validate their responses ("That makes sense", "I understand")
- Offer encouragement

CONTEXT:
- You're helping collect financial information to suggest suitable payment options
- The debtor owes {debtAmount} to {creditorName}
- They've already seen the demand letter and understand their situation`;

export const ASSESSMENT_QUESTIONS = {
  intro: `Let's understand your situation better so we can find options that work for you. There's no judgment here, and you only need to share what you're comfortable with. Ready to start?`,

  income: `First, can you give me a sense of your monthly income? A rough range is fine - we just want to understand what's realistic for you.`,

  expenses: `Thanks for sharing that. What are your main monthly expenses? Things like housing, utilities, transportation, food - whatever comes to mind.`,

  obligations: `Are there other financial obligations you're managing right now? Other debts, bills, or payments? Again, just a general sense is helpful.`,

  stress: `I appreciate you sharing all of this. Before we wrap up, I want to check in - how are you feeling about your financial situation right now?`,

  summary: `Based on what you've shared, here's what I understand: {summary}. Does this sound right? We can use this to find payment options that fit your situation.`,
};

export const STAGE_TRANSITIONS = {
  intro: {
    positive: ['income'],
    skip: ['income'],
    negative: null, // Allow opt-out
  },
  income: {
    next: 'expenses',
    skip: 'expenses',
  },
  expenses: {
    next: 'obligations',
    skip: 'obligations',
  },
  obligations: {
    next: 'stress',
    skip: 'stress',
  },
  stress: {
    next: 'summary',
    skip: 'summary',
  },
  summary: {
    next: 'complete',
    skip: 'complete',
  },
};

export const INCOME_RANGES = [
  { value: 'under_1500', label: 'Under $1,500/month', midpoint: 1000 },
  { value: '1500_3000', label: '$1,500 - $3,000/month', midpoint: 2250 },
  { value: '3000_5000', label: '$3,000 - $5,000/month', midpoint: 4000 },
  { value: '5000_7500', label: '$5,000 - $7,500/month', midpoint: 6250 },
  { value: 'over_7500', label: 'Over $7,500/month', midpoint: 10000 },
  { value: 'prefer_not', label: 'Prefer not to say', midpoint: null },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Housing (rent/mortgage)', icon: '🏠' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'food', label: 'Food/groceries', icon: '🛒' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'childcare', label: 'Childcare', icon: '👶' },
  { value: 'other', label: 'Other essentials', icon: '📦' },
] as const;

export const OBLIGATION_TYPES = [
  { value: 'other_collections', label: 'Other collections' },
  { value: 'credit_cards', label: 'Credit cards' },
  { value: 'medical_bills', label: 'Medical bills' },
  { value: 'student_loans', label: 'Student loans' },
  { value: 'auto_loans', label: 'Auto loans' },
  { value: 'other', label: 'Other' },
] as const;

export const STRESS_LEVELS = [
  { value: 1, label: 'Very stressed', color: '#EF4444', escalate: true },
  { value: 2, label: 'Quite stressed', color: '#F97316', escalate: false },
  { value: 3, label: 'Somewhat stressed', color: '#F59E0B', escalate: false },
  { value: 4, label: 'A little stressed', color: '#84CC16', escalate: false },
  { value: 5, label: 'Managing okay', color: '#10B981', escalate: false },
] as const;

export const STRESS_RESOURCES = [
  'National Foundation for Credit Counseling: 1-800-388-2227',
  'Consumer Financial Protection Bureau: consumerfinance.gov',
  'You can also request to speak with a human representative',
];

export const FOLLOW_UP_PROMPTS = {
  income_low: `Thank you for sharing. We understand that budgets can be tight. We'll work to find options that fit your situation.`,
  income_high: `Thanks for that information. Let's see what options make sense for you.`,
  income_skip: `That's completely fine - you can always share this later if you'd like. Let's continue.`,

  expenses_high: `It sounds like you have a lot of essential expenses. That's important for us to know as we look at payment options.`,
  expenses_moderate: `Thanks for sharing that. It helps us understand your monthly commitments.`,

  obligations_yes: `I understand - managing multiple payments can be challenging. We'll take that into account.`,
  obligations_no: `Got it. That's helpful context as we look at what might work for you.`,

  stress_high: `I hear you, and I want you to know that you're not alone in feeling this way. Many people find financial situations stressful. Here are some resources that might help, and remember - we're here to work with you, not against you.`,
  stress_moderate: `That's understandable. Financial situations can be stressful. Let's see what options can help reduce some of that pressure.`,
  stress_low: `It's great that you're feeling okay about this. Let's find the best path forward for you.`,
};
