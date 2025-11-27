import { useEffect, useState, useRef, useCallback } from 'react';

export interface UseAutoSaveOptions {
  /** Current content to potentially save */
  content: string;
  /** Whether auto-save is enabled (false for non-DRAFT letters) */
  enabled: boolean;
  /** Auto-save interval in milliseconds (default 30000 = 30 seconds) */
  interval?: number;
  /** Async function to save content */
  onSave: (content: string) => Promise<void>;
  /** Called when manual save completes to reset auto-save tracking */
  lastManualSaveContent?: string;
}

export interface UseAutoSaveReturn {
  /** Whether an auto-save operation is currently in progress */
  autoSaving: boolean;
  /** Timestamp of last successful auto-save */
  lastAutoSaved: Date | null;
  /** Reset auto-save tracking (call after manual save) */
  resetAutoSaveTracking: (newContent: string) => void;
}

/**
 * useAutoSave - Auto-saves content at regular intervals (AC-2.4.3 through AC-2.4.8)
 *
 * Features:
 * - Auto-saves every 30 seconds when changes exist (AC-2.4.3)
 * - Only saves when content has changed since last save (AC-2.4.4)
 * - Visual indicator state for saving (AC-2.4.5)
 * - Tracks last auto-saved timestamp (AC-2.4.6)
 * - Silent error handling (AC-2.4.7)
 * - Can be disabled for non-DRAFT letters (AC-2.4.8)
 */
export function useAutoSave({
  content,
  enabled,
  interval = 30000,
  onSave,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const lastSavedContentRef = useRef(content);

  /**
   * Reset tracking after manual save
   */
  const resetAutoSaveTracking = useCallback((newContent: string) => {
    lastSavedContentRef.current = newContent;
  }, []);

  useEffect(() => {
    // Don't run auto-save if disabled (AC-2.4.8)
    if (!enabled) return;

    const timer = setInterval(async () => {
      // Only save if content has changed since last save (AC-2.4.4)
      if (content !== lastSavedContentRef.current) {
        setAutoSaving(true); // (AC-2.4.5)
        try {
          await onSave(content);
          lastSavedContentRef.current = content;
          setLastAutoSaved(new Date()); // (AC-2.4.6)
        } catch (error) {
          // Silent failure - log but don't interrupt user (AC-2.4.7)
          console.error('Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }
    }, interval); // (AC-2.4.3)

    return () => clearInterval(timer);
  }, [content, enabled, interval, onSave]);

  return { autoSaving, lastAutoSaved, resetAutoSaveTracking };
}

export default useAutoSave;
