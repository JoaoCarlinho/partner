/**
 * Message Input Component
 * Text input with send button and typing indicator emission
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

const TYPING_DEBOUNCE_MS = 300;

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 5000,
  className = '',
}) => {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [content]);

  // Handle typing indicator
  const handleTypingChange = useCallback(
    (typing: boolean) => {
      if (typing && !isTyping) {
        setIsTyping(true);
        onTypingStart?.();
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing
      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          onTypingStop?.();
        }, TYPING_DEBOUNCE_MS * 10); // Stop after 3 seconds of no typing
      }
    },
    [isTyping, onTypingStart, onTypingStop]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setContent(newContent);
      handleTypingChange(newContent.length > 0);
    }
  };

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (trimmedContent && !disabled) {
      onSend(trimmedContent);
      setContent('');
      setIsTyping(false);
      onTypingStop?.();

      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charactersRemaining = maxLength - content.length;
  const showCharacterCount = content.length > maxLength * 0.8;

  return (
    <div className={`border-t bg-white p-4 ${className}`}>
      <div className="flex items-end gap-2">
        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full resize-none rounded-2xl border border-gray-300 px-4 py-3
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       min-h-[44px] max-h-[150px]`}
            rows={1}
          />

          {/* Character count */}
          {showCharacterCount && (
            <span
              className={`absolute right-3 bottom-1 text-xs ${
                charactersRemaining < 100 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {charactersRemaining}
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                     transition-colors ${
                       content.trim() && !disabled
                         ? 'bg-blue-600 text-white hover:bg-blue-700'
                         : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                     }`}
          aria-label="Send message"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-400 mt-2 px-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;
