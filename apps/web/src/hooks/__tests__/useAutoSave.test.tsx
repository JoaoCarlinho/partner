import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

// Mock timers for interval testing
jest.useFakeTimers();

describe('useAutoSave', () => {
  const mockOnSave = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  // AC-2.4.3: Auto-save every 30 seconds
  describe('Auto-save Interval (AC-2.4.3)', () => {
    it('saves content after interval when content changes', async () => {
      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 30000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      // Update content
      rerender({ content: 'updated content' });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('updated content');
      });
    });

    it('uses default 30 second interval', () => {
      renderHook(() =>
        useAutoSave({
          content: 'test',
          enabled: true,
          onSave: mockOnSave,
        })
      );

      // Content hasn't changed from initial, so no save
      act(() => {
        jest.advanceTimersByTime(29000);
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('respects custom interval', async () => {
      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 5000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      rerender({ content: 'changed' });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  // AC-2.4.4: Only save when content has changed
  describe('Content Change Detection (AC-2.4.4)', () => {
    it('does not save when content has not changed', () => {
      renderHook(() =>
        useAutoSave({
          content: 'same content',
          enabled: true,
          interval: 1000,
          onSave: mockOnSave,
        })
      );

      // Advance past interval
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('saves when content differs from last saved', async () => {
      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'original' } }
      );

      rerender({ content: 'modified' });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('modified');
      });
    });

    it('does not save again if content matches after save', async () => {
      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'original' } }
      );

      // Change content
      rerender({ content: 'modified' });

      // First interval - should save
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnSave).toHaveBeenCalledTimes(1);

      // Second interval - content unchanged (since it was saved), should not save
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  // AC-2.4.5: Visual indicator for auto-saving
  describe('Auto-saving Indicator (AC-2.4.5)', () => {
    it('returns autoSaving state during save', async () => {
      let resolvePromise: () => void;
      const slowSave = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: slowSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      expect(result.current.autoSaving).toBe(false);

      rerender({ content: 'changed' });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should be saving now
      await waitFor(() => {
        expect(result.current.autoSaving).toBe(true);
      });

      // Complete the save
      await act(async () => {
        resolvePromise!();
      });

      await waitFor(() => {
        expect(result.current.autoSaving).toBe(false);
      });
    });
  });

  // AC-2.4.6: Last auto-saved timestamp
  describe('Last Auto-saved Timestamp (AC-2.4.6)', () => {
    it('updates lastAutoSaved after successful save', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      expect(result.current.lastAutoSaved).toBeNull();

      rerender({ content: 'changed' });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.lastAutoSaved).toBeInstanceOf(Date);
      });
    });
  });

  // AC-2.4.7: Silent error handling
  describe('Silent Error Handling (AC-2.4.7)', () => {
    it('logs error but does not throw on save failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const failingSave = jest.fn().mockRejectedValue(new Error('Network error'));

      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: failingSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      rerender({ content: 'changed' });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Auto-save failed:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('continues auto-save attempts after failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const failOnce = jest
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockResolvedValueOnce(undefined);

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: failOnce,
          }),
        { initialProps: { content: 'initial' } }
      );

      rerender({ content: 'changed' });

      // First interval - fails
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(failOnce).toHaveBeenCalledTimes(1);
      });

      // Change content again to trigger another save
      rerender({ content: 'changed again' });

      // Second interval - succeeds
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(failOnce).toHaveBeenCalledTimes(2);
        expect(result.current.lastAutoSaved).toBeInstanceOf(Date);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  // AC-2.4.8: Disabled for non-DRAFT letters
  describe('Disabled State (AC-2.4.8)', () => {
    it('does not auto-save when disabled', () => {
      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: false,
            interval: 1000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      rerender({ content: 'changed' });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('resetAutoSaveTracking', () => {
    it('resets tracking content after manual save', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave({
            content,
            enabled: true,
            interval: 1000,
            onSave: mockOnSave,
          }),
        { initialProps: { content: 'initial' } }
      );

      rerender({ content: 'manually saved' });

      // Simulate manual save completed - reset tracking
      act(() => {
        result.current.resetAutoSaveTracking('manually saved');
      });

      // Advance timer - should not trigger auto-save since content matches
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('clears interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        useAutoSave({
          content: 'test',
          enabled: true,
          interval: 1000,
          onSave: mockOnSave,
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
