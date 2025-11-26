/**
 * Feedback List Component
 * Displays submitted feedback with status tracking for debtors
 */

import React, { useState, useEffect } from 'react';

/**
 * Feedback item interface
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

interface FeedbackListProps {
  caseId: string;
  className?: string;
}

/**
 * Category labels and icons
 */
const CATEGORY_INFO: Record<string, { label: string; icon: string }> = {
  financial_hardship: { label: 'Financial Hardship', icon: '💼' },
  dispute_validity: { label: 'Debt Dispute', icon: '⚖️' },
  payment_terms: { label: 'Payment Terms', icon: '📅' },
  request_info: { label: 'Information Request', icon: '❓' },
  general: { label: 'General Feedback', icon: '💬' },
};

/**
 * Status badge component
 */
const StatusBadge: React.FC<{ status: FeedbackItem['status'] }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'submitted':
        return 'bg-gray-100 text-gray-700';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-700';
      case 'responded':
        return 'bg-green-100 text-green-700';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'submitted':
        return 'Sent';
      case 'acknowledged':
        return 'Viewed by Creditor';
      case 'responded':
        return 'Response Received';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle()}`}>
      {getStatusLabel()}
    </span>
  );
};

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Feedback card component
 */
const FeedbackCard: React.FC<{
  feedback: FeedbackItem;
  expanded: boolean;
  onToggle: () => void;
}> = ({ feedback, expanded, onToggle }) => {
  const categoryInfo = CATEGORY_INFO[feedback.category] || { label: 'Feedback', icon: '📋' };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{categoryInfo.icon}</span>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{categoryInfo.label}</h3>
            <p className="text-sm text-gray-500">{formatDate(feedback.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={feedback.status} />
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200">
          {/* Your message */}
          <div className="p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Your Message:</p>
            <div className="p-3 bg-white rounded-lg text-gray-800 text-sm whitespace-pre-wrap">
              {feedback.originalContent}
            </div>
            {feedback.aiAssisted && (
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <span>✨</span> AI-assisted formatting applied
              </p>
            )}
          </div>

          {/* Status timeline */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Status:</p>
            <div className="space-y-3">
              {/* Submitted */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted</p>
                  <p className="text-xs text-gray-500">{formatDate(feedback.createdAt)}</p>
                </div>
              </div>

              {/* Acknowledged */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    feedback.acknowledgedAt ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {feedback.acknowledgedAt ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${feedback.acknowledgedAt ? 'text-gray-900' : 'text-gray-400'}`}>
                    Viewed by Creditor
                  </p>
                  {feedback.acknowledgedAt && (
                    <p className="text-xs text-gray-500">{formatDate(feedback.acknowledgedAt)}</p>
                  )}
                </div>
              </div>

              {/* Responded */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    feedback.respondedAt ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {feedback.respondedAt ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${feedback.respondedAt ? 'text-gray-900' : 'text-gray-400'}`}>
                    Response Received
                  </p>
                  {feedback.respondedAt && (
                    <p className="text-xs text-gray-500">{formatDate(feedback.respondedAt)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Creditor response */}
          {feedback.creditorResponse && (
            <div className="p-4 border-t border-gray-200 bg-blue-50">
              <p className="text-sm font-medium text-blue-700 mb-2">Creditor's Response:</p>
              <div className="p-3 bg-white rounded-lg text-gray-800 text-sm whitespace-pre-wrap">
                {feedback.creditorResponse}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FeedbackList: React.FC<FeedbackListProps> = ({ caseId, className = '' }) => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (feedbackItems.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 text-4xl mb-3">📬</div>
        <p className="text-gray-600">No feedback submitted yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Share your concerns with the creditor using the form above
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-medium text-gray-900">Your Submitted Feedback</h3>
      {feedbackItems.map((feedback) => (
        <FeedbackCard
          key={feedback.id}
          feedback={feedback}
          expanded={expandedId === feedback.id}
          onToggle={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
        />
      ))}
    </div>
  );
};

export default FeedbackList;
