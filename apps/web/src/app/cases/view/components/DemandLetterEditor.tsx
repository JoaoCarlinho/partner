'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useAutoSave } from '@/hooks/useAutoSave';
import { UnsavedChangesModal } from '@/components/UnsavedChangesModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

/** Auto-save interval in milliseconds (30 seconds) */
const AUTO_SAVE_INTERVAL = 30000;

export interface DemandLetterEditorProps {
  letterId: string;
  initialContent: string;
  onSaveSuccess?: (newContent: string) => void;
  onCancel?: () => void;
}

/**
 * Custom hook for tracking dirty state (AC-2.2.3, AC-2.2.4, AC-2.2.5)
 */
function useDirtyState(initialContent: string) {
  const [content, setContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);

  const isDirty = content !== originalContent;
  const isEmpty = !content.trim();
  const canSave = isDirty && !isEmpty;

  const reset = useCallback(() => setContent(originalContent), [originalContent]);
  const markSaved = useCallback(() => setOriginalContent(content), [content]);

  // Update original content when initialContent changes (e.g., after refetch)
  useEffect(() => {
    setOriginalContent(initialContent);
    setContent(initialContent);
  }, [initialContent]);

  return { content, setContent, isDirty, isEmpty, canSave, reset, markSaved };
}

/**
 * Format time for display (AC-2.2.7)
 */
function formatLastSaved(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * DemandLetterEditor - Editable textarea for DRAFT letters (AC-2.2.1 through AC-2.2.10)
 */
export function DemandLetterEditor({
  letterId,
  initialContent,
  onSaveSuccess,
  onCancel,
}: DemandLetterEditorProps) {
  const { content, setContent, isDirty, isEmpty, canSave, reset, markSaved } = useDirtyState(initialContent);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Browser beforeunload warning (AC-2.4.1)
  useBeforeUnload(isDirty);

  /**
   * Save content via API (shared by manual and auto-save)
   */
  const saveContent = useCallback(async (contentToSave: string): Promise<void> => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/v1/demands/${letterId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify({ content: contentToSave }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to save (${response.status})`);
    }
  }, [letterId]);

  // Auto-save every 30 seconds (AC-2.4.3, AC-2.4.4, AC-2.4.5, AC-2.4.6, AC-2.4.7, AC-2.4.8)
  const { autoSaving, lastAutoSaved, resetAutoSaveTracking } = useAutoSave({
    content,
    enabled: true, // Auto-save enabled for editor (which only shows for DRAFT)
    interval: AUTO_SAVE_INTERVAL,
    onSave: saveContent,
  });

  /**
   * Manual save handler (AC-2.2.2, AC-2.2.8, AC-2.2.9, AC-2.2.10)
   */
  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await saveContent(content);

      // Success (AC-2.2.7, AC-2.2.9)
      const now = new Date();
      setLastSaved(now);
      markSaved();
      resetAutoSaveTracking(content); // Reset auto-save tracking after manual save
      setSuccessMessage('Changes saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

      // Notify parent of save success
      onSaveSuccess?.(content);
    } catch (err) {
      // Error - preserve content (AC-2.2.10)
      setError(err instanceof Error ? err.message : 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle navigation attempt with unsaved changes (AC-2.4.2)
   */
  const handleNavigationAttempt = (navigateCallback: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => navigateCallback);
      setShowNavigationModal(true);
    } else {
      navigateCallback();
    }
  };

  /**
   * Cancel editing - now uses modal for unsaved changes (AC-2.2.6, AC-2.4.2)
   */
  const handleCancel = () => {
    handleNavigationAttempt(() => {
      reset();
      onCancel?.();
    });
  };

  /**
   * Save and leave handler for modal
   */
  const handleSaveAndLeave = async () => {
    try {
      await saveContent(content);
      markSaved();
      resetAutoSaveTracking(content);
      setShowNavigationModal(false);
      pendingNavigation?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    }
  };

  /**
   * Leave without saving handler for modal
   */
  const handleLeaveWithoutSaving = () => {
    reset();
    setShowNavigationModal(false);
    pendingNavigation?.();
  };

  /**
   * Cancel navigation modal
   */
  const handleCancelNavigation = () => {
    setShowNavigationModal(false);
    setPendingNavigation(null);
  };

  /**
   * Handle textarea content change
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Textarea for content editing (AC-2.2.1) */}
      <div className="relative">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y font-sans text-sm leading-relaxed"
          placeholder="Enter letter content..."
          disabled={saving}
          data-testid="letter-editor-textarea"
        />
      </div>

      {/* Error message (AC-2.2.10) */}
      {error && (
        <div
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          role="alert"
          data-testid="error-message"
        >
          {error}
        </div>
      )}

      {/* Success message (AC-2.2.9) */}
      {successMessage && (
        <div
          className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
          role="status"
          data-testid="success-message"
        >
          {successMessage}
        </div>
      )}

      {/* Footer with status and buttons (AC-2.2.6, AC-2.2.3, AC-2.2.7) */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        {/* Left side - status indicators */}
        <div className="flex items-center gap-4 text-sm">
          {/* Unsaved changes indicator (AC-2.2.3) */}
          {isDirty && (
            <span className="flex items-center gap-1.5 text-yellow-600" data-testid="unsaved-indicator">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Unsaved changes
            </span>
          )}

          {/* Empty content warning */}
          {isDirty && isEmpty && (
            <span className="text-red-500" data-testid="empty-warning">
              Content cannot be empty
            </span>
          )}

          {/* Last saved timestamp (AC-2.2.7) */}
          {lastSaved && !isDirty && (
            <span className="text-gray-500" data-testid="last-saved">
              Last saved: {formatLastSaved(lastSaved)}
            </span>
          )}

          {/* Auto-save indicator (AC-2.4.5, AC-2.4.6) */}
          {autoSaving && (
            <span className="flex items-center gap-1.5 text-blue-600" data-testid="auto-save-indicator">
              <Loader2 className="w-3 h-3 animate-spin" />
              Auto-saving...
            </span>
          )}
          {lastAutoSaved && !autoSaving && isDirty && (
            <span className="text-gray-400 text-xs" data-testid="last-auto-saved">
              Auto-saved: {formatLastSaved(lastAutoSaved)}
            </span>
          )}
        </div>

        {/* Right side - action buttons (AC-2.2.6) */}
        <div className="flex items-center gap-3">
          {/* Cancel button */}
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-button"
          >
            Cancel
          </button>

          {/* Save button (AC-2.2.4, AC-2.2.5, AC-2.2.8) */}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              canSave && !saving
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            data-testid="save-button"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Modal (AC-2.4.2) */}
      <UnsavedChangesModal
        isOpen={showNavigationModal}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
}

export default DemandLetterEditor;
