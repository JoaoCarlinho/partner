import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DemandLetterDetail, DemandLetterDetail as DemandLetterDetailType } from '../DemandLetterDetail';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

describe('DemandLetterDetail', () => {
  const mockLetter: DemandLetterDetailType = {
    id: 'letter-123-abc-456',
    caseId: 'case-789-xyz',
    content: 'Dear John Doe,\n\nThis is a test letter.\n\nSincerely,\nCreditor',
    status: 'DRAFT',
    currentVersion: 2,
    complianceResult: {
      isCompliant: true,
      score: 85,
      checks: [
        { id: '1', name: 'FDCPA Disclosure', passed: true, required: true },
        { id: '2', name: 'Dispute Rights', passed: false, required: true, message: 'Missing notice' },
      ],
    },
    createdAt: '2025-11-26T10:00:00Z',
    updatedAt: '2025-11-26T12:00:00Z',
    case: {
      id: 'case-789-xyz',
      creditorName: 'Acme Corp',
      debtorName: 'John Doe',
      status: 'ACTIVE',
    },
    template: {
      id: 'template-1',
      name: 'Standard FDCPA Letter',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // AC-2.1.6: Loading state shows spinner with "Loading letter..." text
  describe('Loading State (AC-2.1.6)', () => {
    it('shows loading spinner and text while fetching', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Loading letter...')).toBeInTheDocument();
    });
  });

  // AC-2.1.7: Error state shows error message with "Retry" button
  describe('Error State (AC-2.1.7)', () => {
    it('shows error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows Retry button on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });
    });

    it('retries fetch when Retry button is clicked', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockLetter }),
        });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  // AC-2.1.1: Display full letter content with proper paragraph formatting
  describe('Letter Content Display (AC-2.1.1)', () => {
    // Use APPROVED status for read-only content tests (non-DRAFT shows read-only)
    const approvedLetter = { ...mockLetter, status: 'APPROVED' as const };

    it('displays letter content in read-only mode for non-DRAFT letters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: approvedLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        const content = screen.getByTestId('letter-content');
        expect(content).toHaveTextContent('Dear John Doe');
        expect(content).toHaveTextContent('This is a test letter');
      });
    });

    it('preserves paragraph formatting with whitespace-pre-line for read-only', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: approvedLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        const content = screen.getByTestId('letter-content');
        expect(content).toHaveClass('whitespace-pre-line');
      });
    });

    it('handles empty content gracefully for non-DRAFT letters', async () => {
      const letterWithNoContent = { ...approvedLetter, content: '' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: letterWithNoContent }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('No content available')).toBeInTheDocument();
      });
    });

    it('shows editor for DRAFT status letters (AC-2.2.1)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }), // DRAFT status
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('letter-editor-textarea')).toBeInTheDocument();
        expect(screen.getByText('(Editable)')).toBeInTheDocument();
      });
    });
  });

  // AC-2.1.2: Show letter metadata in sidebar
  describe('Metadata Sidebar (AC-2.1.2)', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });
    });

    it('displays case info (creditor, debtor)', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        // John Doe appears in both header and sidebar, so use getAllByText
        const debtorNames = screen.getAllByText('John Doe');
        expect(debtorNames.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays template name', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('Standard FDCPA Letter')).toBeInTheDocument();
      });
    });

    it('displays "Custom letter" when no template', async () => {
      const letterNoTemplate = { ...mockLetter, template: undefined };
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: letterNoTemplate }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('Custom letter')).toBeInTheDocument();
      });
    });

    it('formats creation date correctly', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('Nov 26, 2025')).toBeInTheDocument();
      });
    });
  });

  // AC-2.1.3, AC-2.1.4: Compliance panel display
  describe('Compliance Panel (AC-2.1.3, AC-2.1.4)', () => {
    it('displays compliance score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('compliance-score')).toHaveTextContent('85%');
      });
    });

    it('displays compliance checks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('FDCPA Disclosure')).toBeInTheDocument();
        expect(screen.getByText('Dispute Rights')).toBeInTheDocument();
      });
    });
  });

  // AC-2.1.5: Header shows case reference, debtor name, and status badge
  describe('Header Display (AC-2.1.5)', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });
    });

    it('displays letter reference in header', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('Letter #letter-1')).toBeInTheDocument();
      });
    });

    it('displays debtor name prominently', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        // Debtor name as heading
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent('John Doe');
      });
    });

    it('displays status badge', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    it('displays version badge', async () => {
      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByText('v2')).toBeInTheDocument();
      });
    });
  });

  // AC-2.1.8: URL format and navigation
  describe('Navigation (AC-2.1.8)', () => {
    it('has back to letters button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('back-to-letters')).toBeInTheDocument();
      });
    });

    it('navigates back to list when back button clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('back-to-letters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('back-to-letters'));

      expect(mockPush).toHaveBeenCalledWith('/cases/view?id=case-123');
    });
  });

  describe('API Integration', () => {
    it('calls correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetter }),
      });

      render(<DemandLetterDetail caseId="case-123" letterId="letter-456" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/demands/letter-456'),
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });
  });
});
