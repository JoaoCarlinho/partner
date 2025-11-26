/**
 * Timeline Card Component
 * Displays debt timeline with countdown and urgency indicators
 */

import React, { useState } from 'react';
import { useCountdown, getUrgencyColor, type CountdownResult } from '../hooks/useCountdown';

interface TimelineCardProps {
  timeline: {
    debtOriginDate: string;
    responseDeadline: string | null;
    daysRemaining: number;
    isExpired: boolean;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  className?: string;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Urgency badge component
 */
const UrgencyBadge: React.FC<{ countdown: CountdownResult }> = ({ countdown }) => {
  const color = getUrgencyColor(countdown.urgencyLevel);
  const bgColor = `${color}20`; // 20% opacity

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
      style={{ backgroundColor: bgColor, color }}
    >
      {countdown.isExpired ? '⚠️' : '⏰'} {countdown.displayText}
    </span>
  );
};

export const TimelineCard: React.FC<TimelineCardProps> = ({
  timeline,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use the countdown hook for real-time updates
  const countdown = useCountdown(timeline.responseDeadline);

  const urgencyColor = getUrgencyColor(countdown.urgencyLevel);

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Timeline
      </h3>

      {/* Response Deadline - Primary Focus */}
      {timeline.responseDeadline && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Response Deadline</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatDate(timeline.responseDeadline)}
          </p>
          <div className="mt-2">
            <UrgencyBadge countdown={countdown} />
          </div>
        </div>
      )}

      {/* Countdown Visual */}
      {!countdown.isExpired && timeline.responseDeadline && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: `${urgencyColor}10` }}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: urgencyColor }}>
                {countdown.days}
              </p>
              <p className="text-xs text-gray-500">Days</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: urgencyColor }}>
                {countdown.hours}
              </p>
              <p className="text-xs text-gray-500">Hours</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: urgencyColor }}>
                {countdown.minutes}
              </p>
              <p className="text-xs text-gray-500">Minutes</p>
            </div>
          </div>
        </div>
      )}

      {/* Expired State */}
      {countdown.isExpired && timeline.responseDeadline && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-800 font-medium">
            The response deadline has passed, but you may still have options available.
          </p>
        </div>
      )}

      {/* Debt Origin Date */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">Debt Origin Date</p>
        <p className="text-base text-gray-700">{formatDate(timeline.debtOriginDate)}</p>
      </div>

      {/* Expandable Explanation */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-blue-600 hover:text-blue-800"
        aria-expanded={isExpanded}
      >
        <span>What happens on this date?</span>
        <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700 animate-fadeIn">
          <p className="mb-2">
            <strong>Response Deadline:</strong> This is the date by which you should respond to this debt notice.
            Responding doesn't mean you have to pay - you can dispute the debt, request more information,
            or start a conversation about payment options.
          </p>
          <p className="mb-2">
            <strong>Your Rights:</strong> You have the legal right to dispute this debt within 30 days
            of receiving the initial notice. Even after this period, you still have options.
          </p>
          <p>
            <strong>What if the deadline has passed?</strong> Don't worry - you can still take action.
            Contact us to discuss your options.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelineCard;
