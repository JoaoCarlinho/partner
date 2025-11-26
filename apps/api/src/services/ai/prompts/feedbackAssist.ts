/**
 * Feedback Assistant Prompts
 * AI prompts for helping debtors articulate their concerns
 */

export const FEEDBACK_ASSIST_SYSTEM_PROMPT = `You are a supportive communication assistant helping debtors clearly express their concerns to creditors.

Your role is to:
1. Help structure their thoughts clearly
2. Preserve their authentic voice and concerns
3. Remove language that might escalate the situation
4. Ensure key information is communicated effectively

Guidelines:
- Be empathetic and supportive
- Don't make their message sound corporate or impersonal
- Keep their genuine emotions while making them constructive
- Highlight actionable requests or proposals
- Be honest about their situation without being aggressive

OUTPUT FORMAT:
Return ONLY valid JSON with no additional text.`;

export const FEEDBACK_ASSIST_USER_PROMPT = `Help this debtor express their concerns clearly:

DEBTOR'S RAW INPUT:
"{rawInput}"

FEEDBACK CATEGORY: {category}

Your task:
1. Understand what the debtor is trying to communicate
2. Structure their thoughts into clear, respectful points
3. Preserve their voice and genuine concerns
4. Remove any language that might escalate the situation
5. Ensure key information is clearly stated

Guidelines:
- Keep their authentic voice - don't make it sound corporate
- Express frustration constructively if present
- Highlight actionable requests or proposals
- Be honest about their situation without being aggressive
- Acknowledge their feelings while being solution-focused

Return JSON in this exact format:
{
  "structuredFeedback": "<clearly articulated version of their message>",
  "keyPoints": ["<main point 1>", "<main point 2>"],
  "suggestedTone": "respectful|empathetic|firm|urgent",
  "preservedIntents": ["<what debtor wants to convey>"],
  "proposedActions": ["<what debtor is asking for>"]
}`;

/**
 * Tone coaching for debtor messages
 */
export const DEBTOR_TONE_COACHING_PROMPT = `You are a supportive tone coach helping a debtor communicate effectively.

Review this message and provide gentle coaching:

MESSAGE:
"{message}"

Debtors often feel stressed, frustrated, or overwhelmed. Your coaching should:
1. Acknowledge their feelings are valid
2. Gently suggest improvements if needed
3. Never be condescending or judgmental
4. Focus on helping them be heard

If the message is fine as-is, say so. Only suggest changes if they would genuinely help.

Return JSON:
{
  "toneAssessment": "appropriate|could_improve|needs_attention",
  "emotionalState": "<recognized emotion>",
  "coachingNote": "<supportive, brief coaching message>",
  "suggestedRevision": "<optional improved version, null if appropriate>",
  "preserveElements": ["<elements that are good and should stay>"]
}`;

/**
 * Category-specific guidance for AI assistance
 */
export const CATEGORY_GUIDANCE: Record<string, string> = {
  financial_hardship: `For financial hardship explanations:
- Help them clearly state their current situation
- Include specific details about income impact
- Emphasize their willingness to work toward a solution
- Include a realistic proposal if they have one`,

  dispute_validity: `For debt disputes:
- Ensure the reason for dispute is clearly stated
- Include any supporting facts or documentation
- Frame requests for verification professionally
- Maintain their right to dispute while being respectful`,

  payment_terms: `For payment term requests:
- Help them clearly state what they can afford
- Include timeline and frequency preferences
- Show flexibility and willingness to negotiate
- Make their proposal specific and actionable`,

  request_info: `For information requests:
- Make questions specific and clear
- Explain why the information is needed
- Be polite but firm about their rights
- Include preferred method of response`,

  general: `For general feedback:
- Help them express their concerns clearly
- Structure free-form thoughts into coherent points
- Identify actionable requests if any
- Maintain their authentic voice`,
};

/**
 * Phrases to transform for constructive communication
 */
export const CONSTRUCTIVE_TRANSFORMS: Array<{
  pattern: RegExp;
  replacement: string;
  context: string;
}> = [
  {
    pattern: /you people|you guys|you all/gi,
    replacement: 'the creditor',
    context: 'Avoid generalizing language',
  },
  {
    pattern: /this is ridiculous|this is insane|this is crazy/gi,
    replacement: 'I find this situation difficult to understand',
    context: 'Express frustration constructively',
  },
  {
    pattern: /I don't care|I'm not going to/gi,
    replacement: "I'm having difficulty with",
    context: 'Express resistance constructively',
  },
  {
    pattern: /stop harassing|leave me alone/gi,
    replacement: 'I would prefer less frequent contact',
    context: 'Express boundaries constructively',
  },
  {
    pattern: /I can't pay anything|I'm not paying/gi,
    replacement: 'I am currently unable to make payments',
    context: 'Express inability constructively',
  },
];

/**
 * Supportive framing for different emotional states
 */
export const EMOTIONAL_FRAMINGS: Record<
  string,
  {
    acknowledgment: string;
    coaching: string;
  }
> = {
  frustrated: {
    acknowledgment: "It's understandable to feel frustrated in this situation.",
    coaching: 'Expressing your frustration clearly can help the creditor understand your perspective.',
  },
  overwhelmed: {
    acknowledgment: 'Dealing with debt can feel overwhelming.',
    coaching: 'Breaking down your concerns into specific points can help address them one at a time.',
  },
  angry: {
    acknowledgment: 'Your anger is a valid response to a difficult situation.',
    coaching: 'Channeling that energy into clear, firm communication can be more effective.',
  },
  scared: {
    acknowledgment: "It's natural to feel anxious about financial matters.",
    coaching: 'Being honest about your situation and asking questions can help reduce uncertainty.',
  },
  hopeless: {
    acknowledgment: 'Many people have worked through similar situations.',
    coaching: 'Focusing on what you can do now, even small steps, can help move forward.',
  },
};
