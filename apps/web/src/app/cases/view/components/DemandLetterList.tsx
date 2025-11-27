'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { StatusBadge, DemandLetterStatus } from '@/components/StatusBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

interface ComplianceCheck {
  rule: string;
  passed: boolean;
  message?: string;
}

export interface DemandLetter {
  id: string;
  caseId: string;
  templateId?: string;
  content: string;
  status: DemandLetterStatus;
  currentVersion: number;
  complianceResult: {
    isCompliant: boolean;
    score: number;
    checks: ComplianceCheck[];
  };
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
  };
}

// Sort types (AC-1.2.5, AC-1.2.6)
export type SortField = 'createdAt' | 'updatedAt' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Sort function (AC-1.2.2, AC-1.2.3, AC-1.2.5)
export function sortLetters(letters: DemandLetter[], config: SortConfig): DemandLetter[] {
  return [...letters].sort((a, b) => {
    let comparison = 0;
    if (config.field === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else {
      comparison = new Date(a[config.field]).getTime() - new Date(b[config.field]).getTime();
    }
    return config.direction === 'desc' ? -comparison : comparison;
  });
}

interface DemandLetterListProps {
  caseId: string;
  onGenerateLetter?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatDate(dateString);
}

// Truncate text utility (AC-1.3.3)
function truncateText(text: string | null | undefined, maxLength: number = 30): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function DemandLetterList({ caseId, onGenerateLetter }: DemandLetterListProps) {
  const router = useRouter();
  const [letters, setLetters] = useState<DemandLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Sort state (AC-1.2.5, AC-1.2.6)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    direction: 'desc',
  });

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands?caseId=${caseId}`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch demand letters');
      }

      const data = await response.json();
      const fetchedLetters: DemandLetter[] = data.data || [];
      setLetters(fetchedLetters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Memoized sorted letters (AC-1.2.2, AC-1.2.3)
  const sortedLetters = useMemo(() => {
    return sortLetters(letters, sortConfig);
  }, [letters, sortConfig]);

  // Sort toggle handler (AC-1.2.2, AC-1.2.3)
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field
        ? (prev.direction === 'desc' ? 'asc' : 'desc')
        : 'desc',
    }));
  };

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleLetterClick = (letterId: string) => {
    // Navigate to detail view with letterId param (AC-2.1.8)
    router.push(`/cases/view?id=${caseId}&letterId=${letterId}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent, letterId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLetterClick(letterId);
    }
  };

  // Loading state (AC-X.1)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-500">Loading demand letters...</p>
      </div>
    );
  }

  // Error state (AC-X.2)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchLetters}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state (AC-1.1.5)
  if (letters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">No demand letters yet</p>
        {onGenerateLetter && (
          <button
            onClick={onGenerateLetter}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Generate Letter
          </button>
        )}
      </div>
    );
  }

  // Sortable header component (AC-1.2.2, AC-1.2.3, AC-1.2.4)
  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 uppercase tracking-wider cursor-pointer"
    >
      {label}
      {sortConfig.field === field && (
        sortConfig.direction === 'desc'
          ? <ChevronDown size={14} aria-label="sorted descending" />
          : <ChevronUp size={14} aria-label="sorted ascending" />
      )}
    </button>
  );

  // Letter list (AC-1.1.1, AC-1.1.3, AC-1.1.4, AC-X.3, AC-X.4, AC-1.2.1-6)
  return (
    <div className="overflow-y-auto max-h-[600px]">
      {/* Sort Headers (AC-1.2.2, AC-1.2.3, AC-1.2.4) */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-6">
        <SortableHeader field="createdAt" label="Date" />
        <SortableHeader field="status" label="Status" />
      </div>
      <div className="divide-y divide-gray-200">
        {sortedLetters.map((letter) => (
          <div
            key={letter.id}
            role="button"
            tabIndex={0}
            onClick={() => handleLetterClick(letter.id)}
            onKeyDown={(e) => handleKeyDown(e, letter.id)}
            className="p-4 hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    Letter #{letter.id.substring(0, 8)}
                  </span>
                  <StatusBadge status={letter.status} />
                  {/* Version badge (AC-1.2.1) */}
                  <span className="text-xs bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    v{letter.currentVersion}
                  </span>
                </div>
                {/* Template display (AC-1.3.1, AC-1.3.2, AC-1.3.3, AC-1.3.4) */}
                <p
                  className="text-sm text-gray-500 mt-1"
                  title={letter.template?.name || 'Custom letter'}
                >
                  {letter.template?.name
                    ? truncateText(letter.template.name, 30)
                    : 'Custom letter'}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>Created: {formatDate(letter.createdAt)}</span>
                  <span>Modified: {getRelativeTime(letter.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export utilities for testing
export { formatDate, getRelativeTime, truncateText };
