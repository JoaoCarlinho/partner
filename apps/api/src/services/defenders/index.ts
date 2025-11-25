/**
 * Defender Services Module
 * Exports all defender-related services
 */

// Invitation Service
export {
  inviteDefender,
  validateInvitation,
  getInvitationByToken,
  getInvitation,
  redeemInvitation,
  getPendingInvitations,
  getAllInvitations,
  resendInvitation,
  revokeInvitation,
  getInvitationStats,
  generateInviteUrl,
} from './invitationService';

export type { DefenderInvitation, InviteDefenderRequest, InvitationValidation } from './invitationService';

// Onboarding State Machine
export {
  createDefenderProfile,
  getDefenderProfile,
  getDefenderByUserId,
  transitionOnboarding,
  canTransition,
  calculateOnboardingProgress,
  getOnboardingSteps,
  getNextAction,
  getAllDefenders,
  updateDefenderProfile,
  suspendDefender,
  reactivateDefender,
  getDefenderStats,
} from './onboardingStateMachine';

export type {
  OnboardingStatus,
  VerificationStatus,
  OnboardingEvent,
  DefenderProfile,
  CreateDefenderRequest,
} from './onboardingStateMachine';

// Verification Service
export {
  uploadCredential,
  getDefenderCredentials,
  getCredential,
  processVerification,
  getPendingVerifications,
  deleteCredential,
  getVerificationStatus,
  getCredentialDownloadUrl,
} from './verificationService';

export type {
  CredentialType,
  DefenderCredential,
  UploadCredentialRequest,
  VerificationDecision,
} from './verificationService';

// Training Service
export {
  initializeModules,
  getTrainingModules,
  getModule,
  getModuleByCode,
  getTrainingStatus,
  getDefenderProgress,
  startModule,
  completeModule,
  resetModuleProgress,
  submitQuiz,
  getTrainingStats,
} from './trainingService';

export type {
  TrainingModule,
  ModuleContent,
  TrainingProgress,
  TrainingStatus,
  ModuleWithStatus,
} from './trainingService';

// Terms of Service constants
export const CURRENT_TOS_VERSION = '1.0.0';
export const TOS_EFFECTIVE_DATE = new Date('2025-01-01');
