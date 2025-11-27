import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefinementPanel, RefinementResult } from '../RefinementPanel';

// Mock localStorage
const mockGetItem = jest.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

const mockOnRefine = jest.fn();
const mockOnAccept = jest.fn();
const mockOnReject = jest.fn();

const mockRefinementResult: RefinementResult = {
  id: 'refined-letter-123',
  content: 'Refined content here',
  version: 2,
  previousVersion: 1,
  refinementInstruction: 'Make it professional',
  complianceResult: {
    isCompliant: true,
    score: 92,
    checks: [],
  },
  diff: {
    additions: 5,
    deletions: 2,
  },
  warnings: [],
};

const defaultProps = {
  letterId: 'test-letter-123',
  originalContent: 'Original letter content here',
  onRefine: mockOnRefine,
  onAccept: mockOnAccept,
  onReject: mockOnReject,
};

describe('RefinementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetItem.mockReturnValue('test-token');
    mockOnRefine.mockReset();
  });

  describe('Instruction Input Validation', () => {
    it('validates minimum 1 character - Refine button disabled when empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      expect(refineButton).toBeDisabled();
    });

    it('validates minimum 1 character - Refine button disabled with only whitespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, '   ');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      expect(refineButton).toBeDisabled();
    });

    it('validates maximum 1000 characters - Refine button disabled when over limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      const longText = 'a'.repeat(1001);

      fireEvent.change(textarea, { target: { value: longText } });

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      expect(refineButton).toBeDisabled();

      expect(screen.getByText('1001/1000')).toHaveClass('text-red-600');
    });

    it('enables Refine button with valid input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it more formal');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      expect(refineButton).not.toBeDisabled();
    });
  });

  describe('Character Count Display', () => {
    it('displays character count correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('0/1000')).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Hello');

      expect(screen.getByText('5/1000')).toBeInTheDocument();
    });

    it('shows character count in red when over limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      const longText = 'a'.repeat(1001);

      fireEvent.change(textarea, { target: { value: longText } });

      const charCount = screen.getByText('1001/1000');
      expect(charCount).toHaveClass('text-red-600');
    });

    it('shows character count in gray when within limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Hello');

      const charCount = screen.getByText('5/1000');
      expect(charCount).toHaveClass('text-gray-500');
    });
  });

  describe('Suggestions Loading', () => {
    it('loads suggestions from API on mount', async () => {
      const mockSuggestions = ['Suggestion 1', 'Suggestion 2'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions }),
      });

      render(<RefinementPanel {...defaultProps} />);

      expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
        expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/demands/refinement-suggestions'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('shows default suggestions on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Make tone more professional')).toBeInTheDocument();
      expect(screen.getByText('Simplify language for readability')).toBeInTheDocument();
      expect(screen.getByText('Emphasize dispute rights')).toBeInTheDocument();
      expect(screen.getByText('Strengthen payment urgency')).toBeInTheDocument();
    });

    it('shows default suggestions when API returns empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Make tone more professional')).toBeInTheDocument();
    });
  });

  describe('Suggestion Click Behavior', () => {
    it('clicking suggestion populates the instruction input', async () => {
      const mockSuggestions = ['Make it formal', 'Add urgency'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Make it formal')).toBeInTheDocument();
      });

      const suggestionButton = screen.getByText('Make it formal');
      await userEvent.click(suggestionButton);

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      expect(textarea).toHaveValue('Make it formal');
    });

    it('enables Refine button after clicking suggestion', async () => {
      const mockSuggestions = ['Make it formal'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions }),
      });

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Make it formal')).toBeInTheDocument();
      });

      const suggestionButton = screen.getByText('Make it formal');
      await userEvent.click(suggestionButton);

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      expect(refineButton).not.toBeDisabled();
    });
  });

  describe('Refinement State Management', () => {
    it('shows loading state during refinement with "Refining..." text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      let resolveRefine: (result: RefinementResult) => void;
      mockOnRefine.mockImplementationOnce(() => new Promise<RefinementResult>((resolve) => {
        resolveRefine = resolve;
      }));

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      // Should show loading state
      expect(screen.getByText(/refining your letter/i)).toBeInTheDocument();
      expect(screen.getByText(/this may take up to 30 seconds/i)).toBeInTheDocument();

      resolveRefine!(mockRefinementResult);

      await waitFor(() => {
        expect(screen.queryByText(/refining your letter/i)).not.toBeInTheDocument();
      });
    });

    it('displays warnings in yellow banner when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      const resultWithWarnings: RefinementResult = {
        ...mockRefinementResult,
        warnings: ['Some informal phrases may still remain', 'Consider adding more details'],
      };

      mockOnRefine.mockResolvedValueOnce(resultWithWarnings);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByText('AI Warnings')).toBeInTheDocument();
        expect(screen.getByText('Some informal phrases may still remain')).toBeInTheDocument();
        expect(screen.getByText('Consider adding more details')).toBeInTheDocument();
      });
    });

    it('shows error state with retry button on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockRejectedValueOnce(new Error('Failed to refine letter'));

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByText('Refinement Failed')).toBeInTheDocument();
        expect(screen.getByText('Failed to refine letter')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retry button restores instruction and allows retry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      let refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      // Should restore the instruction
      await waitFor(() => {
        const restoredTextarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
        expect(restoredTextarea).toHaveValue('Make it professional');
      });
    });

    it('shows instruction used above diff in results view', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByText('Refinement Results')).toBeInTheDocument();
        expect(screen.getByText(/instruction/i)).toBeInTheDocument();
        expect(screen.getByText(/"Make it professional"/)).toBeInTheDocument();
      });
    });

    it('disables further refinement while results are being reviewed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByText('Refinement Results')).toBeInTheDocument();
      });

      // Should show Accept/Reject buttons instead of Refine
      expect(screen.queryByRole('button', { name: /refine letter/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /accept changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject changes/i })).toBeInTheDocument();
    });
  });

  describe('Accept/Reject Functionality', () => {
    it('calls onAccept when Accept Changes is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept changes/i })).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole('button', { name: /accept changes/i });
      await userEvent.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalledWith(mockRefinementResult);
    });

    it('calls onReject when Reject Changes is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject changes/i })).toBeInTheDocument();
      });

      const rejectButton = screen.getByRole('button', { name: /reject changes/i });
      await userEvent.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables all controls when disabled prop is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: ['Suggestion 1'] }),
      });

      render(<RefinementPanel {...defaultProps} disabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      expect(textarea).toBeDisabled();

      const suggestionButton = screen.getByText('Suggestion 1');
      expect(suggestionButton).toBeDisabled();

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      expect(refineButton).toBeDisabled();
    });
  });

  describe('Grid Layout', () => {
    it('displays suggestions in a grid layout', async () => {
      const mockSuggestions = ['Suggestion 1', 'Suggestion 2', 'Suggestion 3', 'Suggestion 4'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions }),
      });

      const { container } = render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
      });

      const gridContainer = container.querySelector('.grid.grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Accept Loading State', () => {
    it('shows loading state during accept operation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      let resolveAccept: () => void;
      const asyncOnAccept = jest.fn(() => new Promise<void>((resolve) => {
        resolveAccept = resolve;
      }));

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} onAccept={asyncOnAccept} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept changes/i })).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole('button', { name: /accept changes/i });
      await userEvent.click(acceptButton);

      // Should show loading state
      expect(screen.getByText('Accepting...')).toBeInTheDocument();

      resolveAccept!();

      await waitFor(() => {
        expect(screen.queryByText('Accepting...')).not.toBeInTheDocument();
      });
    });

    it('disables buttons during accept operation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      let resolveAccept: () => void;
      const asyncOnAccept = jest.fn(() => new Promise<void>((resolve) => {
        resolveAccept = resolve;
      }));

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} onAccept={asyncOnAccept} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept changes/i })).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole('button', { name: /accept changes/i });
      await userEvent.click(acceptButton);

      // Both buttons should be disabled
      expect(acceptButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /reject changes/i })).toBeDisabled();

      resolveAccept!();
    });
  });

  describe('Reject Confirmation Modal', () => {
    const mockBeforeCompliance = {
      isCompliant: false,
      score: 70,
      checks: [
        { id: 'check-1', name: 'Dispute Rights', passed: false },
      ],
    };

    const mockResultWithSignificantImprovement: RefinementResult = {
      ...mockRefinementResult,
      complianceResult: {
        isCompliant: true,
        score: 85, // 15% improvement (significant)
        checks: [
          { id: 'check-1', name: 'Dispute Rights', passed: true },
        ],
      },
    };

    const mockResultWithSmallImprovement: RefinementResult = {
      ...mockRefinementResult,
      complianceResult: {
        isCompliant: true,
        score: 75, // 5% improvement (not significant)
        checks: [],
      },
    };

    it('shows confirmation modal when rejecting significant improvement (>= 10%)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockResultWithSignificantImprovement);

      render(
        <RefinementPanel
          {...defaultProps}
          beforeCompliance={mockBeforeCompliance}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject changes/i })).toBeInTheDocument();
      });

      const rejectButton = screen.getByRole('button', { name: /reject changes/i });
      await userEvent.click(rejectButton);

      // Should show confirmation modal
      expect(screen.getByText('Reject Improved Content?')).toBeInTheDocument();
      expect(screen.getByText(/higher compliance score/)).toBeInTheDocument();
      expect(screen.getByText('+15%')).toBeInTheDocument();
    });

    it('does not show confirmation when improvement is small (< 10%)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockResultWithSmallImprovement);

      render(
        <RefinementPanel
          {...defaultProps}
          beforeCompliance={mockBeforeCompliance}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject changes/i })).toBeInTheDocument();
      });

      const rejectButton = screen.getByRole('button', { name: /reject changes/i });
      await userEvent.click(rejectButton);

      // Should NOT show confirmation modal
      expect(screen.queryByText('Reject Improved Content?')).not.toBeInTheDocument();
      // Should call onReject directly
      expect(mockOnReject).toHaveBeenCalled();
    });

    it('confirmation modal "Yes, Reject" button rejects changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockResultWithSignificantImprovement);

      render(
        <RefinementPanel
          {...defaultProps}
          beforeCompliance={mockBeforeCompliance}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject changes/i })).toBeInTheDocument();
      });

      const rejectButton = screen.getByRole('button', { name: /reject changes/i });
      await userEvent.click(rejectButton);

      const confirmRejectButton = screen.getByRole('button', { name: /yes, reject/i });
      await userEvent.click(confirmRejectButton);

      expect(mockOnReject).toHaveBeenCalled();
      // Modal should be closed and back to idle state
      expect(screen.queryByText('Reject Improved Content?')).not.toBeInTheDocument();
    });

    it('confirmation modal "Cancel" button closes modal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockResultWithSignificantImprovement);

      render(
        <RefinementPanel
          {...defaultProps}
          beforeCompliance={mockBeforeCompliance}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject changes/i })).toBeInTheDocument();
      });

      const rejectButton = screen.getByRole('button', { name: /reject changes/i });
      await userEvent.click(rejectButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      // Modal should be closed but results still visible
      expect(screen.queryByText('Reject Improved Content?')).not.toBeInTheDocument();
      expect(mockOnReject).not.toHaveBeenCalled();
      expect(screen.getByText('Refinement Results')).toBeInTheDocument();
    });
  });

  describe('Compliance Comparison Integration', () => {
    const mockBeforeCompliance = {
      isCompliant: false,
      score: 75,
      checks: [
        { id: 'check-1', name: 'Dispute Rights', passed: false },
        { id: 'check-2', name: 'Clear Language', passed: true },
      ],
    };

    const mockResultWithCompliance: RefinementResult = {
      ...mockRefinementResult,
      complianceResult: {
        isCompliant: true,
        score: 92,
        checks: [
          { id: 'check-1', name: 'Dispute Rights', passed: true },
          { id: 'check-2', name: 'Clear Language', passed: true },
        ],
      },
    };

    it('shows ComplianceComparison when beforeCompliance is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockResultWithCompliance);

      render(
        <RefinementPanel
          {...defaultProps}
          beforeCompliance={mockBeforeCompliance}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByText('Compliance Impact')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
      });
    });

    it('shows simple compliance score when beforeCompliance is not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      mockOnRefine.mockResolvedValueOnce(mockRefinementResult);

      render(<RefinementPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading suggestions...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe how you'd like to refine/i);
      await userEvent.type(textarea, 'Make it professional');

      const refineButton = screen.getByRole('button', { name: /refine letter/i });
      await userEvent.click(refineButton);

      await waitFor(() => {
        expect(screen.getByText('Refinement Results')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
      });

      // Should NOT show Compliance Impact (comparison view)
      expect(screen.queryByText('Compliance Impact')).not.toBeInTheDocument();
    });
  });
});
