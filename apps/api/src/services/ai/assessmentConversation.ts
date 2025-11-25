/**
 * Assessment Conversation Service
 * Manages AI-guided financial assessment conversations
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  ASSESSMENT_SYSTEM_PROMPT,
  ASSESSMENT_QUESTIONS,
  INCOME_RANGES,
  EXPENSE_CATEGORIES,
  OBLIGATION_TYPES,
  STRESS_LEVELS,
  STRESS_RESOURCES,
  FOLLOW_UP_PROMPTS,
} from './prompts/assessment';

// Assessment stages
export type AssessmentStage = 'intro' | 'income' | 'expenses' | 'obligations' | 'stress' | 'summary' | 'complete';

// Response types
export type ResponseType = 'selection' | 'multi_selection' | 'freetext' | 'scale' | 'skip';

// Input types for UI
export type InputType = 'buttons' | 'select' | 'multi_select' | 'range' | 'slider' | 'text' | 'scale';

// Assessment session state
export interface AssessmentSession {
  sessionId: string;
  debtorProfileId: string;
  caseId: string;
  currentStage: AssessmentStage;
  responses: AssessmentResponses;
  conversationHistory: ConversationMessage[];
  startedAt: Date;
  lastUpdatedAt: Date;
  metadata: {
    debtAmount: number;
    creditorName: string;
  };
}

export interface AssessmentResponses {
  incomeRange?: string;
  incomeDetails?: {
    wages?: number;
    benefits?: number;
    other?: number;
  };
  expenseCategories?: string[];
  expenseLevel?: 'low' | 'moderate' | 'high';
  expenseNotes?: string;
  otherObligations?: string[];
  obligationAmount?: string;
  obligationNotes?: string;
  stressLevel?: number;
  stressNotes?: string;
}

export interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  stage: AssessmentStage;
}

export interface StageResponse {
  nextStage: AssessmentStage;
  message: string;
  followUpMessage?: string;
  options?: Array<{ value: string; label: string }>;
  inputType: InputType;
  allowSkip: boolean;
  complete: boolean;
  escalate?: boolean;
  resources?: string[];
}

// In-memory session store (would use Redis in production)
const sessions = new Map<string, AssessmentSession>();

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `assess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Start a new assessment session
 */
export async function startAssessmentSession(
  debtorProfileId: string,
  caseId: string,
  metadata: { debtAmount: number; creditorName: string }
): Promise<{ sessionId: string; response: StageResponse }> {
  const sessionId = generateSessionId();

  const session: AssessmentSession = {
    sessionId,
    debtorProfileId,
    caseId,
    currentStage: 'intro',
    responses: {},
    conversationHistory: [],
    startedAt: new Date(),
    lastUpdatedAt: new Date(),
    metadata,
  };

  sessions.set(sessionId, session);

  const introMessage = ASSESSMENT_QUESTIONS.intro;
  session.conversationHistory.push({
    role: 'assistant',
    content: introMessage,
    timestamp: new Date(),
    stage: 'intro',
  });

  return {
    sessionId,
    response: {
      nextStage: 'intro',
      message: introMessage,
      options: [
        { value: 'ready', label: "Yes, I'm ready" },
        { value: 'later', label: 'Maybe later' },
      ],
      inputType: 'buttons',
      allowSkip: true,
      complete: false,
    },
  };
}

/**
 * Process a response from the user
 */
export async function processResponse(
  sessionId: string,
  response: {
    type: ResponseType;
    value: string | string[];
  }
): Promise<StageResponse> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Record user response
  session.conversationHistory.push({
    role: 'user',
    content: Array.isArray(response.value) ? response.value.join(', ') : response.value,
    timestamp: new Date(),
    stage: session.currentStage,
  });

  // Process based on current stage
  let stageResponse: StageResponse;

  switch (session.currentStage) {
    case 'intro':
      stageResponse = await processIntroResponse(session, response);
      break;
    case 'income':
      stageResponse = await processIncomeResponse(session, response);
      break;
    case 'expenses':
      stageResponse = await processExpensesResponse(session, response);
      break;
    case 'obligations':
      stageResponse = await processObligationsResponse(session, response);
      break;
    case 'stress':
      stageResponse = await processStressResponse(session, response);
      break;
    case 'summary':
      stageResponse = await processSummaryResponse(session, response);
      break;
    default:
      throw new Error('Invalid stage');
  }

  // Update session
  session.currentStage = stageResponse.nextStage;
  session.lastUpdatedAt = new Date();

  // Record assistant response
  session.conversationHistory.push({
    role: 'assistant',
    content: stageResponse.message,
    timestamp: new Date(),
    stage: stageResponse.nextStage,
  });

  return stageResponse;
}

/**
 * Process intro response
 */
async function processIntroResponse(
  session: AssessmentSession,
  response: { type: ResponseType; value: string | string[] }
): Promise<StageResponse> {
  const value = Array.isArray(response.value) ? response.value[0] : response.value;

  if (value === 'later' || response.type === 'skip') {
    return {
      nextStage: 'complete',
      message: "No problem at all. You can come back to this anytime you're ready. We're here when you need us.",
      inputType: 'buttons',
      allowSkip: false,
      complete: true,
    };
  }

  return {
    nextStage: 'income',
    message: ASSESSMENT_QUESTIONS.income,
    options: INCOME_RANGES.map((r) => ({ value: r.value, label: r.label })),
    inputType: 'select',
    allowSkip: true,
    complete: false,
  };
}

/**
 * Process income response
 */
async function processIncomeResponse(
  session: AssessmentSession,
  response: { type: ResponseType; value: string | string[] }
): Promise<StageResponse> {
  const value = Array.isArray(response.value) ? response.value[0] : response.value;

  if (response.type !== 'skip') {
    session.responses.incomeRange = value;
  }

  // Determine follow-up message
  let followUp = '';
  if (response.type === 'skip') {
    followUp = FOLLOW_UP_PROMPTS.income_skip;
  } else if (value === 'under_1500' || value === '1500_3000') {
    followUp = FOLLOW_UP_PROMPTS.income_low;
  } else {
    followUp = FOLLOW_UP_PROMPTS.income_high;
  }

  return {
    nextStage: 'expenses',
    message: `${followUp}\n\n${ASSESSMENT_QUESTIONS.expenses}`,
    options: EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    inputType: 'multi_select',
    allowSkip: true,
    complete: false,
  };
}

/**
 * Process expenses response
 */
async function processExpensesResponse(
  session: AssessmentSession,
  response: { type: ResponseType; value: string | string[] }
): Promise<StageResponse> {
  if (response.type !== 'skip') {
    const values = Array.isArray(response.value) ? response.value : [response.value];
    session.responses.expenseCategories = values;

    // Calculate expense level based on number of categories
    if (values.length >= 5) {
      session.responses.expenseLevel = 'high';
    } else if (values.length >= 3) {
      session.responses.expenseLevel = 'moderate';
    } else {
      session.responses.expenseLevel = 'low';
    }
  }

  // Determine follow-up message
  let followUp = '';
  if (response.type === 'skip') {
    followUp = "That's okay - we can work with what we have.";
  } else if (session.responses.expenseLevel === 'high') {
    followUp = FOLLOW_UP_PROMPTS.expenses_high;
  } else {
    followUp = FOLLOW_UP_PROMPTS.expenses_moderate;
  }

  return {
    nextStage: 'obligations',
    message: `${followUp}\n\n${ASSESSMENT_QUESTIONS.obligations}`,
    options: OBLIGATION_TYPES.map((o) => ({ value: o.value, label: o.label })),
    inputType: 'multi_select',
    allowSkip: true,
    complete: false,
  };
}

/**
 * Process obligations response
 */
async function processObligationsResponse(
  session: AssessmentSession,
  response: { type: ResponseType; value: string | string[] }
): Promise<StageResponse> {
  if (response.type !== 'skip') {
    const values = Array.isArray(response.value) ? response.value : [response.value];
    session.responses.otherObligations = values;
  }

  // Determine follow-up message
  let followUp = '';
  if (response.type === 'skip') {
    followUp = "That's perfectly fine.";
  } else if (session.responses.otherObligations && session.responses.otherObligations.length > 0) {
    followUp = FOLLOW_UP_PROMPTS.obligations_yes;
  } else {
    followUp = FOLLOW_UP_PROMPTS.obligations_no;
  }

  return {
    nextStage: 'stress',
    message: `${followUp}\n\n${ASSESSMENT_QUESTIONS.stress}`,
    options: STRESS_LEVELS.map((s) => ({ value: String(s.value), label: s.label })),
    inputType: 'scale',
    allowSkip: true,
    complete: false,
  };
}

/**
 * Process stress response
 */
async function processStressResponse(
  session: AssessmentSession,
  response: { type: ResponseType; value: string | string[] }
): Promise<StageResponse> {
  const value = Array.isArray(response.value) ? response.value[0] : response.value;
  const stressLevel = parseInt(value, 10) || 3;

  if (response.type !== 'skip') {
    session.responses.stressLevel = stressLevel;
  }

  // Check for escalation
  const shouldEscalate = stressLevel === 1;
  const stressConfig = STRESS_LEVELS.find((s) => s.value === stressLevel);

  // Generate summary
  const summary = generateSummary(session.responses);

  // Determine follow-up message
  let followUp = '';
  if (response.type === 'skip') {
    followUp = "That's okay - we all handle things differently.";
  } else if (stressLevel <= 2) {
    followUp = FOLLOW_UP_PROMPTS.stress_high;
  } else if (stressLevel <= 3) {
    followUp = FOLLOW_UP_PROMPTS.stress_moderate;
  } else {
    followUp = FOLLOW_UP_PROMPTS.stress_low;
  }

  const summaryMessage = ASSESSMENT_QUESTIONS.summary.replace('{summary}', summary);

  const stageResponse: StageResponse = {
    nextStage: 'summary',
    message: `${followUp}\n\n${summaryMessage}`,
    options: [
      { value: 'correct', label: "Yes, that's right" },
      { value: 'adjust', label: "I'd like to adjust something" },
    ],
    inputType: 'buttons',
    allowSkip: false,
    complete: false,
  };

  if (shouldEscalate) {
    stageResponse.escalate = true;
    stageResponse.resources = STRESS_RESOURCES;
  }

  return stageResponse;
}

/**
 * Process summary response
 */
async function processSummaryResponse(
  session: AssessmentSession,
  response: { type: ResponseType; value: string | string[] }
): Promise<StageResponse> {
  const value = Array.isArray(response.value) ? response.value[0] : response.value;

  if (value === 'adjust') {
    // Go back to income to start over
    return {
      nextStage: 'income',
      message: "No problem! Let's go through it again. " + ASSESSMENT_QUESTIONS.income,
      options: INCOME_RANGES.map((r) => ({ value: r.value, label: r.label })),
      inputType: 'select',
      allowSkip: true,
      complete: false,
    };
  }

  return {
    nextStage: 'complete',
    message:
      "Thank you for sharing all of this with me. This information will help us find payment options that work for your situation. You're taking a positive step by engaging with this.",
    inputType: 'buttons',
    allowSkip: false,
    complete: true,
  };
}

/**
 * Generate a human-readable summary of responses
 */
function generateSummary(responses: AssessmentResponses): string {
  const parts: string[] = [];

  // Income
  if (responses.incomeRange) {
    const incomeLabel = INCOME_RANGES.find((r) => r.value === responses.incomeRange)?.label || 'not specified';
    parts.push(`your monthly income is ${incomeLabel.toLowerCase()}`);
  }

  // Expenses
  if (responses.expenseCategories && responses.expenseCategories.length > 0) {
    const expenseLabels = responses.expenseCategories
      .map((c) => EXPENSE_CATEGORIES.find((ec) => ec.value === c)?.label || c)
      .slice(0, 3);
    parts.push(`your main expenses include ${expenseLabels.join(', ').toLowerCase()}`);
  }

  // Obligations
  if (responses.otherObligations && responses.otherObligations.length > 0) {
    parts.push("you're managing some other financial obligations");
  } else {
    parts.push("you don't have significant other debts right now");
  }

  // Stress
  if (responses.stressLevel) {
    const stressLabel = STRESS_LEVELS.find((s) => s.value === responses.stressLevel)?.label || '';
    if (stressLabel) {
      parts.push(`you're feeling ${stressLabel.toLowerCase()} about your finances`);
    }
  }

  return parts.length > 0 ? parts.join(', and ') : 'you prefer to keep details private, which is completely okay';
}

/**
 * Get session status
 */
export function getSessionStatus(sessionId: string): {
  currentStage: AssessmentStage;
  responses: AssessmentResponses;
  progress: number;
  conversationHistory: ConversationMessage[];
} | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const stages: AssessmentStage[] = ['intro', 'income', 'expenses', 'obligations', 'stress', 'summary', 'complete'];
  const currentIndex = stages.indexOf(session.currentStage);
  const progress = Math.round((currentIndex / (stages.length - 1)) * 100);

  return {
    currentStage: session.currentStage,
    responses: session.responses,
    progress,
    conversationHistory: session.conversationHistory,
  };
}

/**
 * Complete and save assessment
 */
export async function completeAssessment(sessionId: string): Promise<{
  assessmentId: string;
  summary: {
    incomeRange: string | null;
    expenseLevel: string | null;
    otherObligations: boolean;
    stressLevel: number | null;
  };
  debtorProfileId: string;
  responses: AssessmentResponses;
}> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Generate assessment ID
  const assessmentId = `fa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Build summary
  const summary = {
    incomeRange: session.responses.incomeRange || null,
    expenseLevel: session.responses.expenseLevel || null,
    otherObligations: (session.responses.otherObligations?.length || 0) > 0,
    stressLevel: session.responses.stressLevel || null,
  };

  // In a real implementation, save to database here

  // Clean up session
  sessions.delete(sessionId);

  return {
    assessmentId,
    summary,
    debtorProfileId: session.debtorProfileId,
    responses: session.responses,
  };
}

/**
 * Generate AI follow-up using Bedrock (optional enhancement)
 */
export async function generateAIFollowUp(
  session: AssessmentSession,
  userResponse: string
): Promise<string> {
  try {
    const systemPrompt = ASSESSMENT_SYSTEM_PROMPT.replace('{debtAmount}', String(session.metadata.debtAmount)).replace(
      '{creditorName}',
      session.metadata.creditorName
    );

    const messages = session.conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({ role: 'user', content: userResponse });

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 150,
      system: systemPrompt,
      messages,
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content[0]?.text || '';
  } catch (error) {
    console.error('AI follow-up generation failed:', error);
    return '';
  }
}
