import { useEffect } from 'react';

/**
 * useBeforeUnload - Warns user before leaving page with unsaved changes (AC-2.4.1)
 *
 * @param shouldWarn - Whether to show the browser's native confirmation dialog
 */
export function useBeforeUnload(shouldWarn: boolean): void {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();
        // Required for Chrome - setting returnValue triggers the dialog
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn]);
}

export default useBeforeUnload;
