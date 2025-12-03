'use client';

import { useState, useEffect } from 'react';
import { DiffViewer } from './DiffViewer';
import { ComplianceComparison, calculateComplianceChange } from './ComplianceComparison';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const DEFAULT_SUGGESTIONS = [
  'Make tone more professional',
  'Simplify language for readability',
  'Emphasize dispute rights',
  'Strengthen payment urgency',
];

const MAX_LENGTH = 1000;

interface ComplianceCheck {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
}

interface ComplianceResult {
  isCompliant: boolean;
  score: number;
  checks: ComplianceCheck[];
}

interface RefinementResult {
  id: string;
  content: string;
  version: number;
  previousVersion: number;
  refinementInstruction: string;
  complianceResult: ComplianceResult;
  diff: {
    additions: number;
    deletions: number;
  };
  warnings: string[];
}

type RefinementState = 'idle' | 'loading' | 'success' | 'error';

interface RefinementPanelProps {
  letterId: string;
  originalContent: string;
  beforeCompliance?: ComplianceResult;
  onRefine: (instruction: string) => Promise<RefinementResult>;
  onAccept?: (result: RefinementResult) => Promise<void> | void;
  onReject?: () => void;
  disabled?: boolean;
}

export function RefinementPanel({
  letterId,
  originalContent,
  beforeCompliance,
  onRefine,
  onAccept,
  onReject,
  disabled = false,
}: RefinementPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [refinementState, setRefinementState] = useState<RefinementState>('idle');
  const [refinementResult, setRefinementResult] = useState<RefinementResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastInstruction, setLastInstruction] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);

  const charCount = instruction.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const isEmpty = !instruction.trim();
  const isReviewing = refinementState === 'success' && refinementResult !== null;
  const canRefine = !isEmpty && !isOverLimit && !disabled && refinementState !== 'loading' && !isReviewing;

  // Check if compliance improved significantly
  const complianceChange = beforeCompliance && refinementResult?.complianceResult
    ? calculateComplianceChange(beforeCompliance.score, refinementResult.complianceResult.score)
    : null;

  // Fetch refinement suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/v1/demands/refinement-suggestions`, {
          credentials: 'include',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
          }
        }
      } catch (error) {
        console.error('Failed to fetch refinement suggestions:', error);
        // Keep default suggestions on error
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setInstruction(suggestion);
  };

  const handleRefine = async () => {
    if (!canRefine) return;

    setRefinementState('loading');
    setErrorMessage('');
    setLastInstruction(instruction);

    try {
      const result = await onRefine(instruction);
      setRefinementResult(result);
      setRefinementState('success');
      setInstruction('');
    } catch (error) {
      console.error('Refinement failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to refine letter. Please try again.');
      setRefinementState('error');
    }
  };

  const handleRetry = () => {
    setInstruction(lastInstruction);
    setRefinementState('idle');
    setErrorMessage('');
  };

  const handleDismissResults = () => {
    setRefinementResult(null);
    setRefinementState('idle');
    setLastInstruction('');
  };

  const handleAccept = async () => {
    if (refinementResult && onAccept) {
      setIsAccepting(true);
      try {
        await onAccept(refinementResult);
        handleDismissResults();
      } catch (error) {
        console.error('Failed to accept changes:', error);
        setErrorMessage('Failed to accept changes. Please try again.');
      } finally {
        setIsAccepting(false);
      }
    }
  };

  const handleReject = () => {
    // Check for significant improvement before rejecting
    if (complianceChange?.isSignificantImprovement) {
      setShowRejectConfirmation(true);
    } else {
      confirmReject();
    }
  };

  const confirmReject = () => {
    if (onReject) {
      onReject();
    }
    setShowRejectConfirmation(false);
    handleDismissResults();
  };

  const cancelReject = () => {
    setShowRejectConfirmation(false);
  };

  // Loading State
  if (refinementState === 'loading') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Refining your letter...</p>
          <p className="text-sm text-gray-500 mt-1">This may take up to 30 seconds</p>
        </div>
      </div>
    );
  }

  // Error State
  if (refinementState === 'error') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Refinement Failed</h4>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleDismissResults}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Results View
  if (isReviewing && refinementResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Refinement Results</h3>

        {/* Instruction used */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Instruction:</span> "{refinementResult.refinementInstruction}"
          </p>
        </div>

        {/* Warnings */}
        {refinementResult.warnings && refinementResult.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">AI Warnings</p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {refinementResult.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Diff Viewer */}
        <div className="mb-4">
          <DiffViewer
            originalContent={originalContent}
            refinedContent={refinementResult.content}
          />
        </div>

        {/* Compliance Comparison */}
        {beforeCompliance && refinementResult.complianceResult && (
          <div className="mb-4">
            <ComplianceComparison
              beforeCompliance={beforeCompliance}
              afterCompliance={refinementResult.complianceResult}
            />
          </div>
        )}

        {/* Fallback: Simple Compliance Score (when no before compliance) */}
        {!beforeCompliance && refinementResult.complianceResult && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Compliance Score:</span>{' '}
              <span className={refinementResult.complianceResult.score >= 80 ? 'text-green-600' : 'text-yellow-600'}>
                {refinementResult.complianceResult.score}%
              </span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleReject}
            disabled={isAccepting}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject Changes
          </button>
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Accepting...</span>
              </>
            ) : (
              'Accept Changes'
            )}
          </button>
        </div>

        {/* Reject Confirmation Modal */}
        {showRejectConfirmation && complianceChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Reject Improved Content?</h4>
              <p className="text-gray-600 mb-4">
                The refined content has a <span className="font-medium text-green-600">+{complianceChange.change}%</span> higher compliance score.
                Are you sure you want to reject these changes?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelReject}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Idle State - Input Form
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Refinement</h3>

      {/* Quick Suggestions */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Quick Suggestions:</p>
        {loadingSuggestions ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            Loading suggestions...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={disabled}
                className="px-3 py-2 text-sm text-left border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors truncate"
                title={suggestion}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Instruction Input */}
      <div className="mb-4">
        <label htmlFor="refinement-instruction" className="block text-sm font-medium text-gray-700 mb-2">
          Or enter your own instruction:
        </label>
        <textarea
          id="refinement-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe how you'd like to refine the letter..."
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={3}
        />
        <div className="flex justify-end mt-1">
          <span className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
            {charCount}/{MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Refine Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefine}
          disabled={!canRefine}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Refine Letter
        </button>
      </div>
    </div>
  );
}

// Export types for use in other components
export type { RefinementResult, RefinementPanelProps, ComplianceResult, ComplianceCheck };
