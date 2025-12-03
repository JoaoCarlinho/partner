import { useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface DeleteCaseState {
  isDeleting: boolean;
  error: string | null;
}

interface UseDeleteCaseReturn {
  deleteCase: (caseId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for deleting cases (admin only)
 * Returns a function to delete a case by ID along with loading and error states
 */
export function useDeleteCase(): UseDeleteCaseReturn {
  const [state, setState] = useState<DeleteCaseState>({
    isDeleting: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const deleteCase = useCallback(async (caseId: string): Promise<boolean> => {
    setState({ isDeleting: true, error: null });

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/cases/${caseId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 204) {
        setState({ isDeleting: false, error: null });
        return true;
      }

      // Handle error responses
      const data = await response.json();
      let errorMessage = 'Failed to delete case';

      if (response.status === 403) {
        errorMessage = 'You do not have permission to delete cases';
      } else if (response.status === 404) {
        errorMessage = 'Case not found';
      } else if (data.error?.code === 'HAS_DEMAND_LETTERS') {
        errorMessage = 'Cannot delete case with existing demand letters. Delete the demand letters first.';
      } else if (data.error?.message) {
        errorMessage = data.error.message;
      }

      setState({ isDeleting: false, error: errorMessage });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete case';
      setState({ isDeleting: false, error: errorMessage });
      return false;
    }
  }, []);

  return {
    deleteCase,
    isDeleting: state.isDeleting,
    error: state.error,
    clearError,
  };
}
