import { renderHook } from '@testing-library/react';
import { useBeforeUnload } from '../useBeforeUnload';

describe('useBeforeUnload', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  // AC-2.4.1: Browser warning when leaving with unsaved changes
  describe('Browser Warning (AC-2.4.1)', () => {
    it('adds beforeunload event listener when shouldWarn is true', () => {
      renderHook(() => useBeforeUnload(true));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('adds beforeunload event listener when shouldWarn is false', () => {
      renderHook(() => useBeforeUnload(false));

      // Listener is still added, but won't prevent unload
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('triggers warning when shouldWarn is true', () => {
      renderHook(() => useBeforeUnload(true));

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1] as (e: BeforeUnloadEvent) => void;

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      } as unknown as BeforeUnloadEvent;

      const result = handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('');
      expect(result).toBe('');
    });

    it('does not trigger warning when shouldWarn is false', () => {
      renderHook(() => useBeforeUnload(false));

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1] as (e: BeforeUnloadEvent) => void;

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: 'initial',
      } as unknown as BeforeUnloadEvent;

      handler(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('initial');
    });
  });

  describe('Cleanup', () => {
    it('removes event listener on unmount', () => {
      const { unmount } = renderHook(() => useBeforeUnload(true));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('updates listener when shouldWarn changes', () => {
      const { rerender } = renderHook(
        ({ shouldWarn }) => useBeforeUnload(shouldWarn),
        { initialProps: { shouldWarn: false } }
      );

      // Initial add
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

      // Change to true
      rerender({ shouldWarn: true });

      // Should have removed old listener and added new one
      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
    });
  });
});
