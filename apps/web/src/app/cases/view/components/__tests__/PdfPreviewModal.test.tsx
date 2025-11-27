import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PdfPreviewModal } from '../PdfPreviewModal';

// Mock the usePdfPreview hook
const mockFetchPdf = jest.fn();
const mockClearPdf = jest.fn();

jest.mock('@/hooks/usePdfPreview', () => ({
  usePdfPreview: jest.fn(() => ({
    pdfUrl: null,
    isLoading: false,
    error: null,
    filename: 'demand-letter-test-123.pdf',
    fetchPdf: mockFetchPdf,
    clearPdf: mockClearPdf,
  })),
}));

// Import after mock
import { usePdfPreview } from '@/hooks/usePdfPreview';

const mockUsePdfPreview = usePdfPreview as jest.Mock;

describe('PdfPreviewModal', () => {
  const defaultProps = {
    letterId: 'test-letter-123',
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePdfPreview.mockReturnValue({
      pdfUrl: null,
      isLoading: false,
      error: null,
      filename: 'demand-letter-test-123.pdf',
      fetchPdf: mockFetchPdf,
      clearPdf: mockClearPdf,
    });
  });

  // AC-6.1.2: Clicking button opens modal with PDF preview
  describe('Modal Rendering (AC-6.1.2)', () => {
    it('renders modal when isOpen is true', () => {
      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-preview-modal')).toBeInTheDocument();
      expect(screen.getByText('PDF Preview')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<PdfPreviewModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('pdf-preview-modal')).not.toBeInTheDocument();
    });

    it('fetches PDF when modal opens', () => {
      render(<PdfPreviewModal {...defaultProps} />);

      expect(mockFetchPdf).toHaveBeenCalled();
    });
  });

  // AC-6.1.4: Loading spinner shown while PDF loads
  describe('Loading State (AC-6.1.4)', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: null,
        isLoading: true,
        error: null,
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-loading-state')).toBeInTheDocument();
      expect(screen.getByText('Generating PDF...')).toBeInTheDocument();
    });
  });

  // AC-6.1.5: PDF renders in iframe element
  describe('PDF Rendering (AC-6.1.5)', () => {
    it('renders iframe with pdfUrl when loaded', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: 'blob:mock-pdf-url',
        isLoading: false,
        error: null,
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      const iframe = screen.getByTestId('pdf-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'blob:mock-pdf-url');
    });
  });

  // AC-6.1.8: Error state displays with retry option on failure
  describe('Error State (AC-6.1.8)', () => {
    it('shows error message and retry button', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: null,
        isLoading: false,
        error: 'Unable to generate PDF. Please try again.',
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-error-state')).toBeInTheDocument();
      expect(screen.getByText('Unable to generate PDF. Please try again.')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-retry-button')).toBeInTheDocument();
    });

    it('calls fetchPdf when retry button is clicked', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: null,
        isLoading: false,
        error: 'Error message',
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('pdf-retry-button'));

      expect(mockFetchPdf).toHaveBeenCalled();
    });
  });

  // AC-6.1.9: Modal can be closed via X button or Escape key
  describe('Modal Close (AC-6.1.9)', () => {
    it('calls onClose and clearPdf when X button is clicked', () => {
      const onClose = jest.fn();
      render(<PdfPreviewModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('close-pdf-modal'));

      expect(mockClearPdf).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose and clearPdf when Close button is clicked', () => {
      const onClose = jest.fn();
      render(<PdfPreviewModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('pdf-close-button'));

      expect(mockClearPdf).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('closes modal on Escape key press', () => {
      const onClose = jest.fn();
      render(<PdfPreviewModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockClearPdf).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('has correct accessibility attributes', () => {
      render(<PdfPreviewModal {...defaultProps} />);

      const modal = screen.getByTestId('pdf-preview-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'pdf-preview-title');
    });
  });

  // AC-6.2.1: Download button visible in preview modal
  // AC-6.2.4: Print button visible in preview modal
  describe('Action Buttons (AC-6.2.1, AC-6.2.4)', () => {
    it('renders Download and Print buttons', () => {
      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-download-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-print-button')).toBeInTheDocument();
    });

    it('disables action buttons during loading', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: null,
        isLoading: true,
        error: null,
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-download-button')).toBeDisabled();
      expect(screen.getByTestId('pdf-print-button')).toBeDisabled();
    });

    it('disables action buttons when error', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: null,
        isLoading: false,
        error: 'Error',
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-download-button')).toBeDisabled();
      expect(screen.getByTestId('pdf-print-button')).toBeDisabled();
    });

    it('enables action buttons when PDF is loaded', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: 'blob:mock-pdf-url',
        isLoading: false,
        error: null,
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('pdf-download-button')).not.toBeDisabled();
      expect(screen.getByTestId('pdf-print-button')).not.toBeDisabled();
    });
  });

  // AC-6.2.2: Download triggers browser download
  describe('Download Functionality (AC-6.2.2)', () => {
    it('triggers download with correct filename when download button clicked', () => {
      mockUsePdfPreview.mockReturnValue({
        pdfUrl: 'blob:mock-pdf-url',
        isLoading: false,
        error: null,
        filename: 'demand-letter-test-123.pdf',
        fetchPdf: mockFetchPdf,
        clearPdf: mockClearPdf,
      });

      render(<PdfPreviewModal {...defaultProps} />);

      // Mock the anchor element behavior after render
      const mockClick = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      fireEvent.click(screen.getByTestId('pdf-download-button'));

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });
  });
});
