'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react';
import { StatusBadge, DemandLetterStatus } from '@/components/StatusBadge';
import { CompliancePanel, ComplianceCheck, ComplianceResult } from './CompliancePanel';
import { DemandLetterEditor } from './DemandLetterEditor';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { isEditable } from '@/utils/demandLetterUtils';
import { VersionHistory, Version } from './VersionHistory';
import { VersionContentModal } from './VersionContentModal';
import { VersionComparisonModal } from './VersionComparisonModal';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { ApprovalHistoryTimeline } from './ApprovalHistoryTimeline';
import { PdfPreviewButton } from './PdfPreviewButton';
import { PdfPreviewModal } from './PdfPreviewModal';
import { UserRole } from '@/utils/roleUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://steno-prod-backend-vpc.eba-exhpmgyi.us-east-1.elasticbeanstalk.com';

/**
 * Full DemandLetter interface for detail view (from API)
 */
export interface DemandLetterDetail {
  id: string;
  caseId: string;
  templateId?: string;
  content: string;
  status: DemandLetterStatus;
  currentVersion: number;
  complianceResult: ComplianceResult;
  createdAt: string;
  updatedAt: string;
  case: {
    id: string;
    creditorName: string;
    debtorName: string;
    status: string;
  };
  template?: {
    id: string;
    name: string;
  };
}

interface DemandLetterDetailProps {
  caseId: string;
  letterId: string;
}

/**
 * Format date as "Nov 26, 2025" (AC-2.1.2)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date as relative time "2 hours ago" (AC-2.1.2)
 */
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

/**
 * DemandLetterDetail - Full letter view with content, compliance, and metadata
 * (AC-2.1.1 through AC-2.1.8)
 */
export function DemandLetterDetail({ caseId, letterId }: DemandLetterDetailProps) {
  const router = useRouter();
  const [letter, setLetter] = useState<DemandLetterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Version modal states (Epic 4)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ v1: number; v2: number } | null>(null);

  // Epic 5: Approval workflow states
  const [userRole, setUserRole] = useState<UserRole>('PARALEGAL');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Epic 6: PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Load user role from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUserRole((userData.role || 'PARALEGAL') as UserRole);
      }
    } catch {
      // Default to PARALEGAL if parsing fails
    }
  }, []);

  /**
   * Fetch letter data from API (AC-2.1.1)
   */
  const fetchLetter = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/${letterId}`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch letter (${response.status})`);
      }

      const data = await response.json();
      setLetter(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [letterId]);

  useEffect(() => {
    fetchLetter();
  }, [fetchLetter]);

  /**
   * Navigate back to letter list
   */
  const handleBackClick = () => {
    router.push(`/cases/view?id=${caseId}`);
  };

  /**
   * Handle version selection for viewing (Story 4.2)
   */
  const handleVersionSelect = (version: Version) => {
    setSelectedVersion(version);
    setShowVersionModal(true);
  };

  /**
   * Handle version comparison selection (Story 4.3)
   */
  const handleCompareSelect = (v1: number, v2: number) => {
    setCompareVersions({ v1, v2 });
  };

  /**
   * Close version content modal
   */
  const handleCloseVersionModal = () => {
    setShowVersionModal(false);
    setSelectedVersion(null);
  };

  /**
   * Close comparison modal
   */
  const handleCloseComparisonModal = () => {
    setCompareVersions(null);
  };

  /**
   * Handle status change from approval workflow (Epic 5)
   */
  const handleStatusChange = useCallback((newStatus: DemandLetterStatus) => {
    setLetter((prev) => prev ? { ...prev, status: newStatus } : null);
    setHistoryRefreshTrigger((prev) => prev + 1);
  }, []);

  /**
   * Handle workflow success message
   */
  const handleWorkflowSuccess = useCallback((message: string) => {
    setToast({ type: 'success', message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  /**
   * Handle workflow error message
   */
  const handleWorkflowError = useCallback((message: string) => {
    setToast({ type: 'error', message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Loading state (AC-2.1.6)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-500">Loading letter...</p>
      </div>
    );
  }

  // Error state (AC-2.1.7)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12" data-testid="error-state">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchLetter}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // No letter found
  if (!letter) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">Letter not found</p>
        <button
          onClick={handleBackClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Letters
        </button>
      </div>
    );
  }

  // Get compliance score from letter (default to 100 if not available)
  const complianceScore = letter.complianceResult?.score ?? 100;

  return (
    <div className="space-y-4">
      {/* Toast notifications (AC-5.1.7, AC-5.1.8) */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
          role="alert"
          data-testid="toast-notification"
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="text-sm">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with back navigation (AC-2.1.5) */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={handleBackClick}
            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
            data-testid="back-to-letters"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Letters
          </button>

          {/* Letter reference */}
          <span className="text-gray-400">|</span>
          <span className="font-medium text-gray-900">
            Letter #{letter.id.substring(0, 8)}
          </span>

          {/* Status badge (AC-2.1.5) */}
          <StatusBadge status={letter.status} />

          {/* Version badge (AC-2.1.5) */}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
            v{letter.currentVersion}
          </span>

          {/* PDF Preview Button (Epic 6 - Story 6.1, AC-6.1.1) */}
          <PdfPreviewButton onClick={() => setShowPdfPreview(true)} />
        </div>

        {/* Approval Workflow Actions (Epic 5 - Story 5.1, 5.2, 5.3) */}
        <ApprovalWorkflow
          letterId={letter.id}
          status={letter.status}
          userRole={userRole}
          complianceScore={complianceScore}
          debtorName={letter.case?.debtorName}
          onStatusChange={handleStatusChange}
          onSuccess={handleWorkflowSuccess}
          onError={handleWorkflowError}
        />
      </div>

      {/* Debtor name header (AC-2.1.5) */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {letter.case?.debtorName || 'Unknown Debtor'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Case: {letter.case?.id?.substring(0, 8) || caseId.substring(0, 8)}
        </p>
      </div>

      {/* Read-only banner for non-editable letters (AC-2.3.3, AC-2.3.6) */}
      <ReadOnlyBanner status={letter.status} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Letter Content (AC-2.1.1) - takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Letter Content
              {isEditable(letter.status) && (
                <span className="ml-2 text-xs font-normal text-gray-500">(Editable)</span>
              )}
            </h3>
            {/* Show editor for editable statuses (AC-2.2.1, AC-2.3.5), read-only for others */}
            {isEditable(letter.status) ? (
              <DemandLetterEditor
                letterId={letter.id}
                initialContent={letter.content || ''}
                onSaveSuccess={() => fetchLetter()}
                onCancel={handleBackClick}
              />
            ) : letter.content ? (
              <div
                className="prose prose-sm max-w-none overflow-y-auto max-h-[600px] whitespace-pre-line"
                data-testid="letter-content"
              >
                {letter.content}
              </div>
            ) : (
              <p className="text-gray-400 italic">No content available</p>
            )}
          </div>
        </div>

        {/* Sidebar - Compliance + Metadata + Version History */}
        <div className="space-y-4">
          {/* Compliance Panel (AC-2.1.3, AC-2.1.4) */}
          <CompliancePanel complianceResult={letter.complianceResult} />

          {/* Metadata Sidebar (AC-2.1.2) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Case Info</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-gray-500">Creditor</dt>
                <dd className="text-sm text-gray-900">{letter.case?.creditorName || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Debtor</dt>
                <dd className="text-sm text-gray-900">{letter.case?.debtorName || '-'}</dd>
              </div>
            </dl>

            <h3 className="text-sm font-medium text-gray-700 mb-3 mt-4">Template</h3>
            <p className="text-sm text-gray-900">
              {letter.template?.name || 'Custom letter'}
            </p>

            <h3 className="text-sm font-medium text-gray-700 mb-3 mt-4">Dates</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDate(letter.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Modified</dt>
                <dd className="text-sm text-gray-900">{getRelativeTime(letter.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Version History (Epic 4 - Story 4.1) */}
          <VersionHistory
            letterId={letter.id}
            currentVersion={letter.currentVersion}
            onVersionSelect={handleVersionSelect}
            onCompareSelect={handleCompareSelect}
          />

          {/* Approval History Timeline (Epic 5 - Story 5.4) */}
          <ApprovalHistoryTimeline
            demandId={letter.id}
            refreshTrigger={historyRefreshTrigger}
          />
        </div>
      </div>

      {/* Version Content Modal (Story 4.2) */}
      <VersionContentModal
        version={selectedVersion}
        currentVersion={letter.currentVersion}
        isOpen={showVersionModal}
        onClose={handleCloseVersionModal}
      />

      {/* Version Comparison Modal (Story 4.3) */}
      {compareVersions && (
        <VersionComparisonModal
          letterId={letter.id}
          version1={compareVersions.v1}
          version2={compareVersions.v2}
          isOpen={true}
          onClose={handleCloseComparisonModal}
        />
      )}

      {/* PDF Preview Modal (Epic 6 - Story 6.1, AC-6.1.2) */}
      <PdfPreviewModal
        letterId={letter.id}
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
      />
    </div>
  );
}

export default DemandLetterDetail;
