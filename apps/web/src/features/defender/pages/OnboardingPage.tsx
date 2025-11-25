/**
 * Defender Onboarding Page
 * Multi-step wizard for public defender onboarding process
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types
type OnboardingStep = 'credentials' | 'training' | 'terms' | 'complete';

interface OnboardingStatus {
  currentStep: OnboardingStep;
  progress: number;
  credentialsSubmitted: boolean;
  credentialsVerified: boolean;
  trainingCompleted: boolean;
  termsAccepted: boolean;
}

interface TrainingModule {
  id: string;
  code: string;
  title: string;
  description: string;
  duration: number;
  required: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
}

interface Credential {
  type: string;
  fileName?: string;
  uploadedAt?: string;
  verified: boolean;
}

export const OnboardingPage: React.FC = () => {
  const [status, setStatus] = useState<OnboardingStatus>({
    currentStep: 'credentials',
    progress: 0,
    credentialsSubmitted: false,
    credentialsVerified: false,
    trainingCompleted: false,
    termsAccepted: false,
  });
  const [credentials, setCredentials] = useState<Credential[]>([
    { type: 'BAR_CARD', verified: false },
    { type: 'PHOTO_ID', verified: false },
    { type: 'ORGANIZATION_LETTER', verified: false },
  ]);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(false);

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch('/api/v1/defenders/onboarding/status');
      // const data = await response.json();

      // Mock data
      setTrainingModules([
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
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (type: string, file: File) => {
      // In production, upload to API
      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('type', type);
      // await fetch('/api/v1/defenders/credentials', { method: 'POST', body: formData });

      setCredentials((prev) =>
        prev.map((c) =>
          c.type === type
            ? { ...c, fileName: file.name, uploadedAt: new Date().toISOString() }
            : c
        )
      );
    },
    []
  );

  const handleSubmitCredentials = async () => {
    // In production, submit to API
    setStatus((prev) => ({
      ...prev,
      credentialsSubmitted: true,
      progress: 40,
    }));
  };

  const handleStartModule = async (moduleId: string) => {
    setTrainingModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, status: 'in_progress' } : m))
    );
  };

  const handleCompleteModule = async (moduleId: string) => {
    setTrainingModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, status: 'completed', completedAt: new Date().toISOString() }
          : m
      )
    );

    // Check if all required modules completed
    const updated = trainingModules.map((m) =>
      m.id === moduleId ? { ...m, status: 'completed' as const } : m
    );
    const allRequired = updated.filter((m) => m.required);
    const allCompleted = allRequired.every((m) => m.status === 'completed');

    if (allCompleted) {
      setStatus((prev) => ({
        ...prev,
        trainingCompleted: true,
        currentStep: 'terms',
        progress: 90,
      }));
    }
  };

  const handleAcceptTerms = async () => {
    if (!termsAgreed) return;

    // In production, submit to API
    setStatus((prev) => ({
      ...prev,
      termsAccepted: true,
      currentStep: 'complete',
      progress: 100,
    }));
  };

  const renderStep = () => {
    switch (status.currentStep) {
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

      {status.credentialsSubmitted ? (
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
            <p className="text-sm text-blue-800">
              Your credentials have been submitted and are pending review. We will notify you
              once verification is complete.
            </p>
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
                onUpload={(file) => handleFileUpload(credential.type, file)}
              />
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitCredentials}
              disabled={!credentials.some((c) => c.type === 'BAR_CARD' && c.fileName) ||
                       !credentials.some((c) => c.type === 'PHOTO_ID' && c.fileName)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
    const trainingProgress = Math.round((completedCount / requiredModules.length) * 100);

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
              onStart={() => handleStartModule(module.id)}
              onComplete={() => handleCompleteModule(module.id)}
            />
          ))}
        </div>
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

      <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
        <h3 className="font-semibold mb-2">Public Defender Terms of Service</h3>
        <p className="text-sm text-gray-700 mb-4">Version 1.0.0 - Effective January 1, 2025</p>
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
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="terms-agree"
          checked={termsAgreed}
          onChange={(e) => setTermsAgreed(e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded border-gray-300"
        />
        <label htmlFor="terms-agree" className="ml-2 text-sm text-gray-700">
          I have read and agree to the Public Defender Terms of Service
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAcceptTerms}
          disabled={!termsAgreed}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Accept & Complete Onboarding
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Complete!</h2>
      <p className="text-gray-600 mb-6">
        You are now an active Public Defender on the platform. You can start assisting
        debtors once cases are assigned to you.
      </p>
      <a
        href="/defender/dashboard"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Go to Dashboard
        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Public Defender Onboarding</h1>
        <p className="text-gray-600 mt-1">Complete the steps below to activate your account</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{status.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-between mb-8">
        {['Credentials', 'Training', 'Terms', 'Complete'].map((step, index) => {
          const stepProgress = index * 33;
          const isCompleted = status.progress > stepProgress;
          const isCurrent =
            status.progress >= stepProgress && status.progress < stepProgress + 33;

          return (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
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
              <span className="text-xs mt-1 text-gray-600">{step}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-6">{renderStep()}</div>
    </div>
  );
};

// Credential Upload Card Component
interface CredentialUploadCardProps {
  type: string;
  fileName?: string;
  uploadedAt?: string;
  required: boolean;
  onUpload: (file: File) => void;
}

const CredentialUploadCard: React.FC<CredentialUploadCardProps> = ({
  type,
  fileName,
  uploadedAt,
  required,
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
          <p className="text-sm text-gray-500">PDF, JPEG, or PNG up to 10MB</p>
        </div>
        {fileName && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
            Uploaded
          </span>
        )}
      </div>

      {fileName ? (
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
            <span className="text-sm text-gray-700">{fileName}</span>
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
  onStart: () => void;
  onComplete: () => void;
}

const TrainingModuleCard: React.FC<TrainingModuleCardProps> = ({
  module,
  index,
  onStart,
  onComplete,
}) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 mr-3">
            {index}
          </span>
          <div>
            <h3 className="font-medium text-gray-900">{module.title}</h3>
            <p className="text-sm text-gray-500">{module.description}</p>
            <p className="text-xs text-gray-400 mt-1">{module.duration} min</p>
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
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Complete
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
