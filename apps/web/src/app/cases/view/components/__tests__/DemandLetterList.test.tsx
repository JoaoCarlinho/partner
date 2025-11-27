import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemandLetterList, formatDate, getRelativeTime, sortLetters, truncateText, DemandLetter, SortConfig } from '../DemandLetterList';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockLetters: DemandLetter[] = [
  {
    id: 'letter-001',
    caseId: 'case-123',
    content: 'Test letter content 1',
    status: 'DRAFT',
    currentVersion: 1,
    complianceResult: { isCompliant: true, score: 85, checks: [] },
    createdAt: '2025-11-26T10:00:00Z',
    updatedAt: '2025-11-26T12:00:00Z',
    template: { id: 'tmpl-1', name: 'Standard Template' },
  },
  {
    id: 'letter-002',
    caseId: 'case-123',
    content: 'Test letter content 2',
    status: 'PENDING_REVIEW',
    currentVersion: 2,
    complianceResult: { isCompliant: true, score: 90, checks: [] },
    createdAt: '2025-11-25T10:00:00Z',
    updatedAt: '2025-11-25T14:00:00Z',
  },
];

describe('DemandLetterList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Loading State', () => {
    it('shows loading spinner and text initially (AC-X.1)', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<DemandLetterList caseId="case-123" />);

      expect(screen.getByText('Loading demand letters...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders list of letters with correct data (AC-1.1.1)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        // Both letters render - check for role buttons (excluding sort header buttons)
        const letterRows = screen.getAllByRole('button').filter(
          (btn) => btn.getAttribute('tabindex') === '0'
        );
        expect(letterRows).toHaveLength(2);
      });

      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
    });

    it('sorts letters by creation date descending by default (AC-1.1.4, AC-1.2.5)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        const letterRows = screen.getAllByRole('button').filter(
          (btn) => btn.getAttribute('tabindex') === '0'
        );
        // First letter (newer - Nov 26) should appear first with DRAFT status
        // Second letter (older - Nov 25) has PENDING_REVIEW status
        expect(letterRows[0]).toHaveTextContent('Draft');
        expect(letterRows[0]).toHaveTextContent('Nov 26, 2025');
        expect(letterRows[1]).toHaveTextContent('Pending Review');
        expect(letterRows[1]).toHaveTextContent('Nov 25, 2025');
      });
    });

    it('displays version badge on each letter (AC-1.2.1)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.getByText('v2')).toBeInTheDocument();
      });
    });

    it('displays template name when template exists (AC-1.3.1)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('Standard Template')).toBeInTheDocument();
      });
    });

    it('displays "Custom letter" when template is missing (AC-1.3.2)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        // Letter 002 has no template
        expect(screen.getByText('Custom letter')).toBeInTheDocument();
      });
    });

    it('has title attribute for template tooltip (AC-1.3.3)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        const templateText = screen.getByText('Standard Template');
        expect(templateText).toHaveAttribute('title', 'Standard Template');
      });
    });

    it('truncates long template names (AC-1.3.3)', async () => {
      const lettersWithLongTemplate: DemandLetter[] = [{
        ...mockLetters[0],
        template: { id: 'tmpl-1', name: 'This is a very long template name that exceeds thirty characters' },
      }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: lettersWithLongTemplate }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        // Should be truncated to 30 chars total (27 chars + "...")
        expect(screen.getByText('This is a very long templat...')).toBeInTheDocument();
        // Full name should be in title attribute
        expect(screen.getByTitle('This is a very long template name that exceeds thirty characters')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty message and CTA when no letters exist (AC-1.1.5)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const onGenerateLetter = jest.fn();
      render(
        <DemandLetterList caseId="case-123" onGenerateLetter={onGenerateLetter} />
      );

      await waitFor(() => {
        expect(screen.getByText('No demand letters yet')).toBeInTheDocument();
      });

      const generateButton = screen.getByText('Generate Letter');
      expect(generateButton).toBeInTheDocument();

      await userEvent.click(generateButton);
      expect(onGenerateLetter).toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('shows error message and retry button on failure (AC-X.2)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch demand letters')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('retries fetch when retry button is clicked', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockLetters }),
        });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        const letterRows = screen.getAllByRole('button').filter(
          (btn) => btn.getAttribute('tabindex') === '0'
        );
        expect(letterRows).toHaveLength(2);
      });
    });
  });

  describe('Sorting (Story 1.2)', () => {
    it('displays sort headers for Date and Status (AC-1.2.2, AC-1.2.3)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('shows chevron down icon for default sort (createdAt desc) (AC-1.2.4)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('sorted descending')).toBeInTheDocument();
      });
    });

    it('toggles sort direction when clicking Date header (AC-1.2.2)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
      });

      // Click Date header to toggle to ascending
      await userEvent.click(screen.getByText('Date'));

      await waitFor(() => {
        expect(screen.getByLabelText('sorted ascending')).toBeInTheDocument();
      });

      // Check that order is now reversed (oldest first)
      const letterRows = screen.getAllByRole('button').filter(
        (btn) => btn.getAttribute('tabindex') === '0'
      );
      expect(letterRows[0]).toHaveTextContent('Pending Review');
      expect(letterRows[1]).toHaveTextContent('Draft');
    });

    it('sorts by status alphabetically when clicking Status header (AC-1.2.3)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      // Click Status header to sort by status
      await userEvent.click(screen.getByText('Status'));

      await waitFor(() => {
        // Status header should now show sort indicator
        const statusButton = screen.getByText('Status').closest('button');
        expect(statusButton).toContainElement(screen.getByLabelText('sorted descending'));
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to detail view on letter click (AC-X.3)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        const letterRows = screen.getAllByRole('button').filter(
          (btn) => btn.getAttribute('tabindex') === '0'
        );
        expect(letterRows).toHaveLength(2);
      });

      const letterRows = screen.getAllByRole('button').filter(
        (btn) => btn.getAttribute('tabindex') === '0'
      );
      await userEvent.click(letterRows[0]);

      expect(mockPush).toHaveBeenCalledWith(
        '/cases/view?id=case-123&letterId=letter-001'
      );
    });

    it('navigates on Enter key press (AC-X.4)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        const letterRows = screen.getAllByRole('button').filter(
          (btn) => btn.getAttribute('tabindex') === '0'
        );
        expect(letterRows).toHaveLength(2);
      });

      const letterRows = screen.getAllByRole('button').filter(
        (btn) => btn.getAttribute('tabindex') === '0'
      );
      fireEvent.keyDown(letterRows[0], { key: 'Enter' });

      expect(mockPush).toHaveBeenCalledWith(
        '/cases/view?id=case-123&letterId=letter-001'
      );
    });

    it('has proper accessibility attributes (AC-X.4)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLetters }),
      });

      render(<DemandLetterList caseId="case-123" />);

      await waitFor(() => {
        const letterRows = screen.getAllByRole('button').filter(
          (btn) => btn.getAttribute('tabindex') === '0'
        );
        letterRows.forEach((row) => {
          expect(row).toHaveAttribute('tabIndex', '0');
        });
      });
    });
  });
});

describe('sortLetters utility function', () => {
  it('sorts by createdAt descending (newest first)', () => {
    const config: SortConfig = { field: 'createdAt', direction: 'desc' };
    const sorted = sortLetters(mockLetters, config);

    expect(sorted[0].id).toBe('letter-001'); // Nov 26
    expect(sorted[1].id).toBe('letter-002'); // Nov 25
  });

  it('sorts by createdAt ascending (oldest first)', () => {
    const config: SortConfig = { field: 'createdAt', direction: 'asc' };
    const sorted = sortLetters(mockLetters, config);

    expect(sorted[0].id).toBe('letter-002'); // Nov 25
    expect(sorted[1].id).toBe('letter-001'); // Nov 26
  });

  it('sorts by status alphabetically descending', () => {
    const config: SortConfig = { field: 'status', direction: 'desc' };
    const sorted = sortLetters(mockLetters, config);

    // PENDING_REVIEW > DRAFT alphabetically, so desc puts P first
    expect(sorted[0].status).toBe('PENDING_REVIEW');
    expect(sorted[1].status).toBe('DRAFT');
  });

  it('sorts by status alphabetically ascending', () => {
    const config: SortConfig = { field: 'status', direction: 'asc' };
    const sorted = sortLetters(mockLetters, config);

    // DRAFT < PENDING_REVIEW alphabetically
    expect(sorted[0].status).toBe('DRAFT');
    expect(sorted[1].status).toBe('PENDING_REVIEW');
  });

  it('does not mutate original array', () => {
    const original = [...mockLetters];
    const config: SortConfig = { field: 'createdAt', direction: 'asc' };
    sortLetters(mockLetters, config);

    expect(mockLetters).toEqual(original);
  });
});

describe('truncateText utility function', () => {
  it('returns original string if under limit', () => {
    expect(truncateText('Short', 30)).toBe('Short');
  });

  it('truncates string and adds ellipsis when over limit', () => {
    const longText = 'This is a very long template name that exceeds thirty characters';
    // 30 chars total: 27 chars + "..."
    expect(truncateText(longText, 30)).toBe('This is a very long templat...');
  });

  it('returns empty string for null', () => {
    expect(truncateText(null, 30)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncateText(undefined, 30)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(truncateText('', 30)).toBe('');
  });

  it('returns original if exactly at limit', () => {
    const exactText = '123456789012345678901234567890'; // exactly 30 chars
    expect(truncateText(exactText, 30)).toBe(exactText);
  });

  it('uses default maxLength of 30', () => {
    const longText = 'This is a very long template name that exceeds thirty characters';
    expect(truncateText(longText)).toBe('This is a very long templat...');
  });
});

describe('Date Formatting Utilities', () => {
  describe('formatDate', () => {
    it('formats date as "Nov 26, 2025"', () => {
      expect(formatDate('2025-11-26T10:00:00Z')).toBe('Nov 26, 2025');
    });

    it('formats different dates correctly', () => {
      expect(formatDate('2025-01-15T10:00:00Z')).toBe('Jan 15, 2025');
      expect(formatDate('2025-12-31T10:00:00Z')).toBe('Dec 31, 2025');
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-11-26T14:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns "just now" for very recent times', () => {
      expect(getRelativeTime('2025-11-26T14:00:00Z')).toBe('just now');
    });

    it('returns minutes ago for times within an hour', () => {
      expect(getRelativeTime('2025-11-26T13:30:00Z')).toBe('30 minutes ago');
      expect(getRelativeTime('2025-11-26T13:59:00Z')).toBe('1 minute ago');
    });

    it('returns hours ago for times within a day', () => {
      expect(getRelativeTime('2025-11-26T12:00:00Z')).toBe('2 hours ago');
      expect(getRelativeTime('2025-11-26T13:00:00Z')).toBe('1 hour ago');
    });

    it('returns days ago for older times', () => {
      expect(getRelativeTime('2025-11-25T14:00:00Z')).toBe('1 day ago');
      expect(getRelativeTime('2025-11-24T14:00:00Z')).toBe('2 days ago');
    });

    it('returns formatted date for times older than 30 days', () => {
      expect(getRelativeTime('2025-10-01T10:00:00Z')).toBe('Oct 1, 2025');
    });
  });
});
