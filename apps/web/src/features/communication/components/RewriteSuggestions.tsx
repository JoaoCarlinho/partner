/**
 * Rewrite Suggestions Component
 * Displays AI-generated suggestions for improving message tone
 */

import React, { useState } from 'react';
import SuggestionCard from './SuggestionCard';

interface RewriteSuggestion {
  id: string;
  suggestedText: string;
  warmthImprovement: number;
  changes: string[];
}

interface RewriteSuggestionsProps {
  originalMessage: string;
  originalScore: number;
  suggestions: RewriteSuggestion[];
  onAccept: (suggestion: RewriteSuggestion) => void;
  onEdit: (suggestion: RewriteSuggestion) => void;
  onDismiss: () => void;
  isBlocked?: boolean;
  className?: string;
}

/**
 * Score indicator
 */
const ScoreIndicator: React.FC<{
  original: number;
  improved: number;
}> = ({ original, improved }) => {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Current:</span>
        <span className={`font-medium ${original < 30 ? 'text-red-600' : original < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
          {original}
        </span>
      </div>
      <svg
        className="w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">After:</span>
        <span className="font-medium text-green-600">~{Math.min(100, improved)}</span>
      </div>
    </div>
  );
};

export const RewriteSuggestions: React.FC<RewriteSuggestionsProps> = ({
  originalMessage,
  originalScore,
  suggestions,
  onAccept,
  onEdit,
  onDismiss,
  isBlocked = false,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate best potential score
  const bestImprovement = Math.max(...suggestions.map((s) => s.warmthImprovement));
  const potentialScore = originalScore + bestImprovement;

  const handleAccept = async (suggestion: RewriteSuggestion) => {
    setIsLoading(true);
    try {
      await onAccept(suggestion);
    } finally {
      setIsLoading(false);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border ${
        isBlocked ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'
      } p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-medium ${isBlocked ? 'text-red-800' : 'text-blue-800'}`}>
            {isBlocked ? 'Message Needs Revision' : 'Improve Your Message'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isBlocked
              ? 'Your message cannot be sent as-is. Please choose or edit a warmer version.'
              : 'We suggest making your message warmer for better communication.'}
          </p>
        </div>
        {!isBlocked && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss suggestions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Score improvement indicator */}
      <div className="mb-4 p-3 bg-white rounded-lg">
        <ScoreIndicator original={originalScore} improved={potentialScore} />
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            originalMessage={originalMessage}
            onAccept={() => {
              setSelectedIndex(index);
              handleAccept(suggestion);
            }}
            onEdit={() => onEdit(suggestion)}
            isSelected={selectedIndex === index}
          />
        ))}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Applying...</span>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Suggestions are AI-generated. Review before sending.
        </p>
        {!isBlocked && (
          <button
            onClick={onDismiss}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Send original anyway
          </button>
        )}
      </div>
    </div>
  );
};

export default RewriteSuggestions;
