/**
 * Message List Component
 * Displays message history with grouping and threading
 */

import React, { useRef, useEffect } from 'react';

// Types
interface Message {
  id: string;
  caseId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  isAiModified: boolean;
  parentMessageId?: string;
  createdAt: string;
  readAt?: string;
  threadCount?: number;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onThreadClick?: (messageId: string) => void;
  onMarkRead?: (messageId: string) => void;
  className?: string;
}

// Role colors
const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  ATTORNEY: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'Attorney' },
  PARALEGAL: { bg: 'bg-purple-100', text: 'text-purple-800', badge: 'Paralegal' },
  DEBTOR: { bg: 'bg-green-100', text: 'text-green-800', badge: 'Debtor' },
  PUBLIC_DEFENDER: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'Public Defender' },
};

/**
 * Format timestamp for display
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for grouping
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Group messages by date
 */
function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  for (const message of messages) {
    const dateKey = formatDate(message.createdAt);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  }

  return groups;
}

/**
 * Date separator component
 */
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center justify-center my-4">
    <div className="flex-1 border-t border-gray-200" />
    <span className="px-4 text-sm text-gray-500 font-medium">{date}</span>
    <div className="flex-1 border-t border-gray-200" />
  </div>
);

/**
 * Single message component
 */
const MessageBubble: React.FC<{
  message: Message;
  isOwn: boolean;
  onThreadClick?: (messageId: string) => void;
}> = ({ message, isOwn, onThreadClick }) => {
  const roleConfig = ROLE_COLORS[message.senderRole] || ROLE_COLORS.DEBTOR;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender info */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-sm font-medium text-gray-700">{message.senderName}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${roleConfig.bg} ${roleConfig.text}`}
            >
              {roleConfig.badge}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {/* AI modified indicator */}
          {message.isAiModified && (
            <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
              ✨ Enhanced for clarity
            </p>
          )}
        </div>

        {/* Footer: time, read status, thread count */}
        <div
          className={`flex items-center gap-2 mt-1 px-1 text-xs text-gray-500 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>

          {isOwn && message.readAt && (
            <span className="text-blue-500" title={`Read at ${formatTime(message.readAt)}`}>
              ✓✓
            </span>
          )}

          {message.threadCount && message.threadCount > 0 && onThreadClick && (
            <button
              onClick={() => onThreadClick(message.id)}
              className="text-blue-600 hover:underline"
            >
              {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="text-4xl mb-4">💬</div>
    <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
    <p className="text-sm text-gray-500">
      Send a message to start the conversation.
    </p>
  </div>
);

/**
 * Main MessageList component
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onThreadClick,
  onMarkRead,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark messages as read when they become visible
  useEffect(() => {
    if (!onMarkRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              onMarkRead(messageId);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    const messageElements = containerRef.current?.querySelectorAll('[data-message-id]');
    messageElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, onMarkRead]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  // Filter to top-level messages only (for main list)
  const topLevelMessages = messages.filter((m) => !m.parentMessageId);

  // Sort by createdAt ascending (oldest first)
  const sortedMessages = [...topLevelMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group by date
  const groupedMessages = groupMessagesByDate(sortedMessages);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto p-4 ${className}`}
    >
      {Array.from(groupedMessages.entries()).map(([date, dateMessages]) => (
        <div key={date}>
          <DateSeparator date={date} />
          {dateMessages.map((message) => (
            <div
              key={message.id}
              data-message-id={message.senderId !== currentUserId && !message.readAt ? message.id : undefined}
            >
              <MessageBubble
                message={message}
                isOwn={message.senderId === currentUserId}
                onThreadClick={onThreadClick}
              />
            </div>
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
