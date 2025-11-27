import { render, screen, fireEvent } from '@testing-library/react';
import { DiffViewer, computeDiff, getDiffLineClass, getDiffStats } from '../DiffViewer';

describe('DiffViewer', () => {
  const originalContent = `Dear John,
We are writing to inform you about your debt.
Please contact us at your earliest convenience.
Sincerely,
Collections Team`;

  const refinedContent = `Dear Mr. Doe,
We are formally notifying you regarding your outstanding obligation.
Please contact us at your earliest convenience.
We expect to hear from you within 30 days.
Sincerely,
Collections Team`;

  describe('computeDiff', () => {
    it('identifies additions correctly', () => {
      const original = 'Line 1\nLine 2';
      const refined = 'Line 1\nLine 2\nLine 3';

      const diff = computeDiff(original, refined);

      const additions = diff.filter((line) => line.type === 'add');
      expect(additions).toHaveLength(1);
      expect(additions[0].content).toBe('Line 3');
    });

    it('identifies deletions correctly', () => {
      const original = 'Line 1\nLine 2\nLine 3';
      const refined = 'Line 1\nLine 3';

      const diff = computeDiff(original, refined);

      const deletions = diff.filter((line) => line.type === 'remove');
      expect(deletions).toHaveLength(1);
      expect(deletions[0].content).toBe('Line 2');
    });

    it('identifies unchanged lines correctly', () => {
      const original = 'Line 1\nLine 2';
      const refined = 'Line 1\nLine 2';

      const diff = computeDiff(original, refined);

      expect(diff.every((line) => line.type === 'unchanged')).toBe(true);
    });

    it('handles mixed changes', () => {
      const original = 'A\nB\nC';
      const refined = 'A\nD\nC';

      const diff = computeDiff(original, refined);

      expect(diff).toContainEqual(expect.objectContaining({ type: 'remove', content: 'B' }));
      expect(diff).toContainEqual(expect.objectContaining({ type: 'add', content: 'D' }));
      expect(diff.filter((l) => l.type === 'unchanged')).toHaveLength(2);
    });
  });

  describe('getDiffLineClass', () => {
    it('returns green background class for additions', () => {
      const className = getDiffLineClass('add');
      expect(className).toContain('bg-green-100');
      expect(className).toContain('text-green-800');
    });

    it('returns red background class for deletions', () => {
      const className = getDiffLineClass('remove');
      expect(className).toContain('bg-red-100');
      expect(className).toContain('text-red-800');
    });

    it('returns empty string for unchanged lines', () => {
      const className = getDiffLineClass('unchanged');
      expect(className).toBe('');
    });
  });

  describe('getDiffStats', () => {
    it('counts additions and deletions correctly', () => {
      const diff = computeDiff('A\nB\nC', 'A\nD\nC\nE');
      const stats = getDiffStats(diff);

      expect(stats.additions).toBe(2); // D and E
      expect(stats.deletions).toBe(1); // B
    });
  });

  describe('DiffViewer component', () => {
    it('renders diff with additions highlighted in green', () => {
      const { container } = render(
        <DiffViewer originalContent="Line 1" refinedContent="Line 1\nLine 2" />
      );

      const addedLine = container.querySelector('.bg-green-100');
      expect(addedLine).toBeInTheDocument();
    });

    it('renders diff with deletions highlighted in red', () => {
      const { container } = render(
        <DiffViewer originalContent="Line 1\nLine 2" refinedContent="Line 1" />
      );

      const removedLine = container.querySelector('.bg-red-100');
      expect(removedLine).toBeInTheDocument();
    });

    it('displays additions and deletions counts', () => {
      render(
        <DiffViewer originalContent={originalContent} refinedContent={refinedContent} />
      );

      expect(screen.getByText(/additions/i)).toBeInTheDocument();
      expect(screen.getByText(/deletions/i)).toBeInTheDocument();
    });

    it('defaults to unified view', () => {
      render(
        <DiffViewer originalContent={originalContent} refinedContent={refinedContent} />
      );

      // Unified button should be active
      const unifiedButton = screen.getByRole('button', { name: /unified/i });
      expect(unifiedButton).toHaveClass('bg-primary-100');
    });

    it('toggles between unified and side-by-side view', () => {
      render(
        <DiffViewer originalContent={originalContent} refinedContent={refinedContent} />
      );

      const sideBySideButton = screen.getByRole('button', { name: /side-by-side/i });
      fireEvent.click(sideBySideButton);

      // Side-by-side button should now be active
      expect(sideBySideButton).toHaveClass('bg-primary-100');

      // Should show Original and Refined headers
      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Refined')).toBeInTheDocument();
    });

    it('calls onViewModeChange when toggle is clicked', () => {
      const handleViewModeChange = jest.fn();

      render(
        <DiffViewer
          originalContent={originalContent}
          refinedContent={refinedContent}
          viewMode="unified"
          onViewModeChange={handleViewModeChange}
        />
      );

      const sideBySideButton = screen.getByRole('button', { name: /side-by-side/i });
      fireEvent.click(sideBySideButton);

      expect(handleViewModeChange).toHaveBeenCalledWith('side-by-side');
    });

    it('shows + prefix for additions in unified view', () => {
      render(
        <DiffViewer originalContent="Line 1" refinedContent="Line 1\nLine 2" />
      );

      expect(screen.getByText('+')).toBeInTheDocument();
    });

    it('shows - prefix for deletions in unified view', () => {
      render(
        <DiffViewer originalContent="Line 1\nLine 2" refinedContent="Line 1" />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles long content with scroll', () => {
      const longOriginal = Array(50).fill('Original line').join('\n');
      const longRefined = Array(50).fill('Refined line').join('\n');

      const { container } = render(
        <DiffViewer originalContent={longOriginal} refinedContent={longRefined} />
      );

      const scrollContainer = container.querySelector('.overflow-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});
