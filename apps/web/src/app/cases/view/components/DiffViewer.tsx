'use client';

import { useState, useMemo } from 'react';

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewerProps {
  originalContent: string;
  refinedContent: string;
  viewMode?: 'unified' | 'side-by-side';
  onViewModeChange?: (mode: 'unified' | 'side-by-side') => void;
}

function computeDiff(original: string, refined: string): DiffLine[] {
  const originalLines = original.split('\n');
  const refinedLines = refined.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff algorithm
  const m = originalLines.length;
  const n = refinedLines.length;

  // Build LCS table
  const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalLines[i - 1] === refinedLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = m, j = n;
  const diffStack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === refinedLines[j - 1]) {
      diffStack.push({
        type: 'unchanged',
        content: originalLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      diffStack.push({
        type: 'add',
        content: refinedLines[j - 1],
        newLineNumber: j,
      });
      j--;
    } else if (i > 0) {
      diffStack.push({
        type: 'remove',
        content: originalLines[i - 1],
        oldLineNumber: i,
      });
      i--;
    }
  }

  // Reverse to get correct order
  while (diffStack.length > 0) {
    result.push(diffStack.pop()!);
  }

  return result;
}

function getDiffLineClass(type: DiffLine['type']): string {
  switch (type) {
    case 'add':
      return 'bg-green-100 text-green-800';
    case 'remove':
      return 'bg-red-100 text-red-800';
    case 'unchanged':
      return '';
  }
}

function getDiffStats(diffLines: DiffLine[]): { additions: number; deletions: number } {
  return diffLines.reduce(
    (acc, line) => {
      if (line.type === 'add') acc.additions++;
      if (line.type === 'remove') acc.deletions++;
      return acc;
    },
    { additions: 0, deletions: 0 }
  );
}

export function DiffViewer({
  originalContent,
  refinedContent,
  viewMode = 'unified',
  onViewModeChange,
}: DiffViewerProps) {
  const [internalViewMode, setInternalViewMode] = useState<'unified' | 'side-by-side'>(viewMode);
  const currentMode = onViewModeChange ? viewMode : internalViewMode;

  const handleViewModeChange = (mode: 'unified' | 'side-by-side') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const diffLines = useMemo(
    () => computeDiff(originalContent, refinedContent),
    [originalContent, refinedContent]
  );

  const stats = useMemo(() => getDiffStats(diffLines), [diffLines]);

  // For side-by-side view, split into left (original) and right (refined)
  const sideBySideData = useMemo(() => {
    if (currentMode !== 'side-by-side') return { left: [], right: [] };

    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];

    for (const line of diffLines) {
      if (line.type === 'unchanged') {
        left.push(line);
        right.push(line);
      } else if (line.type === 'remove') {
        left.push(line);
        right.push(null);
      } else if (line.type === 'add') {
        left.push(null);
        right.push(line);
      }
    }

    return { left, right };
  }, [diffLines, currentMode]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header with stats and view toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="text-sm text-gray-600">
          <span className="text-green-600 font-medium">+{stats.additions}</span>
          <span className="mx-1">additions,</span>
          <span className="text-red-600 font-medium">-{stats.deletions}</span>
          <span className="ml-1">deletions</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleViewModeChange('unified')}
            className={`px-3 py-1 text-sm rounded ${
              currentMode === 'unified'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => handleViewModeChange('side-by-side')}
            className={`px-3 py-1 text-sm rounded ${
              currentMode === 'side-by-side'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Side-by-Side
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="max-h-96 overflow-auto">
        {currentMode === 'unified' ? (
          <div className="font-mono text-sm">
            {diffLines.map((line, index) => (
              <div
                key={index}
                className={`px-4 py-0.5 ${getDiffLineClass(line.type)} ${
                  line.type === 'remove' ? 'line-through' : ''
                }`}
              >
                <span className="select-none text-gray-400 w-8 inline-block text-right mr-4">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <span>{line.content || '\u00A0'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 font-mono text-sm">
            {/* Left side - Original */}
            <div className="border-r border-gray-200">
              <div className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium border-b">
                Original
              </div>
              {sideBySideData.left.map((line, index) => (
                <div
                  key={index}
                  className={`px-4 py-0.5 min-h-[1.5rem] ${
                    line ? getDiffLineClass(line.type) : ''
                  } ${line?.type === 'remove' ? 'line-through' : ''}`}
                >
                  {line?.content || '\u00A0'}
                </div>
              ))}
            </div>
            {/* Right side - Refined */}
            <div>
              <div className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium border-b">
                Refined
              </div>
              {sideBySideData.right.map((line, index) => (
                <div
                  key={index}
                  className={`px-4 py-0.5 min-h-[1.5rem] ${
                    line ? getDiffLineClass(line.type) : ''
                  }`}
                >
                  {line?.content || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export for testing
export { computeDiff, getDiffLineClass, getDiffStats };
export type { DiffLine, DiffViewerProps };
