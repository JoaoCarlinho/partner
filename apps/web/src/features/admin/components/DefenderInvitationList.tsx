'use client';

import React, { useState, useMemo } from 'react';
import { Mail, RefreshCw, X, UserPlus, ChevronUp, ChevronDown, Search, Loader2 } from 'lucide-react';
import { InvitationStatusBadge, getInvitationStatus, InvitationStatus } from './InvitationStatusBadge';
import {
  useDefenderInvitations,
  DefenderInvitation,
  useSendInvitation,
  useResendInvitation,
  useRevokeInvitation
} from '../hooks/useDefenderInvitations';
import { SendInvitationModal } from './SendInvitationModal';
import { ConfirmDialog } from './ConfirmDialog';

type SortField = 'createdAt' | 'email' | 'status' | 'expiresAt';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'pending' | 'redeemed' | 'expired';

const ITEMS_PER_PAGE = 20;

export function DefenderInvitationList() {
  const { invitations, stats, loading, error, refetch } = useDefenderInvitations();

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [resendConfirm, setResendConfirm] = useState<DefenderInvitation | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<DefenderInvitation | null>(null);

  // Action hooks
  const { resendInvitation, loading: resending } = useResendInvitation();
  const { revokeInvitation, loading: revoking } = useRevokeInvitation();

  // Sort and filter states
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Process and sort invitations
  const processedInvitations = useMemo(() => {
    let filtered = invitations.map(inv => ({
      ...inv,
      status: getInvitationStatus(inv)
    }));

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.email.toLowerCase().includes(query) ||
        inv.organizationName?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'expiresAt':
          comparison = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
          break;
        case 'createdAt':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [invitations, sortField, sortDirection, filterStatus, searchQuery]);

  // Paginated invitations
  const paginatedInvitations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedInvitations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedInvitations, currentPage]);

  const totalPages = Math.ceil(processedInvitations.length / ITEMS_PER_PAGE);

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4 inline ml-1" /> :
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Handle resend confirmation
  const handleResendConfirm = async () => {
    if (!resendConfirm) return;

    try {
      await resendInvitation(resendConfirm.id);
      showToast('Invitation resent', 'success');
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend invitation', 'error');
    } finally {
      setResendConfirm(null);
    }
  };

  // Handle revoke confirmation
  const handleRevokeConfirm = async () => {
    if (!revokeConfirm) return;

    try {
      await revokeInvitation(revokeConfirm.id);
      showToast('Invitation revoked', 'success');
      await refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to revoke invitation', 'error');
    } finally {
      setRevokeConfirm(null);
    }
  };

  // Handle successful invitation send
  const handleInvitationSent = async (email: string) => {
    showToast(`Invitation sent to ${email}`, 'success');
    await refetch();
    setShowSendModal(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Defender Invitations</h1>
          <p className="text-gray-600">Manage public defender invitations</p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Defender
        </button>
      </div>

      {/* Statistics Cards (AC: 5) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} colorClass="bg-blue-50 text-blue-800" />
        <StatCard label="Pending" value={stats.pending} colorClass="bg-yellow-50 text-yellow-800" />
        <StatCard label="Redeemed" value={stats.redeemed} colorClass="bg-green-50 text-green-800" />
        <StatCard label="Expired" value={stats.expired} colorClass="bg-gray-50 text-gray-600" />
      </div>

      {/* Search and Filters (AC: 4) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or organization..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'redeemed', 'expired'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State (AC: 6) */}
      {invitations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations yet</h3>
          <p className="text-gray-500 mb-4">Get started by inviting your first public defender</p>
          <button
            onClick={() => setShowSendModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            Invite First Defender
          </button>
        </div>
      ) : processedInvitations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matching invitations</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <>
          {/* Invitations Table (AC: 1) */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    Email <SortIndicator field="email" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIndicator field="status" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    Invited Date <SortIndicator field="createdAt" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('expiresAt')}
                  >
                    Expires Date <SortIndicator field="expiresAt" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedInvitations.map((invitation) => {
                  const status = getInvitationStatus(invitation);
                  const isPending = status === 'pending';

                  return (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{invitation.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{invitation.organizationName || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InvitationStatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invitation.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {status === 'revoked' ? '-' : formatDate(invitation.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResendConfirm(invitation)}
                              disabled={resending}
                              className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50"
                              title="Resend invitation"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Resend
                            </button>
                            <button
                              onClick={() => setRevokeConfirm(invitation)}
                              disabled={revoking}
                              className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Revoke invitation"
                            >
                              <X className="w-4 h-4" />
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination (AC: 7) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-4">
              <p className="text-sm text-gray-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, processedInvitations.length)} of {processedInvitations.length} invitations
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Send Invitation Modal */}
      <SendInvitationModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSuccess={handleInvitationSent}
      />

      {/* Resend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!resendConfirm}
        title="Resend Invitation"
        message={`Resend invitation to ${resendConfirm?.email}? This will extend the expiration by 7 days.`}
        confirmLabel="Resend"
        onConfirm={handleResendConfirm}
        onCancel={() => setResendConfirm(null)}
        loading={resending}
      />

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeConfirm}
        title="Revoke Invitation"
        message={`Revoke invitation to ${revokeConfirm?.email}? They will no longer be able to register with this link.`}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeConfirm(null)}
        loading={revoking}
      />
    </div>
  );
}

// Statistics Card Component
interface StatCardProps {
  label: string;
  value: number;
  colorClass: string;
}

function StatCard({ label, value, colorClass }: StatCardProps) {
  return (
    <div className={`rounded-lg p-4 ${colorClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default DefenderInvitationList;
