/**
 * Agreements List Component
 * Displays list of agreements with filtering
 */

import React, { useState, useCallback, useEffect } from 'react';

/**
 * Agreement summary item
 */
interface AgreementItem {
  id: string;
  status: string;
  terms: {
    totalAmount: number;
    paymentAmount: number;
    frequency: string;
    numPayments: number;
  };
  signatures: {
    creditor?: { signedAt: string };
    debtor?: { signedAt: string };
  };
  createdAt: string;
  expiresAt: string;
}

/**
 * Props
 */
interface AgreementsListProps {
  userId: string;
  userRole: 'creditor' | 'debtor';
  demandId?: string;
  onSelectAgreement?: (agreementId: string) => void;
  className?: string;
}

/**
 * Status badge styles
 */
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  PENDING_SIGNATURES: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  PARTIALLY_SIGNED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial' },
  EXECUTED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Executed' },
  VOIDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Voided' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expired' },
};

/**
 * Filter options
 */
type FilterStatus = 'all' | 'pending' | 'executed' | 'voided';

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export const AgreementsList: React.FC<AgreementsListProps> = ({
  userId,
  userRole,
  demandId,
  onSelectAgreement,
  className = '',
}) => {
  // State
  const [agreements, setAgreements] = useState<AgreementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  /**
   * Fetch agreements
   */
  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = demandId
        ? `/api/agreements/demand/${demandId}`
        : `/api/agreements/user/${userId}?role=${userRole}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load agreements');

      const data = await response.json();
      setAgreements(data.agreements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, demandId]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  /**
   * Filter agreements
   */
  const filteredAgreements = agreements.filter((a) => {
    switch (filter) {
      case 'pending':
        return ['PENDING_SIGNATURES', 'PARTIALLY_SIGNED'].includes(a.status);
      case 'executed':
        return a.status === 'EXECUTED';
      case 'voided':
        return ['VOIDED', 'EXPIRED'].includes(a.status);
      default:
        return true;
    }
  });

  /**
   * Get action needed indicator
   */
  const getActionNeeded = (agreement: AgreementItem): string | null => {
    if (agreement.status === 'PENDING_SIGNATURES' || agreement.status === 'PARTIALLY_SIGNED') {
      const signed = userRole === 'creditor' ? agreement.signatures.creditor : agreement.signatures.debtor;
      if (!signed) return 'Signature needed';
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2" />
        <p className="text-gray-600">Loading agreements...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAgreements}
          className="mt-2 text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Agreements</h3>
          <span className="text-sm text-gray-500">{agreements.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-2">
          {(['all', 'pending', 'executed', 'voided'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {filteredAgreements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No agreements found</p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          filteredAgreements.map((agreement) => {
            const statusStyle = STATUS_STYLES[agreement.status] || STATUS_STYLES.DRAFT;
            const actionNeeded = getActionNeeded(agreement);

            return (
              <div
                key={agreement.id}
                onClick={() => onSelectAgreement?.(agreement.id)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(agreement.terms.totalAmount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {agreement.terms.numPayments}× {formatCurrency(agreement.terms.paymentAmount)}{' '}
                      {agreement.terms.frequency.toLowerCase()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created {new Date(agreement.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    {/* Signature indicators */}
                    <span className={agreement.signatures.creditor ? 'text-green-600' : 'text-gray-400'}>
                      C{agreement.signatures.creditor ? '✓' : '○'}
                    </span>
                    <span className={agreement.signatures.debtor ? 'text-green-600' : 'text-gray-400'}>
                      D{agreement.signatures.debtor ? '✓' : '○'}
                    </span>
                  </div>
                </div>

                {actionNeeded && (
                  <div className="mt-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    ⚠ {actionNeeded}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AgreementsList;
