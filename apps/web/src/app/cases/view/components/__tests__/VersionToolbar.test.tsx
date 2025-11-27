import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VersionToolbar } from '../VersionToolbar';

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

const mockOnVersionChange = jest.fn();

const defaultProps = {
  letterId: 'test-letter-123',
  currentVersion: 2,
  totalVersions: 3,
  onVersionChange: mockOnVersionChange,
};

describe('VersionToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetItem.mockReturnValue('test-token');
  });

  describe('Button Disabled States', () => {
    it('disables Undo button at version 1', () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={1}
          totalVersions={3}
        />
      );

      const undoButton = screen.getByRole('button', { name: /undo/i });
      expect(undoButton).toBeDisabled();
    });

    it('enables Undo button when version > 1', () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={2}
          totalVersions={3}
        />
      );

      const undoButton = screen.getByRole('button', { name: /undo/i });
      expect(undoButton).not.toBeDisabled();
    });

    it('disables Redo button at latest version', () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={3}
          totalVersions={3}
        />
      );

      const redoButton = screen.getByRole('button', { name: /redo/i });
      expect(redoButton).toBeDisabled();
    });

    it('enables Redo button when current version < total versions', () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={2}
          totalVersions={3}
        />
      );

      const redoButton = screen.getByRole('button', { name: /redo/i });
      expect(redoButton).not.toBeDisabled();
    });

    it('disables both buttons when disabled prop is true', () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={2}
          totalVersions={3}
          disabled={true}
        />
      );

      expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
    });
  });

  describe('Version Indicator', () => {
    it('displays correct version indicator', () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={2}
          totalVersions={5}
        />
      );

      expect(screen.getByText('Version 2 of 5')).toBeInTheDocument();
    });

    it('updates version indicator when props change', () => {
      const { rerender } = render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={2}
          totalVersions={5}
        />
      );

      expect(screen.getByText('Version 2 of 5')).toBeInTheDocument();

      rerender(
        <VersionToolbar
          {...defaultProps}
          currentVersion={3}
          totalVersions={5}
        />
      );

      expect(screen.getByText('Version 3 of 5')).toBeInTheDocument();
    });
  });

  describe('Undo Functionality', () => {
    it('calls API when Undo button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            content: 'Previous version content',
            currentVersion: 1,
            totalVersions: 3,
          },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      await userEvent.click(undoButton);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/demands/test-letter-123/undo'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('shows loading state during Undo operation', async () => {
      let resolveUndoRequest: (value: unknown) => void;
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
        resolveUndoRequest = resolve;
      }));

      render(<VersionToolbar {...defaultProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      await userEvent.click(undoButton);

      // Should show loading state
      expect(screen.getByText(/undoing/i)).toBeInTheDocument();

      resolveUndoRequest!({
        ok: true,
        json: () => Promise.resolve({
          data: { content: 'Content', currentVersion: 1, totalVersions: 3 },
        }),
      });

      await waitFor(() => {
        expect(screen.queryByText(/undoing/i)).not.toBeInTheDocument();
      });
    });

    it('calls onVersionChange after successful Undo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            content: 'Previous version content',
            currentVersion: 1,
            totalVersions: 3,
          },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      await userEvent.click(undoButton);

      await waitFor(() => {
        expect(mockOnVersionChange).toHaveBeenCalledWith(
          'Previous version content',
          1,
          3
        );
      });
    });

    it('shows error message on Undo failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Cannot undo - already at first version' },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      await userEvent.click(undoButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot undo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Redo Functionality', () => {
    it('calls API when Redo button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            content: 'Next version content',
            currentVersion: 3,
            totalVersions: 3,
          },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      const redoButton = screen.getByRole('button', { name: /redo/i });
      await userEvent.click(redoButton);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/demands/test-letter-123/redo'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('shows loading state during Redo operation', async () => {
      let resolveRedoRequest: (value: unknown) => void;
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
        resolveRedoRequest = resolve;
      }));

      render(<VersionToolbar {...defaultProps} />);

      const redoButton = screen.getByRole('button', { name: /redo/i });
      await userEvent.click(redoButton);

      // Should show loading state
      expect(screen.getByText(/redoing/i)).toBeInTheDocument();

      resolveRedoRequest!({
        ok: true,
        json: () => Promise.resolve({
          data: { content: 'Content', currentVersion: 3, totalVersions: 3 },
        }),
      });

      await waitFor(() => {
        expect(screen.queryByText(/redoing/i)).not.toBeInTheDocument();
      });
    });

    it('calls onVersionChange after successful Redo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            content: 'Next version content',
            currentVersion: 3,
            totalVersions: 3,
          },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      const redoButton = screen.getByRole('button', { name: /redo/i });
      await userEvent.click(redoButton);

      await waitFor(() => {
        expect(mockOnVersionChange).toHaveBeenCalledWith(
          'Next version content',
          3,
          3
        );
      });
    });

    it('shows error message on Redo failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Cannot redo - already at latest version' },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      const redoButton = screen.getByRole('button', { name: /redo/i });
      await userEvent.click(redoButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot redo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Button Disabled During Operations', () => {
    it('disables both buttons during Undo operation', async () => {
      let resolveUndoRequest: (value: unknown) => void;
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
        resolveUndoRequest = resolve;
      }));

      render(<VersionToolbar {...defaultProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      await userEvent.click(undoButton);

      // Both should be disabled during operation
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();

      resolveUndoRequest!({
        ok: true,
        json: () => Promise.resolve({
          data: { content: 'Content', currentVersion: 1, totalVersions: 3 },
        }),
      });
    });

    it('disables both buttons during Redo operation', async () => {
      let resolveRedoRequest: (value: unknown) => void;
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
        resolveRedoRequest = resolve;
      }));

      render(<VersionToolbar {...defaultProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      await userEvent.click(redoButton);

      // Both should be disabled during operation
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();

      resolveRedoRequest!({
        ok: true,
        json: () => Promise.resolve({
          data: { content: 'Content', currentVersion: 3, totalVersions: 3 },
        }),
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('triggers Undo with Ctrl+Z', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { content: 'Previous content', currentVersion: 1, totalVersions: 3 },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      // Simulate Ctrl+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/undo'),
          expect.anything()
        );
      });
    });

    it('triggers Redo with Ctrl+Shift+Z', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { content: 'Next content', currentVersion: 3, totalVersions: 3 },
        }),
      });

      render(<VersionToolbar {...defaultProps} />);

      // Simulate Ctrl+Shift+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/redo'),
          expect.anything()
        );
      });
    });

    it('does not trigger Undo with Ctrl+Z when at version 1', async () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={1}
          totalVersions={3}
        />
      );

      // Simulate Ctrl+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

      // Should not call fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not trigger Redo with Ctrl+Shift+Z when at latest version', async () => {
      render(
        <VersionToolbar
          {...defaultProps}
          currentVersion={3}
          totalVersions={3}
        />
      );

      // Simulate Ctrl+Shift+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

      // Should not call fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
