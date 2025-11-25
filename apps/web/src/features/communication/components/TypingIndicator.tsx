/**
 * Typing Indicator Component
 * Shows who is currently typing in the conversation
 */

import React from 'react';

interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

/**
 * Animated dots component
 */
const AnimatedDots: React.FC = () => (
  <span className="inline-flex gap-1 ml-1">
    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </span>
);

/**
 * Format typing text based on number of users
 */
function formatTypingText(typingUsers: TypingUser[]): string {
  const activeTypers = typingUsers.filter((u) => u.isTyping);

  if (activeTypers.length === 0) {
    return '';
  }

  if (activeTypers.length === 1) {
    return `${activeTypers[0].userName} is typing`;
  }

  if (activeTypers.length === 2) {
    return `${activeTypers[0].userName} and ${activeTypers[1].userName} are typing`;
  }

  return `${activeTypers[0].userName} and ${activeTypers.length - 1} others are typing`;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  className = '',
}) => {
  const activeTypers = typingUsers.filter((u) => u.isTyping);

  if (activeTypers.length === 0) {
    return null;
  }

  const typingText = formatTypingText(typingUsers);

  return (
    <div className={`flex items-center px-4 py-2 text-sm text-gray-500 ${className}`}>
      <span>{typingText}</span>
      <AnimatedDots />
    </div>
  );
};

export default TypingIndicator;
