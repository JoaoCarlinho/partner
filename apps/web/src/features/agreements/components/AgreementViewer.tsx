/**
 * Agreement Viewer Component
 * Displays agreement document with signing capability
 */

import React, { useState, useCallback, useEffect } from 'react';

/**
 * Agreement data
 */
interface Agreement {
  id: string;
  planId: string;
  demandId: string;
  creditorId: string;
  debtorId: string;
  status: string;
  terms: {
    totalAmount: number;
    downPayment: number;
    paymentAmount: number;
    frequency: string;
    numPayments: number;
    startDate: string;
    endDate: string;
    lateFeePercent: number;
    gracePeriodDays: number;
    defaultThreshold: number;
    specialConditions?: string[];
  };
  signatures: {
    creditor?: {
      signedBy: string;
      signedAt: string;
      signatureHash: string;
    };
    debtor?: {
      signedBy: string;
      signedAt: string;
      signatureHash: string;
    };
  };
  createdAt: string;
  expiresAt: string;
}

/**
 * Agreement summary
 */
interface AgreementSummary {
  title: string;
  status: string;
  keyTerms: Array<{ label: string; value: string }>;
  signatureStatus: {
    creditor: 'pending' | 'signed';
    debtor: 'pending' | 'signed';
  };
}

/**
 * Props
 */
interface AgreementViewerProps {
  agreementId: string;
  currentUserId: string;
  userRole: 'creditor' | 'debtor';
  onSigned?: () => void;
  className?: string;
}

/**
 * Status badge styles
 */
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_SIGNATURES: 'bg-yellow-100 text-yellow-700',
  PARTIALLY_SIGNED: 'bg-blue-100 text-blue-700',
  EXECUTED: 'bg-green-100 text-green-700',
  VOIDED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

export const AgreementViewer: React.FC<AgreementViewerProps> = ({
  agreementId,
  currentUserId,
  userRole,
  onSigned,
  className = '',
}) => {
  // State
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [summary, setSummary] = useState<AgreementSummary | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);

  /**
   * Fetch agreement data
   */
  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/${agreementId}`);
      if (!response.ok) throw new Error('Failed to load agreement');

      const data = await response.json();
      setAgreement(data.agreement);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [agreementId]);

  /**
   * Fetch document text
   */
  const fetchDocument = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/${agreementId}/document`);
      if (!response.ok) throw new Error('Failed to load document');

      const text = await response.text();
      setDocumentText(text);
      setShowDocument(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    }
  }, [agreementId]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  /**
   * Handle signing
   */
  const handleSign = useCallback(async () => {
    if (!acknowledgeTerms) {
      setError('Please acknowledge that you have read and agree to the terms');
      return;
    }

    setSigning(true);
    setError(null);

    try {
      const response = await fetch(`/api/agreements/${agreementId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerId: currentUserId,
          role: userRole,
          ipAddress: 'client-ip', // Would be captured server-side
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sign');
      }

      await fetchAgreement();
      onSigned?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign');
    } finally {
      setSigning(false);
    }
  }, [agreementId, currentUserId, userRole, acknowledgeTerms, fetchAgreement, onSigned]);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2" />
        <p className="text-gray-600">Loading agreement...</p>
      </div>
    );
  }

  // Error or not found
  if (!agreement || !summary) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <p className="text-red-600">{error || 'Agreement not found'}</p>
      </div>
    );
  }

  const hasSignedAlready = agreement.signatures[userRole];
  const canSign = ['PENDING_SIGNATURES', 'PARTIALLY_SIGNED'].includes(agreement.status);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{summary.title}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_STYLES[agreement.status]}`}>
            {agreement.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Created {new Date(agreement.createdAt).toLocaleDateString()} •
          Expires {new Date(agreement.expiresAt).toLocaleDateString()}
        </p>
      </div>

      {/* Key terms */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Key Terms</h4>
        <div className="grid grid-cols-2 gap-3">
          {summary.keyTerms.map((term, i) => (
            <div key={i} className="text-sm">
              <span className="text-gray-500">{term.label}:</span>
              <span className="ml-1 font-medium text-gray-900">{term.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signature status */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Signature Status</h4>
        <div className="grid grid-cols-2 gap-4">
          {/* Creditor signature */}
          <div
            className={`p-3 rounded-lg border ${
              agreement.signatures.creditor
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-sm font-medium text-gray-700 mb-1">Creditor</p>
            {agreement.signatures.creditor ? (
              <>
                <p className="text-sm text-green-700">✓ Signed</p>
                <p className="text-xs text-gray-500">
                  {new Date(agreement.signatures.creditor.signedAt).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Pending</p>
            )}
          </div>

          {/* Debtor signature */}
          <div
            className={`p-3 rounded-lg border ${
              agreement.signatures.debtor
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-sm font-medium text-gray-700 mb-1">Debtor</p>
            {agreement.signatures.debtor ? (
              <>
                <p className="text-sm text-green-700">✓ Signed</p>
                <p className="text-xs text-gray-500">
                  {new Date(agreement.signatures.debtor.signedAt).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Pending</p>
            )}
          </div>
        </div>
      </div>

      {/* Document preview */}
      {showDocument && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Agreement Document</h4>
            <button
              onClick={() => setShowDocument(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          <pre className="p-4 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap font-mono">
            {documentText}
          </pre>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        {!showDocument && (
          <button
            onClick={fetchDocument}
            className="w-full mb-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Full Document
          </button>
        )}

        {canSign && !hasSignedAlready && (
          <>
            {/* Acknowledgment checkbox */}
            <label className="flex items-start gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledgeTerms}
                onChange={(e) => setAcknowledgeTerms(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                I have read and understand the terms of this agreement, and I agree to be bound by them.
              </span>
            </label>

            <button
              onClick={handleSign}
              disabled={signing || !acknowledgeTerms}
              className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {signing ? 'Signing...' : 'Sign Agreement'}
            </button>
          </>
        )}

        {hasSignedAlready && (
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-green-700 font-medium">You have signed this agreement</p>
            <p className="text-sm text-green-600 mt-1">
              Signature hash: {agreement.signatures[userRole]?.signatureHash}
            </p>
          </div>
        )}

        {agreement.status === 'EXECUTED' && (
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-green-700 font-medium">✓ Agreement Fully Executed</p>
            <p className="text-sm text-green-600">Both parties have signed</p>
          </div>
        )}

        {agreement.status === 'DRAFT' && (
          <p className="text-sm text-center text-gray-500">
            This agreement is in draft status and has not been sent for signatures.
          </p>
        )}
      </div>
    </div>
  );
};

export default AgreementViewer;
