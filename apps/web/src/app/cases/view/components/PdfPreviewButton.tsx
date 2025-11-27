'use client';

import { FileText } from 'lucide-react';

export interface PdfPreviewButtonProps {
  /** Click handler to open preview modal */
  onClick: () => void;
  /** Optional disabled state */
  disabled?: boolean;
}

/**
 * PdfPreviewButton - Button to trigger PDF preview modal (Story 6.1)
 *
 * Acceptance Criteria:
 * - AC-6.1.1: "Preview PDF" button visible in letter detail view
 */
export function PdfPreviewButton({ onClick, disabled = false }: PdfPreviewButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid="pdf-preview-button"
    >
      <FileText className="w-4 h-4" />
      Preview PDF
    </button>
  );
}

export default PdfPreviewButton;
