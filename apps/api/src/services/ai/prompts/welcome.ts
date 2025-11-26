/**
 * Welcome Message Prompts
 * AI prompts for generating warm, supportive debtor welcome messages
 */

/**
 * Case context for welcome generation
 */
export interface WelcomeContext {
  creditorName: string;
  amountRange: string; // e.g., "$1,000-$5,000"
  creditorType?: string; // e.g., "healthcare", "credit card"
  isFirstVisit: boolean;
}

/**
 * System prompt for welcome message generation
 */
export const WELCOME_SYSTEM_PROMPT = `You are a compassionate communication specialist helping people navigate difficult financial situations.

Your role is to welcome someone who has received a debt collection letter to a platform designed to help them find resolution.

CRITICAL REQUIREMENTS:
1. Be genuinely warm and empathetic - this person may be stressed or scared
2. NEVER use threatening, pressuring, or judgmental language
3. Focus on their future financial health and available options
4. Acknowledge the difficulty of their situation
5. Emphasize that they're in control and this is about helping them

TONE MUST BE:
- Warm (like a supportive friend, not a collection agent)
- Hopeful (focus on positive outcomes)
- Clear (simple language, no jargon)
- Respectful (treat them with dignity)

AVOID:
- Urgency language ("act now", "time is running out", "deadline")
- Pressure tactics or implied consequences
- Legal threats or intimidation
- Judgment about their situation
- Condescension or talking down
- Words like: demand, require, must, immediately, final, failure

ALWAYS INCLUDE:
- Their first name (provided)
- Acknowledgment that this may be a stressful situation
- Assurance that they have options
- Emphasis on support and partnership`;

/**
 * Build the welcome message prompt for a specific debtor
 */
export function buildWelcomePrompt(debtorName: string, context: WelcomeContext): string {
  const creditorDescription = context.creditorType
    ? `a ${context.creditorType} provider (${context.creditorName})`
    : context.creditorName;

  return `Generate a warm, welcoming message for ${debtorName}.

CONTEXT:
- They received a letter about a debt from ${creditorDescription}
- Amount range: ${context.amountRange}
- This is their ${context.isFirstVisit ? 'first time' : 'return visit'} to the platform

YOUR MESSAGE SHOULD:
1. Address them by their first name (${debtorName})
2. Acknowledge this might be a stressful or worrying time
3. Assure them that you're here to help find a solution
4. Emphasize they have options and are in control
5. Focus on working together toward a positive outcome

FORMAT:
- 3-4 sentences
- Warm and supportive tone
- Simple, clear language
- No jargon or legal terms

Return ONLY the welcome message, no additional commentary.`;
}

/**
 * Fallback welcome messages for when AI generation fails
 * These are pre-approved, tone-validated messages
 */
export const FALLBACK_WELCOME_MESSAGES = [
  `Welcome, {{name}}. We understand that receiving a letter about a financial matter can feel overwhelming. We're here to help you understand your options and find a path forward that works for you. There's no pressure - take the time you need to explore what's available.`,

  `Hi {{name}}, welcome. We know this might be a stressful time, and we want you to know you're not alone. Our goal is to help you find a solution that fits your situation. Feel free to look around and reach out if you have any questions.`,

  `Welcome, {{name}}. We're glad you're here. Financial situations can feel complicated, but we're here to make things clearer and help you explore your options. Remember, you're in control of how you engage with this process.`,
];

/**
 * Platform explanation content
 */
export const PLATFORM_INFO = {
  purpose: "This platform is designed to help you understand and resolve your account matter in a way that works for you. We believe in transparency, respect, and finding solutions together.",

  howItWorks: [
    "View the details of your account and any communications",
    "Ask questions and get clear answers",
    "Explore payment options that fit your budget",
    "Communicate securely with your account representatives",
    "Track any agreements and payments in one place",
  ],

  yourOptions: [
    "Review your account information",
    "Set up a payment plan that works for your situation",
    "Request more information about your account",
    "Speak with someone about your options",
    "Request to opt out of digital communications",
  ],
};

/**
 * Opt-out information content
 */
export const OPT_OUT_INFO = {
  explanation: "You have the right to choose how you want to communicate about this matter.",

  options: {
    noDigitalContact: {
      title: "Request No Further Digital Contact",
      description: "Choose to receive communications by traditional mail instead.",
    },
    verifyDebt: {
      title: "Request Debt Verification",
      description: "Ask for written verification of the debt details.",
    },
    traditionalContact: {
      title: "Prefer Traditional Communication",
      description: "Reach out by phone, email, or mail instead of using this platform.",
    },
  },

  consequences: "If you opt out of digital communication, you'll still receive required notices by mail. You can always come back to the platform later if you change your mind.",
};
