/**
 * Text Diff Service
 * Word-level diff generation for letter version comparison
 */

export interface DiffChange {
  type: 'add' | 'delete' | 'equal';
  text: string;
  position: number;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  changes: DiffChange[];
}

/**
 * Generate word-level diff between two texts
 */
export function generateDiff(oldText: string, newText: string): DiffResult {
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);

  const lcs = longestCommonSubsequence(oldWords, newWords);
  const changes: DiffChange[] = [];

  let oldIndex = 0;
  let newIndex = 0;
  let position = 0;
  let lcsIndex = 0;

  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    const oldWord = oldWords[oldIndex];
    const newWord = newWords[newIndex];
    const lcsWord = lcs[lcsIndex];

    if (oldWord === lcsWord && newWord === lcsWord) {
      // Words match - equal
      changes.push({
        type: 'equal',
        text: oldWord,
        position,
      });
      position += oldWord.length + 1;
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (oldWord !== lcsWord && oldIndex < oldWords.length) {
      // Word deleted from old
      changes.push({
        type: 'delete',
        text: oldWord,
        position,
      });
      oldIndex++;
    } else if (newIndex < newWords.length) {
      // Word added in new
      changes.push({
        type: 'add',
        text: newWord,
        position,
      });
      position += newWord.length + 1;
      newIndex++;
    }
  }

  // Count additions and deletions
  const additions = changes.filter((c) => c.type === 'add').length;
  const deletions = changes.filter((c) => c.type === 'delete').length;

  return {
    additions,
    deletions,
    changes,
  };
}

/**
 * Generate diff for display with highlighted markup
 */
export function generateDiffMarkup(oldText: string, newText: string): string {
  const diff = generateDiff(oldText, newText);
  let result = '';

  for (const change of diff.changes) {
    switch (change.type) {
      case 'add':
        result += `[+${change.text}+] `;
        break;
      case 'delete':
        result += `[-${change.text}-] `;
        break;
      case 'equal':
        result += `${change.text} `;
        break;
    }
  }

  return result.trim();
}

/**
 * Generate HTML diff markup
 */
export function generateHtmlDiff(oldText: string, newText: string): string {
  const diff = generateDiff(oldText, newText);
  let result = '';

  for (const change of diff.changes) {
    switch (change.type) {
      case 'add':
        result += `<ins>${escapeHtml(change.text)}</ins> `;
        break;
      case 'delete':
        result += `<del>${escapeHtml(change.text)}</del> `;
        break;
      case 'equal':
        result += `${escapeHtml(change.text)} `;
        break;
    }
  }

  return result.trim();
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .split(/(\s+)/)
    .filter((word) => word.trim().length > 0);
}

/**
 * Compute longest common subsequence of two word arrays
 */
function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;

  // Build LCS length matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Calculate similarity percentage between two texts
 */
export function calculateSimilarity(oldText: string, newText: string): number {
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);
  const lcs = longestCommonSubsequence(oldWords, newWords);

  const maxLength = Math.max(oldWords.length, newWords.length);
  if (maxLength === 0) return 100;

  return Math.round((lcs.length / maxLength) * 100);
}
