/**
 * Message Input with Suggestions Component
 * Extended message input that integrates tone analysis and rewrite suggestions
 */

import React, { useState, useCallback, useRef } from 'react';
import RewriteSuggestions from './RewriteSuggestions';

interface RewriteSuggestion {
  id: string;
  suggestedText: string;
  warmthImprovement: number;
  changes: string[];
}

interface ToneAnalysis {
  warmthScore: number;
  toneCategory: string;
  concerns: string[];
  recommendation: 'pass' | 'suggest_rewrite' | 'block';
}

interface AnalysisResponse {
  canSend: boolean;
  toneAnalysis: ToneAnalysis;
  suggestions?: {
    original: string;
    originalScore: number;
    suggestions: RewriteSuggestion[];
  };
}

interface MessageInputWithSuggestionsProps {
  caseId: string;
  threadId?: string;
  userId: string;
  placeholder?: string;
  onMessageSent?: (content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Warmth indicator bar
 */
const WarmthBar: React.FC<{ score: number; show: boolean }> = ({ score, show }) => {
  if (!show) return null;

  const getColor = () => {
    if (score >= 50) return 'bg-green-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (score >= 80) return 'Warm';
    if (score >= 50) return 'Neutral';
    if (score >= 30) return 'Cool';
    return 'Needs work';
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
      <span>Tone:</span>
      <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={score < 30 ? 'text-red-600' : score < 50 ? 'text-yellow-600' : 'text-green-600'}>
        {getLabel()}
      </span>
    </div>
  );
};

export const MessageInputWithSuggestions: React.FC<MessageInputWithSuggestionsProps> = ({
  caseId,
  threadId,
  userId,
  placeholder = 'Type your message...',
  onMessageSent,
  onTyping,
  disabled = false,
  className = '',
}) => {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analyzeTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Analyze message tone (debounced)
   */
  const analyzeMessage = useCallback(async (text: string) => {
    if (text.length < 10) {
      setLiveScore(null);
      return;
    }

    try {
      const response = await fetch('/api/v1/messages/analyze-and-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          userId,
          userRole: 'DEBTOR',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setLiveScore(result.data.toneAnalysis.warmthScore);
      }
    } catch (error) {
      console.error('Live analysis failed:', error);
    }
  }, [userId]);

  /**
   * Handle content change with debounced analysis
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setAnalysis(null);
    setShowSuggestions(false);

    // Notify typing
    onTyping?.();

    // Debounced live analysis
    if (analyzeTimeout.current) {
      clearTimeout(analyzeTimeout.current);
    }
    analyzeTimeout.current = setTimeout(() => {
      analyzeMessage(newContent);
    }, 500);
  };

  /**
   * Full analysis before sending
   */
  const handlePreSend = async () => {
    if (!content.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/messages/analyze-and-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          userId,
          userRole: 'DEBTOR',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAnalysis(result.data);

        // If message passes or user can send anyway
        if (result.data.toneAnalysis.recommendation === 'pass') {
          await sendMessage(content.trim());
        } else {
          // Show suggestions
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.error('Pre-send analysis failed:', error);
      // Send anyway on error
      await sendMessage(content.trim());
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Request suggestions manually
   */
  const handleGetSuggestions = async () => {
    if (!content.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/messages/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          userId,
          userRole: 'DEBTOR',
        }),
      });

      const result = await response.json();
      if (result.success && result.data.suggestions.length > 0) {
        setAnalysis({
          canSend: true,
          toneAnalysis: {
            warmthScore: result.data.originalScore,
            toneCategory: 'neutral',
            concerns: [],
            recommendation: 'suggest_rewrite',
          },
          suggestions: result.data,
        });
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Get suggestions failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Send the message
   */
  const sendMessage = async (messageContent: string) => {
    setIsSending(true);
    try {
      // In production, would send via API
      console.log('Sending message:', { caseId, threadId, content: messageContent });
      onMessageSent?.(messageContent);
      setContent('');
      setAnalysis(null);
      setShowSuggestions(false);
      setLiveScore(null);
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Accept a suggestion
   */
  const handleAcceptSuggestion = async (suggestion: RewriteSuggestion) => {
    // Track acceptance
    try {
      await fetch('/api/v1/messages/accept-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalContent: content,
          acceptedSuggestionId: suggestion.id,
          acceptedText: suggestion.suggestedText,
          userId,
        }),
      });
    } catch (error) {
      console.error('Track acceptance failed:', error);
    }

    // Send the suggested message
    await sendMessage(suggestion.suggestedText);
  };

  /**
   * Edit a suggestion
   */
  const handleEditSuggestion = (suggestion: RewriteSuggestion) => {
    setContent(suggestion.suggestedText);
    setShowSuggestions(false);
    setAnalysis(null);
    textareaRef.current?.focus();
  };

  /**
   * Dismiss suggestions and send original
   */
  const handleDismissSuggestions = () => {
    if (analysis?.canSend) {
      sendMessage(content.trim());
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Handle Enter key
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePreSend();
    }
  };

  const isBlocked = analysis?.toneAnalysis.recommendation === 'block';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Suggestions panel */}
      {showSuggestions && analysis?.suggestions && (
        <RewriteSuggestions
          originalMessage={content}
          originalScore={analysis.toneAnalysis.warmthScore}
          suggestions={analysis.suggestions.suggestions}
          onAccept={handleAcceptSuggestion}
          onEdit={handleEditSuggestion}
          onDismiss={handleDismissSuggestions}
          isBlocked={isBlocked}
        />
      )}

      {/* Input area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={3}
          className={`w-full p-3 pr-24 border rounded-lg resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-50 disabled:cursor-not-allowed
                     ${isBlocked ? 'border-red-300' : 'border-gray-300'}`}
        />

        {/* Live warmth indicator */}
        <WarmthBar score={liveScore || 0} show={liveScore !== null} />

        {/* Action buttons */}
        <div className="absolute right-2 bottom-2 flex gap-1">
          {content.trim().length > 0 && (
            <button
              onClick={handleGetSuggestions}
              disabled={isAnalyzing || content.length < 10}
              className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
              title="Get suggestions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={handlePreSend}
            disabled={!content.trim() || isAnalyzing || isSending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line.{' '}
        <button
          onClick={handleGetSuggestions}
          className="text-blue-600 hover:underline"
          disabled={content.length < 10}
        >
          Get writing suggestions
        </button>
      </p>
    </div>
  );
};

export default MessageInputWithSuggestions;
