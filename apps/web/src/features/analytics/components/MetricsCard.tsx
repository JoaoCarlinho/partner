/**
 * Metrics Card Component
 * Displays a single metric with change indicator
 */

import React from 'react';

/**
 * Props
 */
interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Format value based on type
 */
function formatValue(value: string | number, format?: string): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `${value}%`;
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  format,
  size = 'md',
  className = '',
}) => {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  const sizeStyles = {
    sm: { card: 'p-3', title: 'text-xs', value: 'text-xl', change: 'text-xs' },
    md: { card: 'p-4', title: 'text-sm', value: 'text-2xl', change: 'text-xs' },
    lg: { card: 'p-6', title: 'text-base', value: 'text-3xl', change: 'text-sm' },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${styles.card} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`${styles.title} text-gray-500 mb-1`}>{title}</p>
          <p className={`${styles.value} font-bold text-gray-900`}>
            {formatValue(value, format)}
          </p>
        </div>
        {icon && (
          <div className="p-2 bg-gray-100 rounded-lg text-gray-600">{icon}</div>
        )}
      </div>

      {change !== undefined && (
        <div className={`mt-2 flex items-center gap-1 ${styles.change}`}>
          <span
            className={`font-medium ${
              isPositiveChange
                ? 'text-green-600'
                : isNegativeChange
                  ? 'text-red-600'
                  : 'text-gray-500'
            }`}
          >
            {isPositiveChange && '+'}
            {change.toFixed(1)}%
          </span>
          <span className="text-gray-400">{changeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;
