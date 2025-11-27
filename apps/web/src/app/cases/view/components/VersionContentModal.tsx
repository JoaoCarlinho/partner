'use client';

import { X, Clock, User, FileText } from 'lucide-react';
import { Version } from './VersionHistory';

export interface VersionContentModalProps {
  version: Version | null;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
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
 * VersionContentModal - Display historical version content in read-only mode (Story 4.2)
 *
 * Acceptance Criteria:
 * - AC-4.2.1: Click to view any version's content
 * - AC-4.2.2: Content displays in read-only mode
 * - AC-4.2.3: Clear indication of which version is being viewed
 */
export function VersionContentModal({
  version,
  currentVersion,
  isOpen,
  onClose,
}: VersionContentModalProps) {
  if (!isOpen || !version) return null;

  const isCurrent = version.versionNumber === currentVersion;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="version-content-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header (AC-4.2.3) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 id="version-modal-title" className="text-lg font-semibold text-gray-900">
              Version {version.versionNumber}
            </h2>
            {isCurrent ? (
              <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded">
                Current Version
              </span>
            ) : (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                Historical Version
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
            data-testid="close-version-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version metadata */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-1">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span data-testid="version-modal-date">{formatDateTime(version.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span data-testid="version-modal-creator">
                {version.createdBy?.name || version.createdBy?.email || 'Unknown'}
              </span>
            </div>
          </div>
          {version.refinementInstruction && (
            <div className="flex items-start gap-1 text-sm text-gray-600 mt-2">
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span data-testid="version-modal-instruction">
                Instruction: "{version.refinementInstruction}"
              </span>
            </div>
          )}
        </div>

        {/* Content area (AC-4.2.1, AC-4.2.2) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Content</span>
            <span className="text-xs text-gray-400 italic">(Read-only)</span>
          </div>
          {version.content ? (
            <div
              className="prose prose-sm max-w-none whitespace-pre-line p-4 bg-gray-50 border border-gray-200 rounded-lg"
              data-testid="version-content"
            >
              {version.content}
            </div>
          ) : (
            <p className="text-gray-400 italic p-4 bg-gray-50 border border-gray-200 rounded-lg">
              No content available for this version
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            data-testid="close-version-modal-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VersionContentModal;
