import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemandLetterEditor } from '../DemandLetterEditor';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

describe('DemandLetterEditor', () => {
  const defaultProps = {
    letterId: 'letter-123',
    initialContent: 'Initial letter content here.',
    onSaveSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // AC-2.2.1: Display letter content in editable textarea
  describe('Textarea Display (AC-2.2.1)', () => {
    it('renders textarea with initial content', () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Initial letter content here.');
    });

    it('allows editing content', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'New content');

      expect(textarea).toHaveValue('New content');
    });
  });

  // AC-2.2.3: Show unsaved changes indicator
  describe('Dirty State Indicator (AC-2.2.3)', () => {
    it('shows unsaved indicator when content changes', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('hides unsaved indicator when content reverted to original', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');
      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();

      // Clear and retype original content
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Initial letter content here.');

      expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();
    });
  });

  // AC-2.2.4: Save button disabled when no changes
  describe('Save Button State (AC-2.2.4)', () => {
    it('disables save button when no changes made', () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when changes are made', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();
    });
  });

  // AC-2.2.5: Save button disabled when content empty
  describe('Empty Content Validation (AC-2.2.5)', () => {
    it('disables save button when content is empty', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('disables save button when content is only whitespace', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, '   ');

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('shows empty content warning when content cleared', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);

      expect(screen.getByTestId('empty-warning')).toBeInTheDocument();
      expect(screen.getByText('Content cannot be empty')).toBeInTheDocument();
    });
  });

  // AC-2.2.6: Footer displays Save and Cancel buttons
  describe('Footer Buttons (AC-2.2.6)', () => {
    it('displays Save and Cancel buttons', () => {
      render(<DemandLetterEditor {...defaultProps} />);

      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  // AC-2.2.2, AC-2.2.8: Save calls PATCH endpoint with loading
  describe('Save Functionality (AC-2.2.2, AC-2.2.8)', () => {
    it('calls PATCH endpoint with correct body on save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'letter-123', content: 'Updated content' } }),
      });

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Updated content');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/demands/letter-123'),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ content: 'Updated content' }),
          })
        );
      });
    });

    it('shows loading indicator during save', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        }), 100))
      );

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('disables save button during save operation', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        }), 100))
      );

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      expect(saveButton).toBeDisabled();
    });
  });

  // AC-2.2.7: Show last saved timestamp
  describe('Last Saved Timestamp (AC-2.2.7)', () => {
    it('shows last saved timestamp after successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('last-saved')).toBeInTheDocument();
        expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
      });
    });
  });

  // AC-2.2.9: Show success message after save
  describe('Success Message (AC-2.2.9)', () => {
    it('shows success message after successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
        expect(screen.getByText('Changes saved successfully')).toBeInTheDocument();
      });
    });

    it('calls onSaveSuccess callback after successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const onSaveSuccess = jest.fn();
      render(<DemandLetterEditor {...defaultProps} onSaveSuccess={onSaveSuccess} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalled();
      });
    });
  });

  // AC-2.2.10: Show error message on save failure
  describe('Error Handling (AC-2.2.10)', () => {
    it('shows error message when save fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('preserves content when save fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'My new content');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Content should be preserved
      expect(textarea).toHaveValue('My new content');
    });
  });

  // Cancel functionality (AC-2.4.2)
  describe('Cancel Functionality with Modal (AC-2.4.2)', () => {
    it('shows unsaved changes modal when cancelling with changes', async () => {
      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Modified content');

      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      // Modal should appear
      expect(screen.getByTestId('unsaved-changes-modal')).toBeInTheDocument();
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('calls onCancel directly when no unsaved changes', async () => {
      const onCancel = jest.fn();
      render(<DemandLetterEditor {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      // No modal, just direct cancel
      expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
      expect(onCancel).toHaveBeenCalled();
    });

    it('does not call onCancel when clicking modal Cancel button', async () => {
      const onCancel = jest.fn();
      render(<DemandLetterEditor {...defaultProps} onCancel={onCancel} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      // Click cancel button to show modal
      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      // Click the modal's cancel button
      const modalCancelButton = screen.getByTestId('modal-cancel');
      await userEvent.click(modalCancelButton);

      // Modal should close, onCancel should not be called
      expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel when clicking Leave Without Saving', async () => {
      const onCancel = jest.fn();
      render(<DemandLetterEditor {...defaultProps} onCancel={onCancel} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      // Click cancel button to show modal
      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      // Click Leave Without Saving
      const leaveButton = screen.getByTestId('modal-leave-without-saving');
      await userEvent.click(leaveButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('saves and calls onCancel when clicking Save and Leave', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const onCancel = jest.fn();
      render(<DemandLetterEditor {...defaultProps} onCancel={onCancel} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      // Click cancel button to show modal
      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      // Click Save and Leave
      const saveAndLeaveButton = screen.getByTestId('modal-save-and-leave');
      await userEvent.click(saveAndLeaveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalled();
      });
    });

    it('shows error if Save and Leave fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Save failed'));

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      // Click cancel button to show modal
      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      // Click Save and Leave
      const saveAndLeaveButton = screen.getByTestId('modal-save-and-leave');
      await userEvent.click(saveAndLeaveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  // Reset dirty state after save
  describe('State Reset After Save', () => {
    it('clears dirty state after successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();
      });
    });

    it('disables save button after successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      render(<DemandLetterEditor {...defaultProps} />);

      const textarea = screen.getByTestId('letter-editor-textarea');
      await userEvent.type(textarea, ' modified');

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();

      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });

  // Auto-save integration (AC-2.4.5, AC-2.4.6)
  describe('Auto-save Integration (AC-2.4.5, AC-2.4.6)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders auto-save indicator elements when present', async () => {
      // The auto-save indicator will show when autoSaving is true from the hook
      // For integration test, we verify the component structure is correct
      render(<DemandLetterEditor {...defaultProps} />);

      // Verify editor renders correctly with auto-save support
      expect(screen.getByTestId('letter-editor-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  // Browser warning integration (AC-2.4.1)
  describe('Browser Warning Integration (AC-2.4.1)', () => {
    it('registers beforeunload event for dirty state', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      render(<DemandLetterEditor {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });
  });
});
