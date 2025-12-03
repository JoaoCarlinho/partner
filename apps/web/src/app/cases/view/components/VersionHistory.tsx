'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, User, FileText, ChevronRight, RefreshCw, GitCompare } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Version interface from API
 */
export interface Version {
  id: string;
  versionNumber: number;
  content: string;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
    name?: string;
  };
  refinementInstruction?: string;
  changeType: 'INITIAL' | 'MANUAL_EDIT' | 'AI_REFINEMENT';
}

export interface VersionHistoryProps {
  letterId: string;
  currentVersion: number;
  onVersionSelect?: (version: Version) => void;
  onCompareSelect?: (v1: number, v2: number) => void;
}

/**
 * Format date as "Nov 26, 2025 at 2:30 PM"
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Get relative time "2 hours ago"
 */
function getRelativeTime(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateString);
}

/**
 * Get change type label and color
 */
function getChangeTypeInfo(changeType: Version['changeType']): { label: string; color: string } {
  switch (changeType) {
    case 'INITIAL':
      return { label: 'Created', color: 'bg-blue-100 text-blue-700' };
    case 'MANUAL_EDIT':
      return { label: 'Manual Edit', color: 'bg-gray-100 text-gray-700' };
    case 'AI_REFINEMENT':
      return { label: 'AI Refinement', color: 'bg-purple-100 text-purple-700' };
    default:
      return { label: 'Modified', color: 'bg-gray-100 text-gray-700' };
  }
}

/**
 * VersionHistory - Timeline UI for version progression (Story 4.1)
 *
 * Acceptance Criteria:
 * - AC-4.1.1: List all versions from GET /api/v1/demands/{id}/versions
 * - AC-4.1.2: Show version number and creation date
 * - AC-4.1.3: Show refinement instruction that created each version
 * - AC-4.1.4: Show creator email for each version
 * - AC-4.1.5: Current version clearly indicated in list
 */
export function VersionHistory({
  letterId,
  currentVersion,
  onVersionSelect,
  onCompareSelect,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  /**
   * Fetch versions from API (AC-4.1.1)
   */
  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/versions`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch versions (${response.status})`);
      }

      const data = await response.json();
      // Sort versions by version number descending (newest first)
      const sortedVersions = (data.data || data.versions || data || []).sort(
        (a: Version, b: Version) => b.versionNumber - a.versionNumber
      );
      setVersions(sortedVersions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [letterId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  /**
   * Handle version click for viewing
   */
  const handleVersionClick = (version: Version) => {
    onVersionSelect?.(version);
  };

  /**
   * Handle version selection for comparison
   */
  const handleCompareToggle = (versionNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();

    setSelectedForCompare((prev) => {
      if (prev.includes(versionNumber)) {
        return prev.filter((v) => v !== versionNumber);
      }
      if (prev.length >= 2) {
        // Replace oldest selection with new one
        return [prev[1], versionNumber];
      }
      return [...prev, versionNumber];
    });
  };

  /**
   * Trigger comparison
   */
  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      const [v1, v2] = selectedForCompare.sort((a, b) => a - b);
      onCompareSelect?.(v1, v2);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Version History</h3>
        <div className="flex items-center justify-center py-6" data-testid="version-history-loading">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading versions...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Version History</h3>
        <div className="text-center py-4" data-testid="version-history-error">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchVersions}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (versions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Version History</h3>
        <p className="text-sm text-gray-500 text-center py-4">No versions available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="version-history">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Version History</h3>
        {/* Compare button appears when 2 versions selected */}
        {selectedForCompare.length === 2 && onCompareSelect && (
          <button
            onClick={handleCompare}
            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700 flex items-center gap-1"
            data-testid="compare-versions-button"
          >
            <GitCompare className="w-3 h-3" />
            Compare v{Math.min(...selectedForCompare)} & v{Math.max(...selectedForCompare)}
          </button>
        )}
      </div>

      {/* Version timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

        {/* Version items */}
        <div className="space-y-3">
          {versions.map((version, index) => {
            const isCurrent = version.versionNumber === currentVersion;
            const changeInfo = getChangeTypeInfo(version.changeType);
            const isSelectedForCompare = selectedForCompare.includes(version.versionNumber);

            return (
              <div
                key={version.id}
                className={`relative flex items-start gap-3 pl-8 cursor-pointer group ${
                  isCurrent ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                }`}
                onClick={() => handleVersionClick(version)}
                data-testid={`version-item-${version.versionNumber}`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                    isCurrent
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white border-gray-300 group-hover:border-primary-400'
                  }`}
                />

                {/* Version card */}
                <div
                  className={`flex-1 p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'bg-primary-50 border-primary-200'
                      : isSelectedForCompare
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {/* Version badge (AC-4.1.2, AC-4.1.5) */}
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          isCurrent ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                        data-testid={`version-number-${version.versionNumber}`}
                      >
                        v{version.versionNumber}
                        {isCurrent && ' (Current)'}
                      </span>

                      {/* Change type badge */}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${changeInfo.color}`}>
                        {changeInfo.label}
                      </span>
                    </div>

                    {/* Compare checkbox */}
                    {onCompareSelect && (
                      <button
                        onClick={(e) => handleCompareToggle(version.versionNumber, e)}
                        className={`text-xs px-2 py-0.5 rounded border ${
                          isSelectedForCompare
                            ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                            : 'bg-white border-gray-300 text-gray-500 hover:border-primary-400'
                        }`}
                        data-testid={`compare-select-${version.versionNumber}`}
                      >
                        {isSelectedForCompare ? 'Selected' : 'Compare'}
                      </button>
                    )}
                  </div>

                  {/* Date and time (AC-4.1.2) */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Clock className="w-3 h-3" />
                    <span title={formatDateTime(version.createdAt)}>
                      {getRelativeTime(version.createdAt)}
                    </span>
                  </div>

                  {/* Creator info (AC-4.1.4) */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <User className="w-3 h-3" />
                    <span data-testid={`version-creator-${version.versionNumber}`}>
                      {version.createdBy?.name || version.createdBy?.email || 'Unknown'}
                    </span>
                  </div>

                  {/* Refinement instruction (AC-4.1.3) */}
                  {version.refinementInstruction && (
                    <div className="flex items-start gap-1 text-xs text-gray-600 mt-2 bg-white/50 p-2 rounded">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span
                        className="line-clamp-2"
                        data-testid={`version-instruction-${version.versionNumber}`}
                      >
                        "{version.refinementInstruction}"
                      </span>
                    </div>
                  )}

                  {/* View indicator */}
                  <div className="flex items-center justify-end mt-2 text-xs text-gray-400 group-hover:text-primary-600">
                    <span>View content</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VersionHistory;
