'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface VersionToolbarProps {
  letterId: string;
  currentVersion: number;
  totalVersions: number;
  onVersionChange: (newContent: string, newVersion: number, newTotalVersions: number) => void;
  disabled?: boolean;
}

export function VersionToolbar({
  letterId,
  currentVersion,
  totalVersions,
  onVersionChange,
  disabled = false,
}: VersionToolbarProps) {
  const [undoing, setUndoing] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [error, setError] = useState('');

  const canUndo = currentVersion > 1 && !undoing && !redoing && !disabled;
  const canRedo = currentVersion < totalVersions && !undoing && !redoing && !disabled;

  const handleUndo = useCallback(async () => {
    if (!canUndo) return;

    setUndoing(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Undo failed');
      }

      const data = await response.json();
      const result = data.data || data;
      onVersionChange(
        result.content,
        result.currentVersion || result.version || currentVersion - 1,
        result.totalVersions || totalVersions
      );
    } catch (err) {
      console.error('Undo failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to undo. Please try again.');
    } finally {
      setUndoing(false);
    }
  }, [canUndo, letterId, currentVersion, totalVersions, onVersionChange]);

  const handleRedo = useCallback(async () => {
    if (!canRedo) return;

    setRedoing(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/redo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Redo failed');
      }

      const data = await response.json();
      const result = data.data || data;
      onVersionChange(
        result.content,
        result.currentVersion || result.version || currentVersion + 1,
        result.totalVersions || totalVersions
      );
    } catch (err) {
      console.error('Redo failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to redo. Please try again.');
    } finally {
      setRedoing(false);
    }
  }, [canRedo, letterId, currentVersion, totalVersions, onVersionChange]);

  // Keyboard shortcuts: Ctrl+Z for Undo, Ctrl+Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey && canUndo) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'z' && e.shiftKey && canRedo) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  return (
    <div className="flex items-center gap-2">
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title={canUndo ? 'Undo (Ctrl+Z)' : 'No previous version'}
      >
        {undoing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        )}
        <span className="text-sm">{undoing ? 'Undoing...' : 'Undo'}</span>
      </button>

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title={canRedo ? 'Redo (Ctrl+Shift+Z)' : 'No next version'}
      >
        {redoing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        )}
        <span className="text-sm">{redoing ? 'Redoing...' : 'Redo'}</span>
      </button>

      {/* Version Indicator */}
      <span className="text-sm text-gray-500 ml-2">
        Version {currentVersion} of {totalVersions}
      </span>

      {/* Error Message */}
      {error && (
        <span className="text-sm text-red-600 ml-2">{error}</span>
      )}
    </div>
  );
}

// Export types
export type { VersionToolbarProps };
