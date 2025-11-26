/**
 * Assignment List Component
 * Displays defender's assigned cases with status and actions
 */

import React, { useState, useEffect } from 'react';

type AssignmentStatus =
  | 'REQUESTED'
  | 'PENDING_CONSENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'TRANSFERRED'
  | 'DECLINED';

interface Assignment {
  id: string;
  debtor: {
    id: string;
    name: string;
    initials: string;
  };
  case: {
    id: string;
    debtAmount: number;
    creditorName: string;
  };
  status: AssignmentStatus;
  assignedAt?: string;
  needsAttention: boolean;
  lastActivity?: string;
}

interface DefenderCapacity {
  currentCaseload: number;
  maxCaseload: number;
  availableSlots: number;
  activeAssignments: number;
  pendingAssignments: number;
}

type FilterTab = 'needs_attention' | 'active' | 'pending' | 'all';

export const AssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [capacity, setCapacity] = useState<DefenderCapacity | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
    loadCapacity();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch('/api/v1/assignments');
      // const data = await response.json();

      // Mock data
      setAssignments([
        {
          id: '1',
          debtor: { id: 'd1', name: 'John D.', initials: 'JD' },
          case: { id: 'c1', debtAmount: 2450, creditorName: 'ABC Collections' },
          status: 'ACTIVE',
          assignedAt: '2025-01-15T10:00:00Z',
          needsAttention: true,
          lastActivity: '3 days ago',
        },
        {
          id: '2',
          debtor: { id: 'd2', name: 'Sarah M.', initials: 'SM' },
          case: { id: 'c2', debtAmount: 1200, creditorName: 'XYZ Credit' },
          status: 'ACTIVE',
          assignedAt: '2025-01-18T14:30:00Z',
          needsAttention: true,
          lastActivity: '5 days ago',
        },
        {
          id: '3',
          debtor: { id: 'd3', name: 'Michael R.', initials: 'MR' },
          case: { id: 'c3', debtAmount: 3500, creditorName: 'Smith Law' },
          status: 'ACTIVE',
          assignedAt: '2025-01-10T09:00:00Z',
          needsAttention: false,
          lastActivity: 'Today',
        },
        {
          id: '4',
          debtor: { id: 'd4', name: 'Emily K.', initials: 'EK' },
          case: { id: 'c4', debtAmount: 800, creditorName: 'Regional Bank' },
          status: 'PENDING_CONSENT',
          needsAttention: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacity = async () => {
    // Mock data
    setCapacity({
      currentCaseload: 8,
      maxCaseload: 25,
      availableSlots: 17,
      activeAssignments: 6,
      pendingAssignments: 2,
    });
  };

  const filteredAssignments = assignments.filter((a) => {
    switch (activeTab) {
      case 'needs_attention':
        return a.needsAttention && a.status === 'ACTIVE';
      case 'active':
        return a.status === 'ACTIVE';
      case 'pending':
        return ['REQUESTED', 'PENDING_CONSENT'].includes(a.status);
      default:
        return true;
    }
  });

  const getStatusBadge = (status: AssignmentStatus) => {
    const styles: Record<AssignmentStatus, string> = {
      REQUESTED: 'bg-yellow-100 text-yellow-800',
      PENDING_CONSENT: 'bg-orange-100 text-orange-800',
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      TRANSFERRED: 'bg-gray-100 text-gray-800',
      DECLINED: 'bg-red-100 text-red-800',
    };

    const labels: Record<AssignmentStatus, string> = {
      REQUESTED: 'Requested',
      PENDING_CONSENT: 'Awaiting Consent',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      TRANSFERRED: 'Transferred',
      DECLINED: 'Declined',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const needsAttentionCount = assignments.filter(
    (a) => a.needsAttention && a.status === 'ACTIVE'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Capacity */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600 mt-1">Manage your assigned debtor cases</p>
        </div>

        {capacity && (
          <div className="bg-white rounded-lg shadow p-4 min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Caseload</span>
              <span className="text-sm font-medium">
                {capacity.currentCaseload}/{capacity.maxCaseload}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  capacity.currentCaseload / capacity.maxCaseload > 0.8
                    ? 'bg-red-500'
                    : capacity.currentCaseload / capacity.maxCaseload > 0.6
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${(capacity.currentCaseload / capacity.maxCaseload) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {capacity.availableSlots} slots available
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'needs_attention', label: 'Needs Attention', count: needsAttentionCount },
              { id: 'active', label: 'Active', count: capacity?.activeAssignments },
              { id: 'pending', label: 'Pending', count: capacity?.pendingAssignments },
              { id: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.id === 'needs_attention' && needsAttentionCount > 0 && (
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2" />
                )}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Assignment List */}
        <div className="divide-y divide-gray-200">
          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No assignments found for this filter
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar/Status Indicator */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {assignment.debtor.initials}
                      </div>
                      {assignment.needsAttention && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {assignment.debtor.name}
                        </h3>
                        {getStatusBadge(assignment.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {assignment.case.creditorName} •{' '}
                        {formatCurrency(assignment.case.debtAmount)}
                      </p>
                      {assignment.assignedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Assigned:{' '}
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                          {assignment.lastActivity && (
                            <span className="ml-2">
                              • Last activity: {assignment.lastActivity}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <a
                      href={`/defender/cases/${assignment.case.id}`}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      View Case
                    </a>
                    {assignment.status === 'ACTIVE' && (
                      <a
                        href={`/defender/messages/${assignment.id}`}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Message
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {filteredAssignments.length > 0 && (
        <div className="flex justify-center space-x-2">
          <button className="px-3 py-1 border rounded text-sm text-gray-500 hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-1 border rounded text-sm bg-blue-600 text-white">
            1
          </button>
          <button className="px-3 py-1 border rounded text-sm text-gray-500 hover:bg-gray-50">
            2
          </button>
          <button className="px-3 py-1 border rounded text-sm text-gray-500 hover:bg-gray-50">
            3
          </button>
          <button className="px-3 py-1 border rounded text-sm text-gray-500 hover:bg-gray-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
