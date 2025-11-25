/**
 * Defender Onboarding State Machine
 * Manages the defender onboarding workflow states and transitions
 */

// In-memory store for defender profiles (use database in production)
const defenderStore = new Map<string, DefenderProfile>();
const defenderByUserId = new Map<string, string>();

export type OnboardingStatus =
  | 'INVITED'
  | 'REGISTERED'
  | 'CREDENTIALS_SUBMITTED'
  | 'CREDENTIALS_VERIFIED'
  | 'TRAINING_IN_PROGRESS'
  | 'TERMS_PENDING'
  | 'ACTIVE'
  | 'SUSPENDED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type OnboardingEvent =
  | 'REGISTER'
  | 'SUBMIT_CREDENTIALS'
  | 'VERIFY_CREDENTIALS'
  | 'REJECT_CREDENTIALS'
  | 'START_TRAINING'
  | 'COMPLETE_TRAINING'
  | 'ACCEPT_TERMS'
  | 'SUSPEND'
  | 'REACTIVATE';

export interface DefenderProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
  organizationId?: string;
  barNumber: string;
  barState: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  maxCaseload: number;
  currentCaseload: number;
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt?: Date;
  termsAcceptedAt?: Date;
  termsVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDefenderRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
  organizationId?: string;
  barNumber: string;
  barState: string;
}

// State transition rules
const transitions: Record<OnboardingStatus, Partial<Record<OnboardingEvent, OnboardingStatus>>> = {
  INVITED: {
    REGISTER: 'REGISTERED',
  },
  REGISTERED: {
    SUBMIT_CREDENTIALS: 'CREDENTIALS_SUBMITTED',
  },
  CREDENTIALS_SUBMITTED: {
    VERIFY_CREDENTIALS: 'CREDENTIALS_VERIFIED',
    REJECT_CREDENTIALS: 'REGISTERED',
  },
  CREDENTIALS_VERIFIED: {
    START_TRAINING: 'TRAINING_IN_PROGRESS',
  },
  TRAINING_IN_PROGRESS: {
    COMPLETE_TRAINING: 'TERMS_PENDING',
  },
  TERMS_PENDING: {
    ACCEPT_TERMS: 'ACTIVE',
  },
  ACTIVE: {
    SUSPEND: 'SUSPENDED',
  },
  SUSPENDED: {
    REACTIVATE: 'ACTIVE',
  },
};

// Onboarding step definitions
const ONBOARDING_STEPS = [
  { key: 'register', label: 'Register', status: 'REGISTERED' },
  { key: 'credentials', label: 'Verify Credentials', status: 'CREDENTIALS_VERIFIED' },
  { key: 'training', label: 'Complete Training', status: 'TERMS_PENDING' },
  { key: 'terms', label: 'Accept Terms', status: 'ACTIVE' },
];

/**
 * Create a new defender profile
 */
export async function createDefenderProfile(
  request: CreateDefenderRequest
): Promise<DefenderProfile> {
  // Check if user already has a defender profile
  if (defenderByUserId.has(request.userId)) {
    throw new Error('User already has a defender profile');
  }

  const profile: DefenderProfile = {
    id: generateId(),
    userId: request.userId,
    email: request.email,
    firstName: request.firstName,
    lastName: request.lastName,
    phone: request.phone,
    organizationName: request.organizationName,
    organizationId: request.organizationId,
    barNumber: request.barNumber,
    barState: request.barState.toUpperCase(),
    verificationStatus: 'PENDING',
    maxCaseload: 25,
    currentCaseload: 0,
    onboardingStatus: 'REGISTERED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  defenderStore.set(profile.id, profile);
  defenderByUserId.set(profile.userId, profile.id);

  return profile;
}

/**
 * Get defender profile by ID
 */
export async function getDefenderProfile(id: string): Promise<DefenderProfile | null> {
  return defenderStore.get(id) || null;
}

/**
 * Get defender profile by user ID
 */
export async function getDefenderByUserId(userId: string): Promise<DefenderProfile | null> {
  const defenderId = defenderByUserId.get(userId);
  if (!defenderId) return null;
  return defenderStore.get(defenderId) || null;
}

/**
 * Transition defender to next onboarding state
 */
export async function transitionOnboarding(
  defenderId: string,
  event: OnboardingEvent,
  metadata?: Record<string, unknown>
): Promise<DefenderProfile> {
  const defender = defenderStore.get(defenderId);

  if (!defender) {
    throw new Error('Defender not found');
  }

  const currentState = defender.onboardingStatus;
  const nextState = transitions[currentState]?.[event];

  if (!nextState) {
    throw new Error(`Invalid transition: ${event} from ${currentState}`);
  }

  // Update profile with new state
  defender.onboardingStatus = nextState;
  defender.updatedAt = new Date();

  // Handle side effects based on transition
  switch (nextState) {
    case 'CREDENTIALS_VERIFIED':
      defender.verificationStatus = 'VERIFIED';
      defender.verifiedAt = new Date();
      defender.verifiedBy = metadata?.verifiedBy as string;
      break;

    case 'REGISTERED':
      // Credentials rejected - reset verification status
      if (event === 'REJECT_CREDENTIALS') {
        defender.verificationStatus = 'PENDING';
        defender.verifiedAt = undefined;
        defender.verifiedBy = undefined;
      }
      break;

    case 'ACTIVE':
      defender.onboardingCompletedAt = new Date();
      if (metadata?.termsVersion) {
        defender.termsAcceptedAt = new Date();
        defender.termsVersion = metadata.termsVersion as string;
      }
      break;
  }

  defenderStore.set(defenderId, defender);

  return defender;
}

/**
 * Check if a transition is valid
 */
export function canTransition(currentState: OnboardingStatus, event: OnboardingEvent): boolean {
  return !!transitions[currentState]?.[event];
}

/**
 * Calculate onboarding progress percentage
 */
export function calculateOnboardingProgress(status: OnboardingStatus): number {
  const progressMap: Record<OnboardingStatus, number> = {
    INVITED: 0,
    REGISTERED: 20,
    CREDENTIALS_SUBMITTED: 40,
    CREDENTIALS_VERIFIED: 60,
    TRAINING_IN_PROGRESS: 70,
    TERMS_PENDING: 90,
    ACTIVE: 100,
    SUSPENDED: 100,
  };

  return progressMap[status] || 0;
}

/**
 * Get onboarding steps with status
 */
export function getOnboardingSteps(status: OnboardingStatus): {
  key: string;
  label: string;
  status: 'completed' | 'current' | 'pending';
}[] {
  const statusOrder: OnboardingStatus[] = [
    'INVITED',
    'REGISTERED',
    'CREDENTIALS_SUBMITTED',
    'CREDENTIALS_VERIFIED',
    'TRAINING_IN_PROGRESS',
    'TERMS_PENDING',
    'ACTIVE',
  ];

  const currentIndex = statusOrder.indexOf(status);

  return ONBOARDING_STEPS.map((step, index) => {
    let stepStatus: 'completed' | 'current' | 'pending';

    if (status === 'ACTIVE' || status === 'SUSPENDED') {
      stepStatus = 'completed';
    } else if (index < Math.floor(currentIndex / 2)) {
      stepStatus = 'completed';
    } else if (index === Math.floor(currentIndex / 2)) {
      stepStatus = 'current';
    } else {
      stepStatus = 'pending';
    }

    return {
      key: step.key,
      label: step.label,
      status: stepStatus,
    };
  });
}

/**
 * Get next action for defender
 */
export function getNextAction(status: OnboardingStatus): string {
  const actionMap: Record<OnboardingStatus, string> = {
    INVITED: 'Accept invitation and register',
    REGISTERED: 'Upload verification credentials',
    CREDENTIALS_SUBMITTED: 'Wait for credential verification',
    CREDENTIALS_VERIFIED: 'Complete training modules',
    TRAINING_IN_PROGRESS: 'Complete all required training modules',
    TERMS_PENDING: 'Accept terms of service',
    ACTIVE: 'Ready to assist debtors',
    SUSPENDED: 'Account suspended - contact support',
  };

  return actionMap[status] || 'Unknown';
}

/**
 * Get all defenders
 */
export async function getAllDefenders(options?: {
  status?: OnboardingStatus;
  verificationStatus?: VerificationStatus;
  limit?: number;
}): Promise<DefenderProfile[]> {
  let defenders = Array.from(defenderStore.values());

  if (options?.status) {
    defenders = defenders.filter((d) => d.onboardingStatus === options.status);
  }

  if (options?.verificationStatus) {
    defenders = defenders.filter((d) => d.verificationStatus === options.verificationStatus);
  }

  defenders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    defenders = defenders.slice(0, options.limit);
  }

  return defenders;
}

/**
 * Update defender profile
 */
export async function updateDefenderProfile(
  defenderId: string,
  updates: Partial<Omit<DefenderProfile, 'id' | 'userId' | 'createdAt'>>
): Promise<DefenderProfile> {
  const defender = defenderStore.get(defenderId);

  if (!defender) {
    throw new Error('Defender not found');
  }

  Object.assign(defender, updates, { updatedAt: new Date() });
  defenderStore.set(defenderId, defender);

  return defender;
}

/**
 * Suspend a defender
 */
export async function suspendDefender(
  defenderId: string,
  reason?: string
): Promise<DefenderProfile> {
  const defender = defenderStore.get(defenderId);

  if (!defender) {
    throw new Error('Defender not found');
  }

  if (defender.onboardingStatus !== 'ACTIVE') {
    throw new Error('Can only suspend active defenders');
  }

  return transitionOnboarding(defenderId, 'SUSPEND', { reason });
}

/**
 * Reactivate a suspended defender
 */
export async function reactivateDefender(defenderId: string): Promise<DefenderProfile> {
  const defender = defenderStore.get(defenderId);

  if (!defender) {
    throw new Error('Defender not found');
  }

  if (defender.onboardingStatus !== 'SUSPENDED') {
    throw new Error('Can only reactivate suspended defenders');
  }

  return transitionOnboarding(defenderId, 'REACTIVATE');
}

/**
 * Get defender statistics
 */
export async function getDefenderStats(): Promise<{
  total: number;
  active: number;
  pending: number;
  suspended: number;
  avgCaseload: number;
}> {
  const defenders = Array.from(defenderStore.values());

  const active = defenders.filter((d) => d.onboardingStatus === 'ACTIVE').length;
  const suspended = defenders.filter((d) => d.onboardingStatus === 'SUSPENDED').length;
  const pending = defenders.filter(
    (d) => !['ACTIVE', 'SUSPENDED'].includes(d.onboardingStatus)
  ).length;

  const activeDefenders = defenders.filter((d) => d.onboardingStatus === 'ACTIVE');
  const avgCaseload =
    activeDefenders.length > 0
      ? activeDefenders.reduce((sum, d) => sum + d.currentCaseload, 0) / activeDefenders.length
      : 0;

  return {
    total: defenders.length,
    active,
    pending,
    suspended,
    avgCaseload,
  };
}

function generateId(): string {
  return `def_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
