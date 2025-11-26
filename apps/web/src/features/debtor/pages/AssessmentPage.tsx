/**
 * Assessment Page
 * Financial assessment page with chat or form mode
 */

import React, { useState, useEffect } from 'react';
import { AssessmentChat } from '../components/AssessmentChat';
import { AssessmentForm } from '../components/AssessmentForm';

type AssessmentMode = 'chat' | 'form';

interface AssessmentPageProps {
  caseId?: string;
  debtAmount?: number;
  creditorName?: string;
  onComplete?: (assessmentId: string, summary: any) => void;
  onBack?: () => void;
}

interface CaseData {
  caseId: string;
  debtAmount: number;
  creditorName: string;
}

/**
 * Mode toggle component
 */
const ModeToggle: React.FC<{
  mode: AssessmentMode;
  onChange: (mode: AssessmentMode) => void;
}> = ({ mode, onChange }) => (
  <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
    <span className="text-sm text-gray-500">Prefer a different experience?</span>
    <div className="flex bg-gray-200 rounded-full p-1">
      <button
        onClick={() => onChange('chat')}
        className={`px-4 py-1 text-sm rounded-full transition-colors ${
          mode === 'chat' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => onChange('form')}
        className={`px-4 py-1 text-sm rounded-full transition-colors ${
          mode === 'form' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        Form
      </button>
    </div>
  </div>
);

/**
 * Loading skeleton component
 */
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 p-6">
    <div className="h-8 bg-gray-200 rounded w-1/3" />
    <div className="h-4 bg-gray-200 rounded w-2/3" />
    <div className="space-y-3 mt-8">
      <div className="h-12 bg-gray-200 rounded" />
      <div className="h-12 bg-gray-200 rounded" />
      <div className="h-12 bg-gray-200 rounded" />
    </div>
  </div>
);

/**
 * Completion view component
 */
const CompletionView: React.FC<{
  summary: any;
  onContinue: () => void;
  onViewOptions: () => void;
}> = ({ summary, onContinue, onViewOptions }) => (
  <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md mx-auto">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank You</h2>
    <p className="text-gray-600 mb-6">
      We've recorded your information. This will help us find payment options that work for your situation.
    </p>

    {summary && (
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Summary</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          {summary.incomeRange && (
            <li>
              <span className="text-gray-500">Income:</span> {summary.incomeRange}
            </li>
          )}
          {summary.expenseLevel && (
            <li>
              <span className="text-gray-500">Expenses:</span> {summary.expenseLevel}
            </li>
          )}
          <li>
            <span className="text-gray-500">Other obligations:</span> {summary.otherObligations ? 'Yes' : 'No'}
          </li>
        </ul>
      </div>
    )}

    <div className="space-y-3">
      <button
        onClick={onViewOptions}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
      >
        View Payment Options
      </button>
      <button
        onClick={onContinue}
        className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
      >
        Return to Dashboard
      </button>
    </div>
  </div>
);

export const AssessmentPage: React.FC<AssessmentPageProps> = ({
  caseId: propCaseId,
  debtAmount: propDebtAmount,
  creditorName: propCreditorName,
  onComplete,
  onBack,
}) => {
  const [mode, setMode] = useState<AssessmentMode>('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load case data if not provided via props
  useEffect(() => {
    if (propCaseId && propDebtAmount !== undefined && propCreditorName) {
      setCaseData({
        caseId: propCaseId,
        debtAmount: propDebtAmount,
        creditorName: propCreditorName,
      });
      setIsLoading(false);
    } else {
      loadCaseData();
    }
  }, [propCaseId, propDebtAmount, propCreditorName]);

  const loadCaseData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/debtors/dashboard');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load case data');
      }

      setCaseData({
        caseId: data.data.caseId,
        debtAmount: data.data.amountOwed?.total || 0,
        creditorName: data.data.creditorInfo?.name || 'Unknown Creditor',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load case data');
      // Use mock data for development
      setCaseData({
        caseId: 'mock-case-id',
        debtAmount: 2500,
        creditorName: 'Example Creditor',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatComplete = (assessmentId: string, summary: any) => {
    setCompletionSummary(summary);
    setIsComplete(true);
    onComplete?.(assessmentId, summary);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      // Start a session and immediately complete with form data
      const startResponse = await fetch('/api/v1/debtors/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData?.caseId,
          debtAmount: caseData?.debtAmount,
          creditorName: caseData?.creditorName,
        }),
      });

      const startData = await startResponse.json();

      if (!startData.success) {
        throw new Error(startData.error || 'Failed to submit assessment');
      }

      // Submit all responses at once (simplified for form mode)
      const completeResponse = await fetch('/api/v1/debtors/assessment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: startData.data.sessionId,
        }),
      });

      const completeData = await completeResponse.json();

      if (completeData.success) {
        setCompletionSummary({
          incomeRange: formData.incomeRange,
          expenseLevel:
            formData.expenseCategories.length >= 5
              ? 'high'
              : formData.expenseCategories.length >= 3
              ? 'moderate'
              : 'low',
          otherObligations: formData.otherObligations.length > 0,
          stressLevel: formData.stressLevel,
        });
        setIsComplete(true);
        onComplete?.(completeData.data.assessmentId, completeData.data.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment');
    }
  };

  const handleEscalate = (resources: string[]) => {
    console.log('Escalation triggered with resources:', resources);
    // Could trigger a modal, notification, or other UI element
  };

  const handleContinue = () => {
    onBack?.();
  };

  const handleViewOptions = () => {
    // Navigate to payment options
    window.location.href = '/payment-options';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <CompletionView summary={completionSummary} onContinue={handleContinue} onViewOptions={handleViewOptions} />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Unable to load case data'}</p>
          <button
            onClick={loadCaseData}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          {onBack && (
            <button onClick={onBack} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
              <span>←</span> Back
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-900">Financial Assessment</h1>
          <div className="w-16" /> {/* Spacer for alignment */}
        </div>

        {/* Mode toggle */}
        <div className="mb-4">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Assessment content */}
        {mode === 'chat' ? (
          <div className="h-[600px]">
            <AssessmentChat
              caseId={caseData.caseId}
              debtAmount={caseData.debtAmount}
              creditorName={caseData.creditorName}
              onComplete={handleChatComplete}
              onEscalate={handleEscalate}
              className="h-full"
            />
          </div>
        ) : (
          <AssessmentForm onSubmit={handleFormSubmit} onCancel={onBack || (() => {})} />
        )}

        {/* Privacy notice */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Privacy First:</strong> All information you share is kept confidential and is only used to help
            find payment options that work for your situation. You can skip any question you're not comfortable
            answering.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;
