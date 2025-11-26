/**
 * Blocked Message Alert Component
 * Displays when a message is blocked due to tone issues
 */

import React, { useState } from 'react';

interface BlockedMessageAlertProps {
  originalContent: string;
  warmthScore: number;
  concerns: string[];
  suggestions: string[];
  recommendation: 'suggest_rewrite' | 'block';
  onResubmit: (newContent: string) => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * Warmth score indicator
 */
const WarmthIndicator: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 50) return 'bg-green-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (score >= 80) return 'Warm';
    if (score >= 50) return 'Neutral';
    if (score >= 30) return 'Cool';
    if (score >= 10) return 'Aggressive';
    return 'Hostile';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm text-gray-600 w-20">{getLabel()}</span>
    </div>
  );
};

export const BlockedMessageAlert: React.FC<BlockedMessageAlertProps> = ({
  originalContent,
  warmthScore,
  concerns,
  suggestions,
  recommendation,
  onResubmit,
  onDismiss,
  className = '',
}) => {
  const [editedContent, setEditedContent] = useState(originalContent);
  const [isEditing, setIsEditing] = useState(false);

  const isBlocked = recommendation === 'block';
  const alertColor = isBlocked ? 'red' : 'yellow';

  const handleResubmit = () => {
    if (editedContent.trim() !== originalContent.trim()) {
      onResubmit(editedContent.trim());
    }
  };

  return (
    <div
      className={`rounded-lg border-l-4 p-4 ${
        isBlocked
          ? 'bg-red-50 border-red-500'
          : 'bg-yellow-50 border-yellow-500'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xl ${isBlocked ? 'text-red-600' : 'text-yellow-600'}`}>
            {isBlocked ? '🚫' : '⚠️'}
          </span>
          <h3 className={`font-medium ${isBlocked ? 'text-red-800' : 'text-yellow-800'}`}>
            {isBlocked ? 'Message Blocked' : 'Message Could Be Improved'}
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Warmth score */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Tone Score</p>
        <WarmthIndicator score={warmthScore} />
      </div>

      {/* Concerns */}
      {concerns.length > 0 && (
        <div className="mb-4">
          <p className={`text-sm font-medium ${isBlocked ? 'text-red-700' : 'text-yellow-700'} mb-1`}>
            Concerns:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {concerns.map((concern, index) => (
              <li key={index}>{concern}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-blue-700 mb-1">Suggestions:</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Original/Edit message */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-700">
            {isEditing ? 'Edit Your Message:' : 'Your Message:'}
          </p>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            autoFocus
          />
        ) : (
          <div className="p-3 bg-white rounded-lg border border-gray-200 text-gray-800">
            {originalContent}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleResubmit}
              disabled={editedContent.trim() === originalContent.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition-colors"
            >
              Send Revised Message
            </button>
            <button
              onClick={() => {
                setEditedContent(originalContent);
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
                         hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                isBlocked
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              Revise Message
            </button>
            {!isBlocked && (
              <button
                onClick={() => onResubmit(originalContent)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
                           hover:bg-gray-50 transition-colors"
              >
                Send Anyway
              </button>
            )}
          </>
        )}
      </div>

      {/* Help text */}
      <p className="mt-3 text-xs text-gray-500">
        {isBlocked
          ? 'This message cannot be sent as-is. Please revise to ensure respectful communication.'
          : 'We recommend revising for better communication, but you can choose to send as-is.'}
      </p>
    </div>
  );
};

export default BlockedMessageAlert;
