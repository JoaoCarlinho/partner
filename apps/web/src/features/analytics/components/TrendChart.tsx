/**
 * Trend Chart Component
 * Simple line chart for trend visualization
 */

import React, { useMemo } from 'react';

/**
 * Trend data point
 */
interface TrendPoint {
  date: string;
  value: number;
  change?: number;
}

/**
 * Props
 */
interface TrendChartProps {
  data: TrendPoint[];
  title: string;
  format?: 'number' | 'currency' | 'percent';
  color?: 'blue' | 'green' | 'orange' | 'purple';
  height?: number;
  showGrid?: boolean;
  className?: string;
}

/**
 * Format value
 */
function formatValue(value: number, format?: string): string {
  switch (format) {
    case 'currency':
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toFixed(0);
  }
}

/**
 * Color styles
 */
const COLOR_STYLES = {
  blue: { line: '#3B82F6', fill: 'rgba(59, 130, 246, 0.1)' },
  green: { line: '#10B981', fill: 'rgba(16, 185, 129, 0.1)' },
  orange: { line: '#F59E0B', fill: 'rgba(245, 158, 11, 0.1)' },
  purple: { line: '#8B5CF6', fill: 'rgba(139, 92, 246, 0.1)' },
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  format,
  color = 'blue',
  height = 200,
  showGrid = true,
  className = '',
}) => {
  const colorStyle = COLOR_STYLES[color];

  // Calculate chart dimensions
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: '', minY: 0, maxY: 0, yLabels: [] };

    const values = data.map((d) => d.value);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const range = maxY - minY || 1;

    const padding = 40;
    const chartWidth = 100 - padding / 5;
    const chartHeight = height - padding;

    // Generate SVG path points
    const points = data
      .map((d, i) => {
        const x = padding / 2 + (i / (data.length - 1 || 1)) * chartWidth;
        const y = chartHeight - ((d.value - minY) / range) * (chartHeight - 20);
        return `${x},${y}`;
      })
      .join(' ');

    // Generate area path
    const firstX = padding / 2;
    const lastX = padding / 2 + chartWidth;
    const areaPoints = `${firstX},${chartHeight} ${points} ${lastX},${chartHeight}`;

    // Y-axis labels
    const yLabels = [minY, (minY + maxY) / 2, maxY].map((v) => ({
      value: formatValue(v, format),
      y: chartHeight - ((v - minY) / range) * (chartHeight - 20),
    }));

    return { points, areaPoints, minY, maxY, yLabels, chartWidth, chartHeight };
  }, [data, format, height]);

  // Get latest trend
  const latestChange = data.length > 1 ? data[data.length - 1].change : undefined;
  const latestValue = data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatValue(latestValue, format)}</p>
          {latestChange !== undefined && (
            <p
              className={`text-xs ${
                latestChange > 0
                  ? 'text-green-600'
                  : latestChange < 0
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              {latestChange > 0 && '+'}
              {latestChange.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Grid lines */}
          {showGrid && (
            <g className="text-gray-200">
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1="20"
                  y1={chartData.chartHeight! * (1 - ratio)}
                  x2="100"
                  y2={chartData.chartHeight! * (1 - ratio)}
                  stroke="currentColor"
                  strokeDasharray="2,2"
                />
              ))}
            </g>
          )}

          {/* Area fill */}
          <polygon points={chartData.areaPoints} fill={colorStyle.fill} />

          {/* Line */}
          <polyline
            points={chartData.points}
            fill="none"
            stroke={colorStyle.line}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {data.map((d, i) => {
            const x = 20 + (i / (data.length - 1 || 1)) * 80;
            const y =
              (chartData.chartHeight || height) -
              ((d.value - (chartData.minY || 0)) / ((chartData.maxY || 1) - (chartData.minY || 0) || 1)) *
                ((chartData.chartHeight || height) - 20);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="white"
                stroke={colorStyle.line}
                strokeWidth="2"
              />
            );
          })}

          {/* Y-axis labels */}
          {chartData.yLabels?.map((label, i) => (
            <text
              key={i}
              x="2"
              y={label.y}
              className="text-[8px] fill-gray-400"
              dominantBaseline="middle"
            >
              {label.value}
            </text>
          ))}
        </svg>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-400">
          No data available
        </div>
      )}

      {/* X-axis labels */}
      {data.length > 0 && (
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{data[0].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
