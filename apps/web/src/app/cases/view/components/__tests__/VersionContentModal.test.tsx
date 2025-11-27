import { render, screen, fireEvent } from '@testing-library/react';
import { VersionContentModal } from '../VersionContentModal';
import { Version } from '../VersionHistory';

const mockVersion: Version = {
  id: 'v2',
  versionNumber: 2,
  content: 'This is the content of version 2.\n\nIt has multiple paragraphs.',
  createdAt: '2025-11-26T12:00:00Z',
  createdBy: { id: 'user1', email: 'user@example.com', name: 'John Doe' },
  refinementInstruction: 'Make it more professional',
  changeType: 'AI_REFINEMENT',
};

describe('VersionContentModal', () => {
  const defaultProps = {
    version: mockVersion,
    currentVersion: 3,
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC-4.2.1: Click to view any version's content
  describe('Version Content Display (AC-4.2.1)', () => {
    it('displays version content when modal is open', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByTestId('version-content')).toBeInTheDocument();
      expect(screen.getByText(/This is the content of version 2/)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<VersionContentModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('version-content-modal')).not.toBeInTheDocument();
    });

    it('does not render when version is null', () => {
      render(<VersionContentModal {...defaultProps} version={null} />);

      expect(screen.queryByTestId('version-content-modal')).not.toBeInTheDocument();
    });
  });

  // AC-4.2.2: Content displays in read-only mode
  describe('Read-Only Mode (AC-4.2.2)', () => {
    it('shows read-only indication', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByText('(Read-only)')).toBeInTheDocument();
    });

    it('content area is not editable', () => {
      render(<VersionContentModal {...defaultProps} />);

      const contentArea = screen.getByTestId('version-content');
      expect(contentArea.tagName).not.toBe('TEXTAREA');
      expect(contentArea.tagName).not.toBe('INPUT');
    });
  });

  // AC-4.2.3: Clear indication of which version is being viewed
  describe('Version Indication (AC-4.2.3)', () => {
    it('displays version number in header', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    it('shows "Historical Version" badge for non-current versions', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByText('Historical Version')).toBeInTheDocument();
    });

    it('shows "Current Version" badge when viewing current version', () => {
      render(<VersionContentModal {...defaultProps} currentVersion={2} />);

      expect(screen.getByText('Current Version')).toBeInTheDocument();
    });
  });

  describe('Version Metadata', () => {
    it('displays creation date', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByTestId('version-modal-date')).toBeInTheDocument();
    });

    it('displays creator name', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByTestId('version-modal-creator')).toHaveTextContent('John Doe');
    });

    it('displays refinement instruction when present', () => {
      render(<VersionContentModal {...defaultProps} />);

      expect(screen.getByTestId('version-modal-instruction')).toBeInTheDocument();
      expect(screen.getByText(/Make it more professional/)).toBeInTheDocument();
    });

    it('does not show instruction when not present', () => {
      const versionWithoutInstruction = { ...mockVersion, refinementInstruction: undefined };
      render(<VersionContentModal {...defaultProps} version={versionWithoutInstruction} />);

      expect(screen.queryByTestId('version-modal-instruction')).not.toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('calls onClose when X button is clicked', () => {
      const onClose = jest.fn();
      render(<VersionContentModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('close-version-modal'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Close button is clicked', () => {
      const onClose = jest.fn();
      render(<VersionContentModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('close-version-modal-button'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility attributes', () => {
      render(<VersionContentModal {...defaultProps} />);

      const modal = screen.getByTestId('version-content-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Empty Content Handling', () => {
    it('shows message when content is empty', () => {
      const emptyVersion = { ...mockVersion, content: '' };
      render(<VersionContentModal {...defaultProps} version={emptyVersion} />);

      expect(screen.getByText('No content available for this version')).toBeInTheDocument();
    });
  });
});
