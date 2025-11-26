/**
 * Defender Training Service
 * Manages training modules and tracks defender progress
 */

import { transitionOnboarding, getDefenderProfile } from './onboardingStateMachine';

// In-memory stores (use database in production)
const moduleStore = new Map<string, TrainingModule>();
const progressStore = new Map<string, TrainingProgress>();

export interface TrainingModule {
  id: string;
  code: string;
  title: string;
  description: string;
  content: ModuleContent;
  duration: number; // minutes
  required: boolean;
  orderIndex: number;
  createdAt: Date;
}

export interface ModuleContent {
  sections: {
    title: string;
    content: string;
    videoUrl?: string;
  }[];
  quiz?: {
    questions: {
      question: string;
      options: string[];
      correctIndex: number;
    }[];
    passingScore: number;
  };
}

export interface TrainingProgress {
  id: string;
  defenderId: string;
  moduleId: string;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  attempts: number;
}

export interface TrainingStatus {
  modules: ModuleWithStatus[];
  totalModules: number;
  completedModules: number;
  requiredCompleted: boolean;
  progress: number;
  totalDuration: number;
  completedDuration: number;
}

export interface ModuleWithStatus extends TrainingModule {
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: Date;
  score?: number;
}

// Default training modules
const DEFAULT_MODULES: Omit<TrainingModule, 'id' | 'createdAt'>[] = [
  {
    code: 'PLATFORM_OVERVIEW',
    title: 'Platform Overview',
    description: 'Learn how the debt resolution platform works and your role as a defender',
    duration: 15,
    required: true,
    orderIndex: 1,
    content: {
      sections: [
        {
          title: 'Welcome to the Platform',
          content: 'Introduction to the debt resolution platform and its mission to help debtors...',
        },
        {
          title: 'Your Role as a Defender',
          content: 'As a public defender, you will assist assigned debtors in understanding their options...',
        },
        {
          title: 'Platform Navigation',
          content: 'Overview of the dashboard, case management, and communication tools...',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'What is the primary goal of this platform?',
            options: [
              'To collect debts aggressively',
              'To help debtors resolve their debts fairly',
              'To provide legal representation',
              'To sell debt to collectors',
            ],
            correctIndex: 1,
          },
        ],
        passingScore: 80,
      },
    },
  },
  {
    code: 'DEBTOR_RIGHTS',
    title: 'Debtor Rights & FDCPA',
    description: 'Understand debtor protections under the Fair Debt Collection Practices Act',
    duration: 30,
    required: true,
    orderIndex: 2,
    content: {
      sections: [
        {
          title: 'Introduction to FDCPA',
          content: 'The Fair Debt Collection Practices Act protects consumers from abusive collection practices...',
        },
        {
          title: 'Prohibited Practices',
          content: 'Collectors cannot harass, threaten, or use deceptive practices...',
        },
        {
          title: 'Debtor Rights',
          content: 'Debtors have the right to request verification, dispute debts, and limit contact...',
        },
        {
          title: 'Your Advocacy Role',
          content: 'How to help debtors understand and exercise their rights...',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'Under FDCPA, collectors cannot:',
            options: [
              'Contact debtors by mail',
              'Call before 8am or after 9pm',
              'Request payment',
              'Send written notices',
            ],
            correctIndex: 1,
          },
          {
            question: 'Debtors have the right to:',
            options: [
              'Ignore all debts without consequence',
              'Request debt validation within 30 days',
              'Refuse all payment plans',
              'Sue collectors without cause',
            ],
            correctIndex: 1,
          },
        ],
        passingScore: 80,
      },
    },
  },
  {
    code: 'COMMUNICATION_TOOLS',
    title: 'Using Communication Tools',
    description: 'How to effectively communicate with debtors using platform messaging',
    duration: 20,
    required: true,
    orderIndex: 3,
    content: {
      sections: [
        {
          title: 'Messaging System Overview',
          content: 'The platform provides secure, compliant messaging between defenders and debtors...',
        },
        {
          title: 'Communication Best Practices',
          content: 'Be clear, compassionate, and professional in all communications...',
        },
        {
          title: 'Templates and AI Assistance',
          content: 'Using message templates and AI-suggested responses appropriately...',
        },
      ],
    },
  },
  {
    code: 'PAYMENT_GUIDANCE',
    title: 'Payment Plan Guidance',
    description: 'Helping debtors understand and manage payment plans',
    duration: 25,
    required: true,
    orderIndex: 4,
    content: {
      sections: [
        {
          title: 'Understanding Payment Plans',
          content: 'Different types of payment arrangements and their implications...',
        },
        {
          title: 'Assessing Debtor Capacity',
          content: 'How to help debtors evaluate their ability to make payments...',
        },
        {
          title: 'Negotiation Support',
          content: 'Guiding debtors through plan negotiations with creditors...',
        },
        {
          title: 'Monitoring and Adjustments',
          content: 'Helping debtors stay on track or request plan modifications...',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'When helping a debtor choose a payment plan, you should:',
            options: [
              'Recommend the highest payment amount possible',
              'Consider their income, expenses, and other obligations',
              'Always choose the shortest term plan',
              'Avoid discussing their financial situation',
            ],
            correctIndex: 1,
          },
        ],
        passingScore: 80,
      },
    },
  },
  {
    code: 'PRIVACY_CONFIDENTIALITY',
    title: 'Privacy & Confidentiality',
    description: 'Handling sensitive debtor information responsibly',
    duration: 15,
    required: true,
    orderIndex: 5,
    content: {
      sections: [
        {
          title: 'Data Protection Requirements',
          content: 'All debtor information is confidential and protected by privacy laws...',
        },
        {
          title: 'Access Limitations',
          content: 'You can only access information for debtors assigned to you...',
        },
        {
          title: 'Secure Handling',
          content: 'Best practices for handling sensitive financial and personal information...',
        },
        {
          title: 'Reporting Concerns',
          content: 'How to report potential privacy violations or security concerns...',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'You should only access debtor information:',
            options: [
              'For any debtor in the system',
              'For debtors assigned to you for assistance',
              'When requested by other defenders',
              'To satisfy personal curiosity',
            ],
            correctIndex: 1,
          },
        ],
        passingScore: 100,
      },
    },
  },
];

/**
 * Initialize training modules
 */
export async function initializeModules(): Promise<void> {
  for (const moduleData of DEFAULT_MODULES) {
    const module: TrainingModule = {
      ...moduleData,
      id: `mod_${moduleData.code.toLowerCase()}`,
      createdAt: new Date(),
    };
    moduleStore.set(module.id, module);
  }
}

// Initialize on module load
initializeModules();

/**
 * Get all training modules
 */
export async function getTrainingModules(): Promise<TrainingModule[]> {
  return Array.from(moduleStore.values()).sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Get training module by ID
 */
export async function getModule(moduleId: string): Promise<TrainingModule | null> {
  return moduleStore.get(moduleId) || null;
}

/**
 * Get training module by code
 */
export async function getModuleByCode(code: string): Promise<TrainingModule | null> {
  for (const module of moduleStore.values()) {
    if (module.code === code) {
      return module;
    }
  }
  return null;
}

/**
 * Get training status for a defender
 */
export async function getTrainingStatus(defenderId: string): Promise<TrainingStatus> {
  const modules = await getTrainingModules();
  const progress = await getDefenderProgress(defenderId);
  const progressMap = new Map(progress.map((p) => [p.moduleId, p]));

  const modulesWithStatus: ModuleWithStatus[] = modules.map((module) => {
    const moduleProgress = progressMap.get(module.id);
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';

    if (moduleProgress) {
      status = moduleProgress.completedAt ? 'completed' : 'in_progress';
    }

    return {
      ...module,
      status,
      completedAt: moduleProgress?.completedAt,
      score: moduleProgress?.score,
    };
  });

  const requiredModules = modulesWithStatus.filter((m) => m.required);
  const completedRequired = requiredModules.filter((m) => m.status === 'completed');
  const completedModules = modulesWithStatus.filter((m) => m.status === 'completed');

  const totalDuration = modules.reduce((sum, m) => sum + m.duration, 0);
  const completedDuration = completedModules.reduce((sum, m) => sum + m.duration, 0);

  return {
    modules: modulesWithStatus,
    totalModules: modules.length,
    completedModules: completedModules.length,
    requiredCompleted: completedRequired.length === requiredModules.length,
    progress: requiredModules.length > 0
      ? Math.round((completedRequired.length / requiredModules.length) * 100)
      : 100,
    totalDuration,
    completedDuration,
  };
}

/**
 * Get progress records for a defender
 */
export async function getDefenderProgress(defenderId: string): Promise<TrainingProgress[]> {
  const progress: TrainingProgress[] = [];

  for (const p of progressStore.values()) {
    if (p.defenderId === defenderId) {
      progress.push(p);
    }
  }

  return progress;
}

/**
 * Start a training module
 */
export async function startModule(
  defenderId: string,
  moduleId: string
): Promise<TrainingProgress> {
  // Verify module exists
  const module = await getModule(moduleId);
  if (!module) {
    throw new Error('Module not found');
  }

  // Verify defender exists
  const defender = await getDefenderProfile(defenderId);
  if (!defender) {
    throw new Error('Defender not found');
  }

  // Check for existing progress
  const progressKey = `${defenderId}_${moduleId}`;
  let progress = progressStore.get(progressKey);

  if (progress) {
    if (progress.completedAt) {
      throw new Error('Module already completed');
    }
    return progress;
  }

  // Create new progress record
  progress = {
    id: generateId(),
    defenderId,
    moduleId,
    startedAt: new Date(),
    attempts: 0,
  };

  progressStore.set(progressKey, progress);

  // Transition to training if needed
  if (defender.onboardingStatus === 'CREDENTIALS_VERIFIED') {
    await transitionOnboarding(defenderId, 'START_TRAINING');
  }

  return progress;
}

/**
 * Complete a training module
 */
export async function completeModule(
  defenderId: string,
  moduleId: string,
  quizScore?: number
): Promise<TrainingProgress> {
  const module = await getModule(moduleId);
  if (!module) {
    throw new Error('Module not found');
  }

  const progressKey = `${defenderId}_${moduleId}`;
  let progress = progressStore.get(progressKey);

  if (!progress) {
    // Auto-start if not started
    progress = await startModule(defenderId, moduleId);
  }

  if (progress.completedAt) {
    throw new Error('Module already completed');
  }

  // Check quiz score if module has quiz
  if (module.content.quiz && quizScore !== undefined) {
    progress.attempts += 1;

    if (quizScore < module.content.quiz.passingScore) {
      progressStore.set(progressKey, progress);
      throw new Error(
        `Quiz score ${quizScore}% is below passing score of ${module.content.quiz.passingScore}%`
      );
    }

    progress.score = quizScore;
  }

  // Mark as completed
  progress.completedAt = new Date();
  progressStore.set(progressKey, progress);

  // Check if all required modules completed
  const status = await getTrainingStatus(defenderId);
  if (status.requiredCompleted) {
    const defender = await getDefenderProfile(defenderId);
    if (defender?.onboardingStatus === 'TRAINING_IN_PROGRESS') {
      await transitionOnboarding(defenderId, 'COMPLETE_TRAINING');
    }
  }

  return progress;
}

/**
 * Reset module progress (for retakes)
 */
export async function resetModuleProgress(
  defenderId: string,
  moduleId: string
): Promise<void> {
  const progressKey = `${defenderId}_${moduleId}`;
  const progress = progressStore.get(progressKey);

  if (!progress) {
    throw new Error('No progress found for this module');
  }

  // Create new progress, preserving attempt count
  const newProgress: TrainingProgress = {
    id: generateId(),
    defenderId,
    moduleId,
    startedAt: new Date(),
    attempts: progress.attempts,
  };

  progressStore.set(progressKey, newProgress);
}

/**
 * Submit quiz answers and calculate score
 */
export async function submitQuiz(
  defenderId: string,
  moduleId: string,
  answers: number[]
): Promise<{ score: number; passed: boolean; progress: TrainingProgress }> {
  const module = await getModule(moduleId);
  if (!module) {
    throw new Error('Module not found');
  }

  if (!module.content.quiz) {
    throw new Error('This module does not have a quiz');
  }

  const quiz = module.content.quiz;
  const totalQuestions = quiz.questions.length;
  let correctAnswers = 0;

  for (let i = 0; i < totalQuestions; i++) {
    if (answers[i] === quiz.questions[i].correctIndex) {
      correctAnswers++;
    }
  }

  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const passed = score >= quiz.passingScore;

  let progress: TrainingProgress;
  if (passed) {
    progress = await completeModule(defenderId, moduleId, score);
  } else {
    const progressKey = `${defenderId}_${moduleId}`;
    progress = progressStore.get(progressKey) || (await startModule(defenderId, moduleId));
    progress.attempts += 1;
    progressStore.set(progressKey, progress);
  }

  return { score, passed, progress };
}

/**
 * Get training statistics
 */
export async function getTrainingStats(): Promise<{
  totalModules: number;
  requiredModules: number;
  avgCompletionRate: number;
  avgQuizScore: number;
}> {
  const modules = await getTrainingModules();
  const progress = Array.from(progressStore.values());

  const completed = progress.filter((p) => p.completedAt);
  const withScores = completed.filter((p) => p.score !== undefined);

  return {
    totalModules: modules.length,
    requiredModules: modules.filter((m) => m.required).length,
    avgCompletionRate: progress.length > 0 ? (completed.length / progress.length) * 100 : 0,
    avgQuizScore:
      withScores.length > 0
        ? withScores.reduce((sum, p) => sum + (p.score || 0), 0) / withScores.length
        : 0,
  };
}

function generateId(): string {
  return `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
