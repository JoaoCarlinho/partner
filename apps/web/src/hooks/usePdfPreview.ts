import { useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

export interface UsePdfPreviewOptions {
  /** The demand letter ID to preview */
  letterId: string;
}

export interface UsePdfPreviewReturn {
  /** Object URL for the PDF blob (use as iframe src) */
  pdfUrl: string | null;
  /** Whether PDF is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Generated filename for download: demand-letter-{id}.pdf */
  filename: string;
  /** Fetch the PDF from the API */
  fetchPdf: () => Promise<void>;
  /** Clear PDF and revoke object URL (call on modal close) */
  clearPdf: () => void;
}

/**
 * usePdfPreview - Manages PDF preview state and fetching (AC-6.1.3, AC-6.1.4, AC-6.1.8)
 *
 * Features:
 * - Fetches PDF blob from API with Bearer token auth (AC-6.1.3)
 * - Creates object URL for iframe rendering (AC-6.1.5)
 * - Loading and error state management (AC-6.1.4, AC-6.1.8)
 * - Memory cleanup via URL.revokeObjectURL (prevents memory leaks)
 * - Generates filename for download: demand-letter-{id}.pdf
 */
export function usePdfPreview({ letterId }: UsePdfPreviewOptions): UsePdfPreviewReturn {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  // Generate filename format: demand-letter-{id}.pdf (AC-6.2.3)
  const filename = `demand-letter-${letterId}.pdf`;

  /**
   * Fetch PDF blob from API (AC-6.1.3)
   */
  const fetchPdf = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}/preview`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        // Handle specific error codes with user-friendly messages
        switch (response.status) {
          case 401:
            // Redirect to login for unauthorized
            window.location.href = '/login';
            throw new Error('Session expired. Please log in again.');
          case 403:
            throw new Error("You don't have permission to view this PDF");
          case 404:
            throw new Error('Letter not found');
          case 500:
          default:
            throw new Error('Unable to generate PDF. Please try again.');
        }
      }

      // Get blob and create object URL
      const blob = await response.blob();

      // Revoke previous URL if exists to prevent memory leaks
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(blob);
      pdfUrlRef.current = objectUrl;
      setPdfUrl(objectUrl);
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [letterId]);

  /**
   * Clear PDF and revoke object URL (call on modal close)
   * Prevents memory leaks from accumulated blob references
   */
  const clearPdf = useCallback(() => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);
    setError(null);
  }, []);

  return {
    pdfUrl,
    isLoading,
    error,
    filename,
    fetchPdf,
    clearPdf,
  };
}

export default usePdfPreview;
