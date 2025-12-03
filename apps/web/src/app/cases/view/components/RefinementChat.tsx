'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DiffViewer } from './DiffViewer';
import { ComplianceComparison, calculateComplianceChange } from './ComplianceComparison';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

interface AnalysisResult {
  analysis: string;
  issues: Array<{
    severity: 'high' | 'medium' | 'low';
    issue: string;
    suggestion: string;
  }>;
  overallTone: string;
  suggestedActions: string[];
}

type MessageRole = 'assistant' | 'user' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  refinementResult?: RefinementResult;
  analysisResult?: AnalysisResult;
  isTyping?: boolean;
}

interface RefinementChatProps {
  letterId: string;
  letterContent: string;
  beforeCompliance?: ComplianceResult;
  onRefine: (instruction: string) => Promise<RefinementResult>;
  onAccept?: (result: RefinementResult) => Promise<void> | void;
  onReject?: () => void;
  onAnalyze?: () => Promise<AnalysisResult>;
  disabled?: boolean;
}

const MAX_LENGTH = 1000;

export function RefinementChat({
  letterId,
  letterContent,
  beforeCompliance,
  onRefine,
  onAccept,
  onReject,
  onAnalyze,
  disabled = false,
}: RefinementChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRefinement, setPendingRefinement] = useState<RefinementResult | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAnalyzedRef = useRef(false); // Use ref to prevent duplicate analysis in strict mode

  const charCount = inputValue.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const canSend = inputValue.trim() && !isOverLimit && !disabled && !isLoading;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check if compliance improved significantly
  const complianceChange = beforeCompliance && pendingRefinement?.complianceResult
    ? calculateComplianceChange(beforeCompliance.score, pendingRefinement.complianceResult.score)
    : null;

  // Generate a unique ID for messages
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add a typing indicator message
  const addTypingIndicator = () => {
    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);
  };

  // Remove typing indicator
  const removeTypingIndicator = () => {
    setMessages(prev => prev.filter(m => m.id !== 'typing'));
  };

  // Add a message to the chat
  const addMessage = (role: MessageRole, content: string, extras?: Partial<ChatMessage>) => {
    const message: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      ...extras,
    };
    setMessages(prev => [...prev.filter(m => m.id !== 'typing'), message]);
    return message;
  };

  // Proactively analyze the letter when component mounts
  useEffect(() => {
    // Use ref to prevent duplicate analysis in React strict mode
    if (hasAnalyzedRef.current) {
      return;
    }

    if (letterContent && onAnalyze) {
      hasAnalyzedRef.current = true; // Mark as analyzed immediately to prevent duplicates

      const analyzeLetterProactively = async () => {
        setIsLoading(true);
        addTypingIndicator();

        try {
          const analysis = await onAnalyze();
          removeTypingIndicator();

          // Build a friendly analysis message
          let analysisMessage = `I've reviewed the demand letter. Here's my assessment:\n\n`;
          analysisMessage += `**Overall Tone:** ${analysis.overallTone}\n\n`;

          if (analysis.issues.length > 0) {
            analysisMessage += `**Issues Found:**\n`;
            analysis.issues.forEach((issue, index) => {
              const severityEmoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
              analysisMessage += `${index + 1}. ${severityEmoji} **${issue.issue}**\n   → ${issue.suggestion}\n`;
            });
            analysisMessage += '\n';
          }

          if (analysis.suggestedActions.length > 0) {
            analysisMessage += `**Suggested Improvements:**\n`;
            analysis.suggestedActions.forEach((action, index) => {
              analysisMessage += `${index + 1}. ${action}\n`;
            });
          }

          analysisMessage += `\nWould you like me to help refine any of these aspects? Just let me know what changes you'd like to make.`;

          addMessage('assistant', analysisMessage, { analysisResult: analysis });
        } catch (error) {
          removeTypingIndicator();
          console.error('Failed to analyze letter:', error);
          addMessage('assistant', 'I\'m ready to help you refine this demand letter. What would you like me to improve?');
        } finally {
          setIsLoading(false);
        }
      };

      // Small delay to let the UI render first
      setTimeout(analyzeLetterProactively, 500);
    } else if (letterContent && !onAnalyze) {
      // If no analyze function provided, just show a welcome message
      hasAnalyzedRef.current = true;
      addMessage('assistant', 'I\'m ready to help you refine this demand letter. What would you like me to improve?');
    }
  }, [letterContent, onAnalyze]);

  // Handle sending a message
  const handleSend = async () => {
    if (!canSend) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);

    setIsLoading(true);
    addTypingIndicator();

    try {
      const result = await onRefine(userMessage);
      removeTypingIndicator();

      // Build response message
      let responseMessage = `I've made the requested changes. Here's a summary:\n\n`;
      responseMessage += `**Changes:** ${result.diff.additions} additions, ${result.diff.deletions} deletions\n`;
      responseMessage += `**Compliance Score:** ${result.complianceResult.score}%\n`;

      if (result.warnings && result.warnings.length > 0) {
        responseMessage += `\n**Warnings:**\n`;
        result.warnings.forEach(warning => {
          responseMessage += `⚠️ ${warning}\n`;
        });
      }

      responseMessage += `\nPlease review the changes below. You can accept them or let me know if you'd like further adjustments.`;

      addMessage('assistant', responseMessage, { refinementResult: result });
      setPendingRefinement(result);
    } catch (error) {
      removeTypingIndicator();
      console.error('Refinement failed:', error);
      addMessage('assistant', `I encountered an error while refining the letter: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your request.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle accepting refinement
  const handleAccept = async () => {
    if (!pendingRefinement || !onAccept) return;

    setIsAccepting(true);
    try {
      await onAccept(pendingRefinement);
      addMessage('system', 'Changes accepted and applied to the letter.');
      setPendingRefinement(null);
    } catch (error) {
      console.error('Failed to accept changes:', error);
      addMessage('system', 'Failed to accept changes. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle rejecting refinement
  const handleReject = () => {
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
    addMessage('system', 'Changes rejected. The letter remains unchanged.');
    setPendingRefinement(null);
  };

  const cancelReject = () => {
    setShowRejectConfirmation(false);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render a single message
  const renderMessage = (message: ChatMessage) => {
    if (message.isTyping) {
      return (
        <div key={message.id} className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="bg-gray-100 rounded-lg px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      );
    }

    const isAssistant = message.role === 'assistant';
    const isSystem = message.role === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex items-start gap-3 mb-4 ${isAssistant ? '' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant ? 'bg-primary-100' : 'bg-blue-100'
        }`}>
          {isAssistant ? (
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className={`max-w-[80%] ${isAssistant ? '' : 'text-right'}`}>
          <div className={`rounded-lg px-4 py-3 ${
            isAssistant ? 'bg-gray-100 text-gray-800' : 'bg-primary-600 text-white'
          }`}>
            {/* Render message with markdown-like formatting */}
            <div className="whitespace-pre-wrap text-sm">
              {message.content.split('\n').map((line, i) => {
                // Handle bold text
                const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return (
                  <span key={i} dangerouslySetInnerHTML={{ __html: boldLine + (i < message.content.split('\n').length - 1 ? '<br/>' : '') }} />
                );
              })}
            </div>
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-400 mt-1 ${isAssistant ? '' : 'text-right'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Refinement Result Preview */}
          {message.refinementResult && (
            <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Proposed Changes</span>
              </div>
              <div className="p-3">
                <DiffViewer
                  originalContent={letterContent}
                  refinedContent={message.refinementResult.content}
                />
              </div>
              {beforeCompliance && message.refinementResult.complianceResult && (
                <div className="p-3 border-t border-gray-200">
                  <ComplianceComparison
                    beforeCompliance={beforeCompliance}
                    afterCompliance={message.refinementResult.complianceResult}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">AI Refinement Assistant</h3>
          <p className="text-xs text-gray-500">I can help improve your demand letter</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4" data-testid="chat-messages">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Refinement Actions */}
      {pendingRefinement && (
        <div className="px-4 py-3 border-t border-gray-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">Review the proposed changes above</span>
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isAccepting}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Accepting...
                  </>
                ) : (
                  'Accept Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingRefinement ? "Accept or reject changes first, or describe additional refinements..." : "Describe how you'd like to refine the letter..."}
              disabled={disabled || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              rows={2}
              data-testid="chat-input"
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {charCount}/{MAX_LENGTH}
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            data-testid="chat-send"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Press Enter to send, Shift+Enter for new line</p>
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

// Export types for use in other components
export type { RefinementResult, RefinementChatProps, ComplianceResult, ComplianceCheck, AnalysisResult, ChatMessage };
