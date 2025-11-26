/**
 * Suggestion Card Component
 * Displays a single rewrite suggestion with before/after comparison
 */

import React from 'react';

interface RewriteSuggestion {
  id: string;
  suggestedText: string;
  warmthImprovement: number;
  changes: string[];
}

interface SuggestionCardProps {
  suggestion: RewriteSuggestion;
  originalMessage: string;
  onAccept: () => void;
  onEdit: () => void;
  isSelected?: boolean;
}

/**
 * Highlight changes in the suggested text
 */
const HighlightedText: React.FC<{ original: string; suggested: string }> = ({
  original,
  suggested,
}) => {
  // Simple highlighting - show the full suggested text
  // In production, would use diff algorithm for word-level highlighting
  const isSignificantlyDifferent = original.toLowerCase() !== suggested.toLowerCase();

  if (!isSignificantlyDifferent) {
    return <span>{suggested}</span>;
  }

  return (
    <span className="text-green-700">
      {suggested}
    </span>
  );
};

/**
 * Warmth improvement badge
 */
const WarmthBadge: React.FC<{ improvement: number }> = ({ improvement }) => {
  const getBadgeColor = () => {
    if (improvement >= 20) return 'bg-green-100 text-green-800';
    if (improvement >= 10) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()}`}>
      +{improvement} warmth
    </span>
  );
};

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  originalMessage,
  onAccept,
  onEdit,
  isSelected = false,
}) => {
  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      {/* Header with warmth improvement */}
      <div className="flex items-center justify-between mb-3">
        <WarmthBadge improvement={suggestion.warmthImprovement} />
        <span className="text-xs text-gray-500">Suggestion</span>
      </div>

      {/* Before/After comparison */}
      <div className="space-y-3 mb-4">
        {/* Original */}
        <div className="text-sm">
          <span className="text-gray-500 text-xs block mb-1">Original:</span>
          <p className="text-gray-600 line-through decoration-red-300">
            {originalMessage.length > 150
              ? originalMessage.substring(0, 150) + '...'
              : originalMessage}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>

        {/* Suggested */}
        <div className="text-sm">
          <span className="text-green-600 text-xs block mb-1">Suggested:</span>
          <p className="text-gray-800 bg-green-50 p-2 rounded">
            <HighlightedText original={originalMessage} suggested={suggestion.suggestedText} />
          </p>
        </div>
      </div>

      {/* Changes list */}
      {suggestion.changes.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-gray-500 block mb-1">Changes made:</span>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {suggestion.changes.map((change, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-green-500">+</span>
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg
                     hover:bg-green-700 transition-colors"
        >
          Use This
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg
                     hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default SuggestionCard;
