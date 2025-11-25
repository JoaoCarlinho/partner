/**
 * Message Thread Component
 * Displays a threaded conversation view
 */

import React, { useState, useEffect } from 'react';

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
}

interface ThreadData {
  parent: Message;
  replies: Message[];
  replyCount: number;
}

interface MessageThreadProps {
  messageId: string;
  currentUserId: string;
  onClose: () => void;
  onReply: (content: string, parentMessageId: string) => void;
  className?: string;
}

// Role colors (same as MessageList)
const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  ATTORNEY: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'Attorney' },
  PARALEGAL: { bg: 'bg-purple-100', text: 'text-purple-800', badge: 'Paralegal' },
  DEBTOR: { bg: 'bg-green-100', text: 'text-green-800', badge: 'Debtor' },
  PUBLIC_DEFENDER: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'Public Defender' },
};

/**
 * Format timestamp
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Thread message component
 */
const ThreadMessage: React.FC<{ message: Message; isOwn: boolean; isParent: boolean }> = ({
  message,
  isOwn,
  isParent,
}) => {
  const roleConfig = ROLE_COLORS[message.senderRole] || ROLE_COLORS.DEBTOR;

  return (
    <div className={`mb-4 ${isParent ? 'pb-4 border-b border-gray-200' : ''}`}>
      {/* Sender info */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-700">{message.senderName}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${roleConfig.bg} ${roleConfig.text}`}>
          {roleConfig.badge}
        </span>
        <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
      </div>

      {/* Message content */}
      <div
        className={`rounded-lg px-4 py-2 ${
          isOwn ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-gray-800">{message.content}</p>

        {message.isAiModified && (
          <p className="text-xs text-gray-500 mt-1">✨ Enhanced for clarity</p>
        )}
      </div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-4 bg-gray-200 rounded w-1/3" />
    <div className="h-16 bg-gray-200 rounded" />
    <div className="h-4 bg-gray-200 rounded w-1/4" />
    <div className="h-12 bg-gray-200 rounded" />
  </div>
);

/**
 * Reply input component
 */
const ReplyInput: React.FC<{
  onSubmit: (content: string) => void;
  disabled?: boolean;
}> = ({ onSubmit, disabled }) => {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t bg-gray-50">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply to thread..."
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={2}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export const MessageThread: React.FC<MessageThreadProps> = ({
  messageId,
  currentUserId,
  onClose,
  onReply,
  className = '',
}) => {
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load thread data
  useEffect(() => {
    loadThread();
  }, [messageId]);

  const loadThread = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/messages/${messageId}/thread`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load thread');
      }

      setThreadData(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load thread');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = (content: string) => {
    onReply(content, messageId);
    // Optimistically add reply (in a real app, would wait for server response)
    if (threadData) {
      const newReply: Message = {
        id: `temp_${Date.now()}`,
        caseId: threadData.parent.caseId,
        senderId: currentUserId,
        senderRole: 'DEBTOR', // Would come from auth context
        senderName: 'You',
        content,
        isAiModified: false,
        parentMessageId: messageId,
        createdAt: new Date().toISOString(),
      };
      setThreadData({
        ...threadData,
        replies: [...threadData.replies, newReply],
        replyCount: threadData.replyCount + 1,
      });
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium text-gray-900">Thread</h3>
          {threadData && (
            <p className="text-sm text-gray-500">
              {threadData.replyCount} {threadData.replyCount === 1 ? 'reply' : 'replies'}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close thread"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={loadThread} className="text-blue-600 hover:underline">
              Try again
            </button>
          </div>
        ) : threadData ? (
          <>
            {/* Parent message */}
            <ThreadMessage
              message={threadData.parent}
              isOwn={threadData.parent.senderId === currentUserId}
              isParent
            />

            {/* Replies */}
            {threadData.replies.length > 0 ? (
              <div className="space-y-1">
                {threadData.replies.map((reply) => (
                  <ThreadMessage
                    key={reply.id}
                    message={reply}
                    isOwn={reply.senderId === currentUserId}
                    isParent={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No replies yet</p>
            )}
          </>
        ) : null}
      </div>

      {/* Reply input */}
      <ReplyInput onSubmit={handleReply} disabled={isLoading || !!error} />
    </div>
  );
};

export default MessageThread;
