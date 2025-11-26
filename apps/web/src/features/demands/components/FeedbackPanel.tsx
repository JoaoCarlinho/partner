/**
 * Feedback Panel Component
 * Displays formatted debtor feedback for creditor view
 */

import React, { useState, useEffect } from 'react';

/**
 * Feedback item interface for creditor view
 */
interface FeedbackItem {
  id: string;
  category: string;
  originalContent: string;
  formattedContent: string;
  aiAssisted: boolean;
  status: 'submitted' | 'acknowledged' | 'responded';
  createdAt: string;
  acknowledgedAt: string | null;
  respondedAt: string | null;
  creditorResponse: string | null;
}

interface FeedbackPanelProps {
  caseId: string;
  className?: string;
}

/**
 * Category labels and colors
 */
const CATEGORY_INFO: Record<
  string,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  financial_hardship: {
    label: 'Financial Hardship',
    icon: '💼',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
  },
  dispute_validity: {
    label: 'Debt Dispute',
    icon: '⚖️',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  payment_terms: {
    label: 'Payment Terms',
    icon: '📅',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  request_info: {
    label: 'Information Request',
    icon: '❓',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
  general: {
    label: 'General Feedback',
    icon: '💬',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
  },
};

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Individual feedback card for creditor
 */
const CreditorFeedbackCard: React.FC<{
  feedback: FeedbackItem;
  onAcknowledge: () => Promise<void>;
  onRespond: (response: string) => Promise<void>;
}> = ({ feedback, onAcknowledge, onRespond }) => {
  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryInfo = CATEGORY_INFO[feedback.category] || CATEGORY_INFO.general;
  const isDispute = feedback.category === 'dispute_validity';

  const handleAcknowledge = async () => {
    await onAcknowledge();
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;

    setIsSubmitting(true);
    try {
      await onRespond(responseText.trim());
      setResponseText('');
      setIsResponding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${isDispute ? 'border-red-300' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`p-4 ${categoryInfo.bgColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <div>
              <h3 className={`font-semibold ${categoryInfo.color}`}>
                {categoryInfo.label}
              </h3>
              <p className="text-sm text-gray-600">{formatDate(feedback.createdAt)}</p>
            </div>
          </div>
          {isDispute && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              Requires Response
            </span>
          )}
        </div>
      </div>

      {/* Formatted content (pre-processed by backend) */}
      <div className="p-4 border-t border-gray-100">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
          {feedback.formattedContent}
        </pre>
      </div>

      {/* Original message toggle */}
      <details className="border-t border-gray-100">
        <summary className="p-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
          View original message
        </summary>
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.originalContent}</p>
        </div>
      </details>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {feedback.status === 'submitted' && (
          <div className="flex gap-2">
            <button
              onClick={handleAcknowledge}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
            >
              Mark as Read
            </button>
            <button
              onClick={() => setIsResponding(true)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Respond
            </button>
          </div>
        )}

        {feedback.status === 'acknowledged' && !isResponding && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              ✓ Viewed {feedback.acknowledgedAt && formatDate(feedback.acknowledgedAt)}
            </span>
            <button
              onClick={() => setIsResponding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Respond
            </button>
          </div>
        )}

        {feedback.status === 'responded' && feedback.creditorResponse && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Your Response:</p>
            <div className="p-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-800">
              {feedback.creditorResponse}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Sent {feedback.respondedAt && formatDate(feedback.respondedAt)}
            </p>
          </div>
        )}

        {isResponding && feedback.status !== 'responded' && (
          <div className="space-y-3">
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your response to the debtor..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsResponding(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSubmitting ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ caseId, className = '' }) => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'disputes'>('all');

  useEffect(() => {
    loadFeedback();
  }, [caseId]);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/feedback`);
      const result = await response.json();
      if (result.success) {
        setFeedbackItems(result.data);
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (feedbackId: string) => {
    try {
      await fetch(`/api/v1/feedback/${feedbackId}/acknowledge`, {
        method: 'POST',
      });
      loadFeedback();
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    }
  };

  const handleRespond = async (feedbackId: string, response: string) => {
    try {
      await fetch(`/api/v1/feedback/${feedbackId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      loadFeedback();
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  // Filter feedback
  const filteredFeedback = feedbackItems.filter((f) => {
    if (filter === 'pending') {
      return f.status !== 'responded';
    }
    if (filter === 'disputes') {
      return f.category === 'dispute_validity';
    }
    return true;
  });

  // Count stats
  const pendingCount = feedbackItems.filter((f) => f.status !== 'responded').length;
  const disputeCount = feedbackItems.filter((f) => f.category === 'dispute_validity').length;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Debtor Feedback</h2>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              {pendingCount} pending
            </span>
          )}
          {disputeCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              {disputeCount} dispute{disputeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({feedbackItems.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('disputes')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'disputes' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          Disputes ({disputeCount})
        </button>
      </div>

      {/* Feedback list */}
      {filteredFeedback.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filter === 'all'
            ? 'No feedback received yet'
            : filter === 'pending'
            ? 'No pending feedback'
            : 'No disputes'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((feedback) => (
            <CreditorFeedbackCard
              key={feedback.id}
              feedback={feedback}
              onAcknowledge={() => handleAcknowledge(feedback.id)}
              onRespond={(response) => handleRespond(feedback.id, response)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;
