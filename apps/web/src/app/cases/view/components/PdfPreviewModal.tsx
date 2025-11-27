'use client';

import { useEffect, useCallback, useRef } from 'react';
import { X, AlertCircle, Download, Printer } from 'lucide-react';
import { usePdfPreview } from '@/hooks/usePdfPreview';

export interface PdfPreviewModalProps {
  /** The demand letter ID to preview */
  letterId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * PdfPreviewModal - Modal for previewing demand letters as PDF (Story 6.1)
 *
 * Acceptance Criteria:
 * - AC-6.1.2: Clicking button opens modal with PDF preview
 * - AC-6.1.4: Loading spinner shown while PDF loads
 * - AC-6.1.5: PDF renders in iframe element
 * - AC-6.1.8: Error state displays with retry option on failure
 * - AC-6.1.9: Modal can be closed via X button or Escape key
 *
 * Story 6.2 Features (Download/Print):
 * - AC-6.2.1: Download button visible in preview modal
 * - AC-6.2.2: Download triggers browser download
 * - AC-6.2.3: Downloaded filename format: demand-letter-{id}.pdf
 * - AC-6.2.4: Print button visible in preview modal
 * - AC-6.2.5: Print triggers browser print dialog
 */
export function PdfPreviewModal({ letterId, isOpen, onClose }: PdfPreviewModalProps) {
  const { pdfUrl, isLoading, error, filename, fetchPdf, clearPdf } = usePdfPreview({ letterId });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch PDF when modal opens (AC-6.1.3)
  useEffect(() => {
    if (isOpen && !pdfUrl && !isLoading && !error) {
      fetchPdf();
    }
  }, [isOpen, pdfUrl, isLoading, error, fetchPdf]);

  // Handle Escape key to close modal (AC-6.1.9)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  /**
   * Handle modal close with cleanup (AC-6.1.9)
   */
  const handleClose = useCallback(() => {
    clearPdf(); // Revoke object URL to prevent memory leaks
    onClose();
  }, [clearPdf, onClose]);

  /**
   * Handle retry after error (AC-6.1.8)
   */
  const handleRetry = useCallback(() => {
    fetchPdf();
  }, [fetchPdf]);

  /**
   * Handle PDF download (AC-6.2.1, AC-6.2.2, AC-6.2.3)
   */
  const handleDownload = useCallback(() => {
    if (!pdfUrl) return;

    const anchor = document.createElement('a');
    anchor.href = pdfUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [pdfUrl, filename]);

  /**
   * Handle PDF print (AC-6.2.4, AC-6.2.5, AC-6.2.6)
   */
  const handlePrint = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }, []);

  if (!isOpen) return null;

  const canPerformActions = !isLoading && !error && pdfUrl;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="pdf-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header (AC-6.1.9) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="pdf-preview-title" className="text-lg font-semibold text-gray-900">
            PDF Preview
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
            data-testid="close-pdf-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden p-4 min-h-[600px]">
          {/* Loading state (AC-6.1.4) */}
          {isLoading && (
            <div
              className="flex flex-col items-center justify-center h-full"
              data-testid="pdf-loading-state"
            >
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-500">Generating PDF...</p>
            </div>
          )}

          {/* Error state (AC-6.1.8) */}
          {error && !isLoading && (
            <div
              className="flex flex-col items-center justify-center h-full"
              data-testid="pdf-error-state"
            >
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 text-center">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                data-testid="pdf-retry-button"
              >
                Retry
              </button>
            </div>
          )}

          {/* PDF iframe (AC-6.1.5) */}
          {pdfUrl && !isLoading && !error && (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg"
              title="PDF Preview"
              data-testid="pdf-iframe"
            />
          )}
        </div>

        {/* Footer with actions (AC-6.2.1, AC-6.2.4) */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          {/* Print button (AC-6.2.4) */}
          <button
            onClick={handlePrint}
            disabled={!canPerformActions}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="pdf-print-button"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          {/* Download button (AC-6.2.1) */}
          <button
            onClick={handleDownload}
            disabled={!canPerformActions}
            className="flex items-center gap-2 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="pdf-download-button"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            data-testid="pdf-close-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PdfPreviewModal;
