/**
 * Countdown Hook
 * Calculates and updates countdown timer for deadlines
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Countdown result interface
 */
export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  displayText: string;
}

/**
 * Calculate countdown from deadline
 */
function calculateCountdown(deadline: Date | string | null | undefined): CountdownResult {
  if (!deadline) {
    return {
      days: -1,
      hours: -1,
      minutes: -1,
      seconds: -1,
      isExpired: false,
      urgencyLevel: 'low',
      displayText: 'No deadline set',
    };
  }

  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      urgencyLevel: 'critical',
      displayText: 'Response deadline has passed',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  if (days > 14) urgencyLevel = 'low';
  else if (days > 7) urgencyLevel = 'medium';
  else if (days > 3) urgencyLevel = 'high';
  else urgencyLevel = 'critical';

  let displayText: string;
  if (days > 0) {
    displayText = `${days} day${days !== 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    displayText = `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  } else if (minutes > 0) {
    displayText = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  } else {
    displayText = 'Less than a minute remaining';
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    urgencyLevel,
    displayText,
  };
}

/**
 * Hook for countdown timer
 *
 * @param deadline - Target deadline date
 * @param updateInterval - Update interval in milliseconds (default: 60000 = 1 minute)
 * @returns Countdown result with days, hours, minutes, and urgency level
 */
export function useCountdown(
  deadline: Date | string | null | undefined,
  updateInterval: number = 60000
): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() => calculateCountdown(deadline));

  const update = useCallback(() => {
    setResult(calculateCountdown(deadline));
  }, [deadline]);

  useEffect(() => {
    // Update immediately when deadline changes
    update();

    // Set up interval for periodic updates
    const timer = setInterval(update, updateInterval);

    return () => clearInterval(timer);
  }, [deadline, updateInterval, update]);

  return result;
}

/**
 * Get color class for urgency level
 */
export function getUrgencyColorClass(urgencyLevel: CountdownResult['urgencyLevel']): string {
  switch (urgencyLevel) {
    case 'low':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-orange-600 bg-orange-100';
    case 'critical':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get urgency color hex value
 */
export function getUrgencyColor(urgencyLevel: CountdownResult['urgencyLevel']): string {
  switch (urgencyLevel) {
    case 'low':
      return '#10B981'; // Green
    case 'medium':
      return '#F59E0B'; // Yellow
    case 'high':
      return '#F97316'; // Orange
    case 'critical':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Gray
  }
}

export default useCountdown;
