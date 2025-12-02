'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://steno-prod-backend-vpc.eba-exhpmgyi.us-east-1.elasticbeanstalk.com';

/**
 * DiffLine represents a single line in the diff output
 */
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'context';
  content: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

/**
 * DiffResult from API
 */
export interface DiffResult {
  oldVersion: number;
  newVersion: number;
  oldContent: string;
  newContent: string;
  diff: DiffLine[];
  stats: {
    additions: number;
    deletions: number;
    unchanged: number;
  };
}

export interface VersionComparisonModalProps {
  letterId: string;
  version1: number;
  version2: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Simple client-side diff calculation when API doesn't return structured diff
 */
function calculateDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff: DiffLine[] = [];

  // Simple line-by-line comparison (not optimal, but works for basic cases)
  const maxLength = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine && oldLine !== undefined) {
      diff.push({
        type: 'unchanged',
        content: oldLine,
        lineNumberOld: i + 1,
        lineNumberNew: i + 1,
      });
    } else {
      if (oldLine !== undefined) {
        diff.push({
          type: 'removed',
          content: oldLine,
          lineNumberOld: i + 1,
        });
      }
      if (newLine !== undefined) {
        diff.push({
          type: 'added',
          content: newLine,
          lineNumberNew: i + 1,
        });
      }
    }
  }

  return diff;
}

/**
 * Calculate diff statistics
 */
function calculateStats(diff: DiffLine[]): { additions: number; deletions: number; unchanged: number } {
  return diff.reduce(
    (acc, line) => {
      if (line.type === 'added') acc.additions++;
      else if (line.type === 'removed') acc.deletions++;
      else if (line.type === 'unchanged') acc.unchanged++;
      return acc;
    },
    { additions: 0, deletions: 0, unchanged: 0 }
  );
}

/**
 * VersionComparisonModal - Side-by-side diff view (Story 4.3)
 *
 * Acceptance Criteria:
 * - AC-4.3.1: Select two versions for comparison
 * - AC-4.3.2: Display side-by-side diff from GET /api/v1/demands/{id}/diff?v1={v1}&v2={v2}
 * - AC-4.3.3: Diff clearly shows additions and deletions
 */
export function VersionComparisonModal({
  letterId,
  version1,
  version2,
  isOpen,
  onClose,
}: VersionComparisonModalProps) {
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const oldVersion = Math.min(version1, version2);
  const newVersion = Math.max(version1, version2);

  /**
   * Fetch diff from API (AC-4.3.2)
   */
  const fetchDiff = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_URL}/api/v1/demands/${letterId}/diff?v1=${oldVersion}&v2=${newVersion}`,
        {
          credentials: 'include',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch diff (${response.status})`);
      }

      const data = await response.json();
      const result = data.data || data;

      // If API returns raw content without structured diff, calculate it client-side
      if (result.oldContent && result.newContent && !result.diff) {
        const calculatedDiff = calculateDiff(result.oldContent, result.newContent);
        setDiffResult({
          oldVersion,
          newVersion,
          oldContent: result.oldContent,
          newContent: result.newContent,
          diff: calculatedDiff,
          stats: calculateStats(calculatedDiff),
        });
      } else {
        setDiffResult({
          oldVersion: result.oldVersion || oldVersion,
          newVersion: result.newVersion || newVersion,
          oldContent: result.oldContent || '',
          newContent: result.newContent || '',
          diff: result.diff || [],
          stats: result.stats || calculateStats(result.diff || []),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }, [letterId, oldVersion, newVersion, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchDiff();
    }
  }, [fetchDiff, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="version-comparison-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 id="comparison-modal-title" className="text-lg font-semibold text-gray-900">
              Compare Versions
            </h2>
            <span className="text-sm text-gray-500" data-testid="comparison-versions">
              v{oldVersion} → v{newVersion}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
            data-testid="close-comparison-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-12" data-testid="comparison-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-500">Loading comparison...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center py-12" data-testid="comparison-error">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDiff}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Diff content */}
        {!loading && !error && diffResult && (
          <>
            {/* Stats bar (AC-4.3.3) */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600" data-testid="additions-count">
                  <Plus className="w-4 h-4" />
                  {diffResult.stats.additions} additions
                </span>
                <span className="flex items-center gap-1 text-red-600" data-testid="deletions-count">
                  <Minus className="w-4 h-4" />
                  {diffResult.stats.deletions} deletions
                </span>
                <span className="text-gray-500">
                  {diffResult.stats.unchanged} unchanged lines
                </span>
              </div>
              <button
                onClick={() => setShowUnchanged(!showUnchanged)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                data-testid="toggle-unchanged"
              >
                {showUnchanged ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide unchanged
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show unchanged
                  </>
                )}
              </button>
            </div>

            {/* Diff view */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm font-mono" data-testid="diff-table">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="w-12 px-2 py-1 text-left text-gray-500 font-normal border-r border-gray-200">
                      v{oldVersion}
                    </th>
                    <th className="w-12 px-2 py-1 text-left text-gray-500 font-normal border-r border-gray-200">
                      v{newVersion}
                    </th>
                    <th className="px-4 py-1 text-left text-gray-500 font-normal">Content</th>
                  </tr>
                </thead>
                <tbody>
                  {diffResult.diff
                    .filter((line) => showUnchanged || line.type !== 'unchanged')
                    .map((line, index) => (
                      <tr
                        key={index}
                        className={
                          line.type === 'added'
                            ? 'bg-green-50'
                            : line.type === 'removed'
                            ? 'bg-red-50'
                            : 'bg-white'
                        }
                        data-testid={`diff-line-${line.type}`}
                      >
                        <td className="w-12 px-2 py-0.5 text-gray-400 border-r border-gray-200 text-right">
                          {line.lineNumberOld || ''}
                        </td>
                        <td className="w-12 px-2 py-0.5 text-gray-400 border-r border-gray-200 text-right">
                          {line.lineNumberNew || ''}
                        </td>
                        <td className="px-4 py-0.5 whitespace-pre-wrap">
                          <span
                            className={
                              line.type === 'added'
                                ? 'text-green-700'
                                : line.type === 'removed'
                                ? 'text-red-700'
                                : 'text-gray-700'
                            }
                          >
                            {line.type === 'added' && (
                              <Plus className="w-3 h-3 inline mr-1 text-green-600" />
                            )}
                            {line.type === 'removed' && (
                              <Minus className="w-3 h-3 inline mr-1 text-red-600" />
                            )}
                            {line.content || ' '}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Empty diff state */}
              {diffResult.diff.filter((line) => showUnchanged || line.type !== 'unchanged').length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {diffResult.diff.length === 0
                    ? 'No changes between these versions'
                    : 'No additions or deletions. Click "Show unchanged" to see all content.'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            data-testid="close-comparison-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VersionComparisonModal;
