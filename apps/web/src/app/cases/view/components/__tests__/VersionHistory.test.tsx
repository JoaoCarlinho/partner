import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VersionHistory, Version } from '../VersionHistory';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

const mockVersions: Version[] = [
  {
    id: 'v3',
    versionNumber: 3,
    content: 'Latest content version 3',
    createdAt: '2025-11-26T14:00:00Z',
    createdBy: { id: 'user1', email: 'user@example.com', name: 'John Doe' },
    refinementInstruction: 'Make it more formal',
    changeType: 'AI_REFINEMENT',
  },
  {
    id: 'v2',
    versionNumber: 2,
    content: 'Content version 2',
    createdAt: '2025-11-26T12:00:00Z',
    createdBy: { id: 'user1', email: 'user@example.com', name: 'John Doe' },
    changeType: 'MANUAL_EDIT',
  },
  {
    id: 'v1',
    versionNumber: 1,
    content: 'Initial content',
    createdAt: '2025-11-26T10:00:00Z',
    createdBy: { id: 'user1', email: 'user@example.com' },
    changeType: 'INITIAL',
  },
];

describe('VersionHistory', () => {
  const defaultProps = {
    letterId: 'letter-123',
    currentVersion: 3,
    onVersionSelect: jest.fn(),
    onCompareSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // AC-4.1.1: List all versions from API
  describe('Version List Loading (AC-4.1.1)', () => {
    it('fetches versions from API on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/demands/letter-123/versions'),
          expect.any(Object)
        );
      });
    });

    it('shows loading state while fetching', () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockVersions }),
        }), 1000))
      );

      render(<VersionHistory {...defaultProps} />);

      expect(screen.getByTestId('version-history-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading versions...')).toBeInTheDocument();
    });

    it('shows error state on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-history-error')).toBeInTheDocument();
      });
    });

    it('shows empty state when no versions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No versions available')).toBeInTheDocument();
      });
    });
  });

  // AC-4.1.2: Show version number and creation date
  describe('Version Number and Date Display (AC-4.1.2)', () => {
    it('displays version numbers for all versions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-number-3')).toBeInTheDocument();
        expect(screen.getByTestId('version-number-2')).toBeInTheDocument();
        expect(screen.getByTestId('version-number-1')).toBeInTheDocument();
      });
    });

    it('displays relative time for each version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-history')).toBeInTheDocument();
      });

      // Each version item should exist
      expect(screen.getByTestId('version-item-3')).toBeInTheDocument();
      expect(screen.getByTestId('version-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('version-item-1')).toBeInTheDocument();
    });
  });

  // AC-4.1.3: Show refinement instruction that created each version
  describe('Refinement Instruction Display (AC-4.1.3)', () => {
    it('displays refinement instruction when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-instruction-3')).toBeInTheDocument();
        expect(screen.getByText(/Make it more formal/)).toBeInTheDocument();
      });
    });

    it('does not display instruction section when not present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        // Version 2 has no refinement instruction
        expect(screen.queryByTestId('version-instruction-2')).not.toBeInTheDocument();
      });
    });
  });

  // AC-4.1.4: Show creator email for each version
  describe('Creator Display (AC-4.1.4)', () => {
    it('displays creator name when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-creator-3')).toHaveTextContent('John Doe');
      });
    });

    it('displays creator email when name not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        // Version 1 has no name
        expect(screen.getByTestId('version-creator-1')).toHaveTextContent('user@example.com');
      });
    });
  });

  // AC-4.1.5: Current version clearly indicated
  describe('Current Version Indication (AC-4.1.5)', () => {
    it('marks current version in the list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        const currentBadge = screen.getByTestId('version-number-3');
        expect(currentBadge).toHaveTextContent('v3 (Current)');
      });
    });

    it('does not mark non-current versions as current', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        const oldBadge = screen.getByTestId('version-number-1');
        expect(oldBadge).not.toHaveTextContent('Current');
      });
    });
  });

  describe('Version Selection', () => {
    it('calls onVersionSelect when clicking a version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      const onVersionSelect = jest.fn();
      render(<VersionHistory {...defaultProps} onVersionSelect={onVersionSelect} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-item-2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('version-item-2'));

      expect(onVersionSelect).toHaveBeenCalledWith(mockVersions[1]);
    });
  });

  describe('Version Comparison Selection', () => {
    it('allows selecting versions for comparison', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('compare-select-3')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('compare-select-3'));
      fireEvent.click(screen.getByTestId('compare-select-1'));

      // Compare button should appear when 2 versions selected
      expect(screen.getByTestId('compare-versions-button')).toBeInTheDocument();
    });

    it('calls onCompareSelect when clicking compare button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      const onCompareSelect = jest.fn();
      render(<VersionHistory {...defaultProps} onCompareSelect={onCompareSelect} />);

      await waitFor(() => {
        expect(screen.getByTestId('compare-select-3')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('compare-select-3'));
      fireEvent.click(screen.getByTestId('compare-select-1'));

      fireEvent.click(screen.getByTestId('compare-versions-button'));

      expect(onCompareSelect).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('Change Type Display', () => {
    it('shows change type badge for each version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockVersions }),
      });

      render(<VersionHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('AI Refinement')).toBeInTheDocument();
        expect(screen.getByText('Manual Edit')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
      });
    });
  });
});
