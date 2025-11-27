/**
 * Defender Onboarding Page
 * Multi-step wizard for public defender onboarding process
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUploadCredential,
  useSubmitCredentials,
  useCompleteModule,
  useAcceptTerms,
  useOnboardingStatus,
  validateCredentialFile,
  CURRENT_TERMS_VERSION,
  type OnboardingStatusResponse,
  type TrainingModule,
  type UploadedCredential,
  type UploadProgress,
} from '../hooks';

// Types
type OnboardingStep = 'credentials' | 'training' | 'terms' | 'complete';

interface OnboardingPageProps {
  initialStatus?: OnboardingStatusResponse | null;
}

// Helper function to determine current step from API status
const getStepFromStatus = (status: OnboardingStatusResponse['status']): OnboardingStep => {
  switch (status) {
    case 'INVITED':
    case 'REGISTERED':
      return 'credentials';
    case 'CREDENTIALS_SUBMITTED':
      return 'credentials'; // Still show credentials as pending verification
    case 'CREDENTIALS_VERIFIED':
    case 'TRAINING_IN_PROGRESS':
      return 'training';
    case 'TERMS_PENDING':
      return 'terms';
    case 'ACTIVE':
      return 'complete';
    default:
      return 'credentials';
  }
};

// Helper function to calculate progress from status
const getProgressFromStatus = (status: OnboardingStatusResponse['status']): number => {
  switch (status) {
    case 'INVITED':
    case 'REGISTERED':
      return 0;
    case 'CREDENTIALS_SUBMITTED':
      return 25;
    case 'CREDENTIALS_VERIFIED':
      return 33;
    case 'TRAINING_IN_PROGRESS':
      return 50;
    case 'TERMS_PENDING':
      return 75;
    case 'ACTIVE':
      return 100;
    default:
      return 0;
  }
};

// Default mock data for when API is not available
const DEFAULT_TRAINING_MODULES: TrainingModule[] = [
  {
    id: '1',
    code: 'PLATFORM_OVERVIEW',
    title: 'Platform Overview',
    description: 'Learn how the platform works',
    duration: 15,
    required: true,
    status: 'not_started',
  },
  {
    id: '2',
    code: 'DEBTOR_RIGHTS',
    title: 'Debtor Rights & FDCPA',
    description: 'Understand debtor protections',
    duration: 30,
    required: true,
    status: 'not_started',
  },
  {
    id: '3',
    code: 'COMMUNICATION_TOOLS',
    title: 'Using Communication Tools',
    description: 'Effective debtor communication',
    duration: 20,
    required: true,
    status: 'not_started',
  },
  {
    id: '4',
    code: 'PAYMENT_GUIDANCE',
    title: 'Payment Plan Guidance',
    description: 'Help debtors manage plans',
    duration: 25,
    required: true,
    status: 'not_started',
  },
  {
    id: '5',
    code: 'PRIVACY_CONFIDENTIALITY',
    title: 'Privacy & Confidentiality',
    description: 'Handle sensitive information',
    duration: 15,
    required: true,
    status: 'not_started',
  },
];

interface LocalCredential {
  type: string;
  fileName?: string;
  uploadedAt?: string;
  verified: boolean;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ initialStatus }) => {
  const router = useRouter();

  // API hooks
  const { upload: uploadCredential, uploading, progress: uploadProgress, error: uploadError } = useUploadCredential();
  const { submit: submitCredentials, submitting: submittingCredentials } = useSubmitCredentials();
  const { complete: completeModuleApi, completing: completingModule } = useCompleteModule();
  const { accept: acceptTermsApi, accepting: acceptingTerms } = useAcceptTerms();
  const { refetch: refetchStatus } = useOnboardingStatus();

  // Local state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    initialStatus ? getStepFromStatus(initialStatus.status) : 'credentials'
  );
  const [progress, setProgress] = useState(
    initialStatus ? getProgressFromStatus(initialStatus.status) : 0
  );
  const [credentialsSubmitted, setCredentialsSubmitted] = useState(
    initialStatus?.status === 'CREDENTIALS_SUBMITTED' ||
    initialStatus?.status === 'CREDENTIALS_VERIFIED' ||
    initialStatus?.status === 'TRAINING_IN_PROGRESS' ||
    initialStatus?.status === 'TERMS_PENDING' ||
    initialStatus?.status === 'ACTIVE'
  );
  const [credentials, setCredentials] = useState<LocalCredential[]>(() => {
    if (initialStatus?.credentials?.length) {
      return [
        { type: 'BAR_CARD', verified: false },
        { type: 'PHOTO_ID', verified: false },
        { type: 'ORGANIZATION_LETTER', verified: false },
      ].map(cred => {
        const uploaded = initialStatus.credentials.find(c => c.type === cred.type);
        return uploaded
          ? { ...cred, fileName: uploaded.fileName, uploadedAt: uploaded.uploadedAt, verified: uploaded.verified }
          : cred;
      });
    }
    return [
      { type: 'BAR_CARD', verified: false },
      { type: 'PHOTO_ID', verified: false },
      { type: 'ORGANIZATION_LETTER', verified: false },
    ];
  });
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>(
    initialStatus?.trainingModules?.length ? initialStatus.trainingModules : DEFAULT_TRAINING_MODULES
  );
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  // Handle file upload with API integration
  const handleFileUpload = useCallback(
    async (type: string, file: File) => {
      // Validate file first
      const validationError = validateCredentialFile(file);
      if (validationError) {
        setFileError(validationError);
        return;
      }
      setFileError(null);
      setUploadingType(type);

      try {
        const result = await uploadCredential(type, file);
        setCredentials((prev) =>
          prev.map((c) =>
            c.type === type
              ? { ...c, fileName: result.fileName || file.name, uploadedAt: result.uploadedAt || new Date().toISOString() }
              : c
          )
        );
      } catch (err) {
        // For development/demo: fall back to local state
        console.warn('Upload API not available, using local state');
        setCredentials((prev) =>
          prev.map((c) =>
            c.type === type
              ? { ...c, fileName: file.name, uploadedAt: new Date().toISOString() }
              : c
          )
        );
      } finally {
        setUploadingType(null);
      }
    },
    [uploadCredential]
  );

  // Handle credentials submission
  const handleSubmitCredentials = async () => {
    setLoading(true);
    try {
      await submitCredentials();
      setCredentialsSubmitted(true);
      setProgress(25);
      await refetchStatus();
    } catch (err) {
      // For development/demo: fall back to local state
      console.warn('Submit API not available, using local state');
      setCredentialsSubmitted(true);
      setProgress(25);
    } finally {
      setLoading(false);
    }
  };

  // Handle module start (local only - API tracks completion)
  const handleStartModule = async (moduleId: string) => {
    setTrainingModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, status: 'in_progress' } : m))
    );
  };

  // Handle module completion with API
  const handleCompleteModule = async (moduleId: string) => {
    try {
      await completeModuleApi(moduleId);
      setTrainingModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, status: 'completed', completedAt: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      // For development/demo: fall back to local state
      console.warn('Complete module API not available, using local state');
      setTrainingModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, status: 'completed', completedAt: new Date().toISOString() }
            : m
        )
      );
    }

    // Check if all required modules completed
    const updated = trainingModules.map((m) =>
      m.id === moduleId ? { ...m, status: 'completed' as const } : m
    );
    const allRequired = updated.filter((m) => m.required);
    const allCompleted = allRequired.every((m) => m.status === 'completed');

    if (allCompleted) {
      setCurrentStep('terms');
      setProgress(75);
    }
  };

  // Handle terms acceptance with API
  const handleAcceptTerms = async () => {
    if (!termsAgreed) return;

    setLoading(true);
    try {
      await acceptTermsApi();
      setCurrentStep('complete');
      setProgress(100);
    } catch (err) {
      // For development/demo: fall back to local state
      console.warn('Accept terms API not available, using local state');
      setCurrentStep('complete');
      setProgress(100);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Continue to Training" after credentials verified
  const handleContinueToTraining = () => {
    setCurrentStep('training');
    setProgress(33);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'credentials':
        return renderCredentialsStep();
      case 'training':
        return renderTrainingStep();
      case 'terms':
        return renderTermsStep();
      case 'complete':
        return renderCompleteStep();
    }
  };

  const renderCredentialsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Credential Verification</h2>
        <p className="mt-1 text-sm text-gray-600">
          Please upload the following documents for verification. Your documents will be
          reviewed by our admin team.
        </p>
      </div>

      {fileError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">{fileError}</p>
          </div>
        </div>
      )}

      {credentialsSubmitted ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-blue-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                Your credentials have been submitted and are pending review. We will notify you
                once verification is complete.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Expected verification time: 1-2 business days
              </p>
            </div>
          </div>
          {/* Show submitted files */}
          <div className="mt-4 space-y-2">
            {credentials.filter(c => c.fileName).map((credential) => (
              <div key={credential.type} className="flex items-center justify-between bg-white rounded p-2 border">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">{credential.fileName}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {credential.type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
          {/* Demo button to continue */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleContinueToTraining}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue to Training (Demo)
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {credentials.map((credential) => (
              <CredentialUploadCard
                key={credential.type}
                type={credential.type}
                fileName={credential.fileName}
                uploadedAt={credential.uploadedAt}
                required={credential.type !== 'ORGANIZATION_LETTER'}
                uploading={uploadingType === credential.type}
                progress={uploadingType === credential.type ? uploadProgress : null}
                onUpload={(file) => handleFileUpload(credential.type, file)}
              />
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitCredentials}
              disabled={
                loading ||
                submittingCredentials ||
                !credentials.some((c) => c.type === 'BAR_CARD' && c.fileName) ||
                !credentials.some((c) => c.type === 'PHOTO_ID' && c.fileName)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {(loading || submittingCredentials) && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Submit for Verification
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderTrainingStep = () => {
    const requiredModules = trainingModules.filter((m) => m.required);
    const completedCount = requiredModules.filter((m) => m.status === 'completed').length;
    const trainingProgress = requiredModules.length > 0
      ? Math.round((completedCount / requiredModules.length) * 100)
      : 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Training Modules</h2>
          <p className="mt-1 text-sm text-gray-600">
            Complete all required training modules to proceed.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Training Progress</span>
            <span className="font-medium">
              {completedCount} of {requiredModules.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${trainingProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {trainingModules.map((module, index) => (
            <TrainingModuleCard
              key={module.id}
              module={module}
              index={index + 1}
              completing={completingModule}
              onStart={() => handleStartModule(module.id)}
              onComplete={() => handleCompleteModule(module.id)}
            />
          ))}
        </div>

        {completedCount === requiredModules.length && requiredModules.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-800">
                All required training modules completed! You can now proceed to the final step.
              </p>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setCurrentStep('terms');
                  setProgress(75);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Continue to Terms
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTermsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Terms of Service</h2>
        <p className="mt-1 text-sm text-gray-600">
          Please review and accept the Public Defender Terms of Service.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto border">
        <h3 className="font-semibold mb-2">Public Defender Terms of Service</h3>
        <p className="text-sm text-gray-700 mb-4">Version {CURRENT_TERMS_VERSION} - Effective January 1, 2025</p>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            By accepting these terms, you agree to serve as a Public Defender on the platform
            and comply with the following obligations:
          </p>
          <p>
            <strong>1. Confidentiality:</strong> You will maintain strict confidentiality of all
            debtor information and will only access information for debtors assigned to you.
          </p>
          <p>
            <strong>2. Professional Conduct:</strong> You will conduct yourself professionally
            and provide guidance in accordance with applicable laws and regulations.
          </p>
          <p>
            <strong>3. Conflict of Interest:</strong> You will disclose any conflicts of interest
            and recuse yourself from cases where appropriate.
          </p>
          <p>
            <strong>4. Compliance:</strong> You will comply with all platform policies, FDCPA
            requirements, and other applicable regulations.
          </p>
          <p>
            <strong>5. Reporting:</strong> You will promptly report any violations or concerns
            to the platform administrators.
          </p>
          <p>
            <strong>6. Data Security:</strong> You will take appropriate measures to protect all
            confidential information and will not share or disclose it to unauthorized parties.
          </p>
          <p>
            <strong>7. Availability:</strong> You will maintain reasonable availability to respond
            to assigned cases and debtor inquiries in a timely manner.
          </p>
          <p>
            <strong>8. Termination:</strong> Either party may terminate this agreement with 30 days
            written notice. Immediate termination may occur for violations of these terms.
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="terms-agree"
          checked={termsAgreed}
          onChange={(e) => setTermsAgreed(e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <label htmlFor="terms-agree" className="ml-2 text-sm text-gray-700">
          I have read and agree to the Public Defender Terms of Service
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAcceptTerms}
          disabled={!termsAgreed || loading || acceptingTerms}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {(loading || acceptingTerms) && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          Accept & Complete Onboarding
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
      <p className="text-lg text-gray-700 mb-2">You&apos;ve successfully completed your onboarding.</p>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        As an active public defender on our platform, you can now:
      </p>
      <ul className="text-left max-w-sm mx-auto mb-8 space-y-2">
        <li className="flex items-center text-gray-700">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Receive case assignments
        </li>
        <li className="flex items-center text-gray-700">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Communicate with debtors
        </li>
        <li className="flex items-center text-gray-700">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Provide guidance and advocacy
        </li>
      </ul>
      <button
        onClick={() => router.push('/defender/dashboard')}
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Public Defender Onboarding</h1>
          <p className="text-gray-600 mt-1">Complete the steps below to activate your account</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-between mb-8">
          {['Credentials', 'Training', 'Terms', 'Complete'].map((step, index) => {
            const steps: OnboardingStep[] = ['credentials', 'training', 'terms', 'complete'];
            const stepKey = steps[index];
            const currentStepIndex = steps.indexOf(currentStep);
            const isCompleted = index < currentStepIndex;
            const isCurrent = stepKey === currentStep;

            return (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs mt-1 ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">{renderStep()}</div>
      </div>
    </div>
  );
};

// Credential Upload Card Component
interface CredentialUploadCardProps {
  type: string;
  fileName?: string;
  uploadedAt?: string;
  required: boolean;
  uploading?: boolean;
  progress?: UploadProgress | null;
  onUpload: (file: File) => void;
}

const CredentialUploadCard: React.FC<CredentialUploadCardProps> = ({
  type,
  fileName,
  uploadedAt,
  required,
  uploading,
  progress,
  onUpload,
}) => {
  const typeLabels: Record<string, string> = {
    BAR_CARD: 'Bar Card',
    PHOTO_ID: 'Photo ID',
    ORGANIZATION_LETTER: 'Organization Letter',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900">
            {typeLabels[type] || type}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <p className="text-sm text-gray-500">PDF, JPEG, PNG, or WebP up to 10MB</p>
        </div>
        {fileName && !uploading && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Uploaded
          </span>
        )}
      </div>

      {uploading && progress ? (
        <div className="bg-blue-50 rounded p-3">
          <div className="flex items-center mb-2">
            <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-blue-800">Uploading... {progress.percentage}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-150"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      ) : fileName ? (
        <div className="flex items-center justify-between bg-gray-50 rounded p-3">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-gray-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <span className="text-sm text-gray-700">{fileName}</span>
              {uploadedAt && (
                <span className="text-xs text-gray-500 block">
                  Uploaded {new Date(uploadedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
            Replace
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="mt-1 text-sm text-gray-500">Click to upload</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
};

// Training Module Card Component
interface TrainingModuleCardProps {
  module: TrainingModule;
  index: number;
  completing?: boolean;
  onStart: () => void;
  onComplete: () => void;
}

const TrainingModuleCard: React.FC<TrainingModuleCardProps> = ({
  module,
  index,
  completing,
  onStart,
  onComplete,
}) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
            module.status === 'completed'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {module.status === 'completed' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : index}
          </span>
          <div>
            <h3 className="font-medium text-gray-900">
              {module.title}
              {module.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <p className="text-sm text-gray-500">{module.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              {module.duration} min
              {module.completedAt && (
                <span className="ml-2">
                  Completed on {new Date(module.completedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div>
          {module.status === 'completed' ? (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Complete
            </span>
          ) : module.status === 'in_progress' ? (
            <button
              onClick={onComplete}
              disabled={completing}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {completing && (
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Mark Complete
            </button>
          ) : (
            <button
              onClick={onStart}
              className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
