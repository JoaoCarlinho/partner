/**
 * Assessment Chat Component
 * Conversational UI for financial assessment
 */

import React, { useState, useEffect, useRef } from 'react';

// Types
type InputType = 'buttons' | 'select' | 'multi_select' | 'range' | 'slider' | 'text' | 'scale';
type AssessmentStage = 'intro' | 'income' | 'expenses' | 'obligations' | 'stress' | 'summary' | 'complete';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: InputType;
  allowSkip?: boolean;
}

interface AssessmentChatProps {
  caseId: string;
  debtAmount: number;
  creditorName: string;
  onComplete: (assessmentId: string, summary: any) => void;
  onEscalate?: (resources: string[]) => void;
  className?: string;
}

/**
 * Typing indicator component
 */
const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-lg max-w-xs">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-sm text-gray-500">Thinking...</span>
  </div>
);

/**
 * Message bubble component
 */
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[80%] p-4 rounded-2xl ${
          isAssistant ? 'bg-blue-50 text-gray-800 rounded-bl-sm' : 'bg-blue-600 text-white rounded-br-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isAssistant ? 'text-gray-500' : 'text-blue-200'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

/**
 * Response options component
 */
const ResponseOptions: React.FC<{
  options: Array<{ value: string; label: string }>;
  inputType: InputType;
  onSelect: (value: string | string[]) => void;
  onSkip?: () => void;
  allowSkip: boolean;
  disabled: boolean;
}> = ({ options, inputType, onSelect, onSkip, allowSkip, disabled }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [textValue, setTextValue] = useState('');

  const handleMultiSelect = (value: string) => {
    setSelectedValues((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const submitMultiSelect = () => {
    if (selectedValues.length > 0) {
      onSelect(selectedValues);
      setSelectedValues([]);
    }
  };

  const submitText = () => {
    if (textValue.trim()) {
      onSelect(textValue.trim());
      setTextValue('');
    }
  };

  if (inputType === 'buttons' || inputType === 'select') {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              disabled={disabled}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-600 rounded-full
                         hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {option.label}
            </button>
          ))}
        </div>
        {allowSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={disabled}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip this question
          </button>
        )}
      </div>
    );
  }

  if (inputType === 'multi_select') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Select all that apply:</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleMultiSelect(option.value)}
              disabled={disabled}
              className={`px-4 py-2 rounded-full transition-colors ${
                selectedValues.includes(option.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={submitMultiSelect}
            disabled={disabled || selectedValues.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          {allowSkip && onSkip && (
            <button
              onClick={onSkip}
              disabled={disabled}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  if (inputType === 'scale') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              disabled={disabled}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl mb-1">
                {parseInt(option.value) <= 2 ? '😟' : parseInt(option.value) <= 3 ? '😐' : '😊'}
              </span>
              <span className="text-xs text-gray-600 text-center">{option.label}</span>
            </button>
          ))}
        </div>
        {allowSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={disabled}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip this question
          </button>
        )}
      </div>
    );
  }

  if (inputType === 'text') {
    return (
      <div className="space-y-2">
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Type your response..."
          disabled={disabled}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <div className="flex gap-2">
          <button
            onClick={submitText}
            disabled={disabled || !textValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
          {allowSkip && onSkip && (
            <button
              onClick={onSkip}
              disabled={disabled}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-blue-600 rounded-full h-2 transition-all duration-500 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
);

/**
 * Resources panel for stress escalation
 */
const ResourcesPanel: React.FC<{ resources: string[]; onClose: () => void }> = ({ resources, onClose }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-medium text-yellow-800">Support Resources</h4>
      <button onClick={onClose} className="text-yellow-600 hover:text-yellow-800">
        ×
      </button>
    </div>
    <ul className="space-y-1">
      {resources.map((resource, index) => (
        <li key={index} className="text-sm text-yellow-700">
          • {resource}
        </li>
      ))}
    </ul>
  </div>
);

export const AssessmentChat: React.FC<AssessmentChatProps> = ({
  caseId,
  debtAmount,
  creditorName,
  onComplete,
  onEscalate,
  className = '',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<AssessmentStage>('intro');
  const [currentOptions, setCurrentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [currentInputType, setCurrentInputType] = useState<InputType>('buttons');
  const [allowSkip, setAllowSkip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resources, setResources] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Start session on mount
  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/debtors/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, debtAmount, creditorName }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start assessment');
      }

      setSessionId(data.data.sessionId);
      setCurrentStage(data.data.currentStage);
      setCurrentOptions(data.data.options || []);
      setCurrentInputType(data.data.inputType || 'buttons');
      setAllowSkip(data.data.allowSkip || false);

      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
        options: data.data.options,
        inputType: data.data.inputType,
        allowSkip: data.data.allowSkip,
      };

      setMessages([newMessage]);
      updateProgress('intro');
    } catch (err: any) {
      setError(err.message || 'Failed to start assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = (stage: AssessmentStage) => {
    const stages: AssessmentStage[] = ['intro', 'income', 'expenses', 'obligations', 'stress', 'summary', 'complete'];
    const index = stages.indexOf(stage);
    setProgress(Math.round((index / (stages.length - 1)) * 100));
  };

  const handleResponse = async (value: string | string[]) => {
    if (!sessionId) return;

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: Array.isArray(value)
        ? value.map((v) => currentOptions.find((o) => o.value === v)?.label || v).join(', ')
        : currentOptions.find((o) => o.value === value)?.label || value,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/debtors/assessment/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          stage: currentStage,
          response: {
            type: Array.isArray(value) ? 'multi_selection' : 'selection',
            value,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process response');
      }

      // Check for escalation
      if (data.data.escalate && data.data.resources) {
        setResources(data.data.resources);
        onEscalate?.(data.data.resources);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
        options: data.data.options,
        inputType: data.data.inputType,
        allowSkip: data.data.allowSkip,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentStage(data.data.nextStage);
      setCurrentOptions(data.data.options || []);
      setCurrentInputType(data.data.inputType || 'buttons');
      setAllowSkip(data.data.allowSkip || false);
      updateProgress(data.data.nextStage);

      // Check for completion
      if (data.data.complete) {
        await handleComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/debtors/assessment/skip-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to skip stage');
      }

      // Add skipped indicator
      const skipMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: '(Skipped)',
        timestamp: new Date(),
      };

      // Add assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
        options: data.data.options,
        inputType: data.data.inputType,
        allowSkip: data.data.allowSkip,
      };

      setMessages((prev) => [...prev, skipMessage, assistantMessage]);
      setCurrentStage(data.data.nextStage);
      setCurrentOptions(data.data.options || []);
      setCurrentInputType(data.data.inputType || 'buttons');
      setAllowSkip(data.data.allowSkip || false);
      updateProgress(data.data.nextStage);

      if (data.data.complete) {
        await handleComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to skip stage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/v1/debtors/assessment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        onComplete(data.data.assessmentId, data.data.summary);
      }
    } catch (err) {
      console.error('Failed to complete assessment:', err);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Financial Assessment</h2>
        <p className="text-sm text-gray-500">Let's understand your situation better</p>
        <div className="mt-2">
          <ProgressBar progress={progress} />
          <p className="text-xs text-gray-400 mt-1">{progress}% complete</p>
        </div>
      </div>

      {/* Resources panel */}
      {resources && <ResourcesPanel resources={resources} onClose={() => setResources(null)} />}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Response options */}
      {currentStage !== 'complete' && currentOptions.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <ResponseOptions
            options={currentOptions}
            inputType={currentInputType}
            onSelect={handleResponse}
            onSkip={allowSkip ? handleSkip : undefined}
            allowSkip={allowSkip}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Completion state */}
      {currentStage === 'complete' && (
        <div className="p-4 border-t bg-green-50 text-center">
          <p className="text-green-700 font-medium">Assessment Complete</p>
          <p className="text-sm text-green-600">Thank you for sharing your information.</p>
        </div>
      )}
    </div>
  );
};

export default AssessmentChat;
