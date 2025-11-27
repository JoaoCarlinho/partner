import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VersionComparisonModal, DiffResult } from '../VersionComparisonModal';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

const mockDiffResult: DiffResult = {
  oldVersion: 1,
  newVersion: 2,
  oldContent: 'Line 1\nLine 2\nLine 3 old',
  newContent: 'Line 1\nLine 2 modified\nLine 3 new\nLine 4 added',
  diff: [
    { type: 'unchanged', content: 'Line 1', lineNumberOld: 1, lineNumberNew: 1 },
    { type: 'removed', content: 'Line 2', lineNumberOld: 2 },
    { type: 'added', content: 'Line 2 modified', lineNumberNew: 2 },
    { type: 'removed', content: 'Line 3 old', lineNumberOld: 3 },
    { type: 'added', content: 'Line 3 new', lineNumberNew: 3 },
    { type: 'added', content: 'Line 4 added', lineNumberNew: 4 },
  ],
  stats: {
    additions: 3,
    deletions: 2,
    unchanged: 1,
  },
};

describe('VersionComparisonModal', () => {
  const defaultProps = {
    letterId: 'letter-123',
    version1: 1,
    version2: 2,
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // AC-4.3.1: Select two versions for comparison (implicitly tested - props pass versions)
  describe('Version Selection Display (AC-4.3.1)', () => {
    it('displays selected version numbers in header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('comparison-versions')).toHaveTextContent('v1 → v2');
      });
    });

    it('orders versions correctly regardless of input order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      // Pass versions in reverse order
      render(<VersionComparisonModal {...defaultProps} version1={2} version2={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('comparison-versions')).toHaveTextContent('v1 → v2');
      });
    });
  });

  // AC-4.3.2: Display side-by-side diff from API
  describe('Diff API Call (AC-4.3.2)', () => {
    it('fetches diff from API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/demands/letter-123/diff?v1=1&v2=2'),
          expect.any(Object)
        );
      });
    });

    it('shows loading state while fetching', () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockDiffResult }),
        }), 1000))
      );

      render(<VersionComparisonModal {...defaultProps} />);

      expect(screen.getByTestId('comparison-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading comparison...')).toBeInTheDocument();
    });

    it('shows error state on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('comparison-error')).toBeInTheDocument();
      });
    });

    it('displays diff table after successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('diff-table')).toBeInTheDocument();
      });
    });
  });

  // AC-4.3.3: Diff clearly shows additions and deletions
  describe('Additions and Deletions Display (AC-4.3.3)', () => {
    it('displays addition and deletion counts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('additions-count')).toHaveTextContent('3 additions');
        expect(screen.getByTestId('deletions-count')).toHaveTextContent('2 deletions');
      });
    });

    it('renders added lines with green styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        const addedLines = screen.getAllByTestId('diff-line-added');
        expect(addedLines.length).toBeGreaterThan(0);
        expect(addedLines[0]).toHaveClass('bg-green-50');
      });
    });

    it('renders removed lines with red styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        const removedLines = screen.getAllByTestId('diff-line-removed');
        expect(removedLines.length).toBeGreaterThan(0);
        expect(removedLines[0]).toHaveClass('bg-red-50');
      });
    });

    it('hides unchanged lines by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('diff-line-unchanged')).not.toBeInTheDocument();
      });
    });

    it('shows unchanged lines when toggled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toggle-unchanged')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('toggle-unchanged'));

      expect(screen.getByTestId('diff-line-unchanged')).toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('does not render when isOpen is false', () => {
      render(<VersionComparisonModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('version-comparison-modal')).not.toBeInTheDocument();
    });

    it('calls onClose when X button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      const onClose = jest.fn();
      render(<VersionComparisonModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('close-comparison-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-comparison-modal'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Close button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      const onClose = jest.fn();
      render(<VersionComparisonModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('close-comparison-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-comparison-button'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility attributes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDiffResult }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      const modal = screen.getByTestId('version-comparison-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Client-Side Diff Calculation', () => {
    it('calculates diff client-side when API returns raw content without diff', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            oldVersion: 1,
            newVersion: 2,
            oldContent: 'Old line',
            newContent: 'New line',
            // No diff array provided
          },
        }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('diff-table')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Diff Handling', () => {
    it('shows message when no changes between versions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            ...mockDiffResult,
            diff: [],
            stats: { additions: 0, deletions: 0, unchanged: 0 },
          },
        }),
      });

      render(<VersionComparisonModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No changes between these versions')).toBeInTheDocument();
      });
    });
  });
});
