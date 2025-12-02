'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CollectorNav } from '@/components/CollectorNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://steno-prod-backend-vpc.eba-exhpmgyi.us-east-1.elasticbeanstalk.com';

interface Case {
  id: string;
  referenceNumber: string;
  debtorName: string;
  creditorName: string;
  debtAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  role: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-100 text-red-800',
};

interface NewCaseForm {
  creditorName: string;
  debtorName: string;
  debtorEmail: string;
  debtAmount: string;
}

export default function CasesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);

  // Open modal if ?new=true is in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === 'true') {
        setShowNewCaseModal(true);
        // Clear the query param from URL without reload
        window.history.replaceState({}, '', '/cases');
      }
    }
  }, []);
  const [newCaseForm, setNewCaseForm] = useState<NewCaseForm>({
    creditorName: '',
    debtorName: '',
    debtorEmail: '',
    debtAmount: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role === 'DEBTOR') {
        router.push('/debtor/dashboard');
        return;
      }
      setUser({
        id: userData.id,
        email: userData.email,
        role: userData.role,
      });
      fetchCases();
    } catch {
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/cases`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        // API returns { data: { items: [...], pagination: {...} } }
        setCases(data.data?.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.debtorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creditorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCase = async () => {
    if (!newCaseForm.creditorName || !newCaseForm.debtorName || !newCaseForm.debtorEmail || !newCaseForm.debtAmount) {
      setCreateError('All fields are required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          creditorName: newCaseForm.creditorName,
          debtorName: newCaseForm.debtorName,
          debtorEmail: newCaseForm.debtorEmail,
          debtAmount: parseFloat(newCaseForm.debtAmount),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create case');
      }

      setShowNewCaseModal(false);
      setNewCaseForm({ creditorName: '', debtorName: '', debtorEmail: '', debtAmount: '' });
      fetchCases();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CollectorNav user={user} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
            <p className="text-sm text-gray-600">Manage debt collection cases</p>
          </div>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + New Case
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by debtor name, reference number, or creditor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="DISPUTED">Disputed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No cases found</p>
              {searchTerm || statusFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-primary-600 hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debtor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creditor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {c.referenceNumber || c.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{c.debtorName || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{c.creditorName || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ${Number(c.debtAmount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {c.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {c.updatedAt
                        ? new Date(c.updatedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/cases/view?id=${c.id}`}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Case</h3>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creditor Name</label>
                <input
                  type="text"
                  value={newCaseForm.creditorName}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, creditorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter creditor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Debtor Name</label>
                <input
                  type="text"
                  value={newCaseForm.debtorName}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter debtor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Debtor Email</label>
                <input
                  type="email"
                  value={newCaseForm.debtorEmail}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter debtor email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Debt Amount ($)</label>
                <input
                  type="number"
                  value={newCaseForm.debtAmount}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, debtAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter debt amount"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewCaseModal(false);
                  setCreateError('');
                  setNewCaseForm({ creditorName: '', debtorName: '', debtorEmail: '', debtAmount: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
