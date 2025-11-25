/**
 * Defender Case View Page
 * Read-only view of debtor case for assigned public defenders
 */

import React, { useState, useEffect } from 'react';

// Types
interface CaseDetails {
  id: string;
  creditorName: string;
  originalAmount: number;
  currentAmount: number;
  debtAge: number;
  status: string;
}

interface DebtorSummary {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  financialProfile?: {
    monthlyIncome?: number;
    monthlyExpenses?: number;
    employmentStatus?: string;
    dependents?: number;
    monthlyDisposable?: number;
  };
}

interface PaymentPlan {
  type: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progress: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  status: string;
  payments: {
    id: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: string;
  }[];
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  actor?: string;
}

interface RecommendedAction {
  action: string;
  reason: string;
}

interface CaseViewData {
  case: CaseDetails;
  debtor: DebtorSummary;
  paymentPlan?: PaymentPlan;
  timeline: TimelineEvent[];
  recommendedActions: {
    priority: 'high' | 'medium' | 'low';
    actions: RecommendedAction[];
  };
}

type TabId = 'overview' | 'payments' | 'timeline' | 'rights';

interface CaseViewPageProps {
  caseId: string;
}

export const CaseViewPage: React.FC<CaseViewPageProps> = ({ caseId }) => {
  const [data, setData] = useState<CaseViewData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/v1/defenders/cases/${caseId}`);
      // const data = await response.json();

      // Mock data
      setData({
        case: {
          id: caseId,
          creditorName: 'ABC Collections',
          originalAmount: 2500,
          currentAmount: 2450,
          debtAge: 6,
          status: 'IN_NEGOTIATION',
        },
        debtor: {
          firstName: 'John',
          lastName: 'D.',
          email: 'j***@email.com',
          phone: '***-***-1234',
          financialProfile: {
            monthlyIncome: 3500,
            monthlyExpenses: 2800,
            employmentStatus: 'Employed',
            dependents: 2,
            monthlyDisposable: 700,
          },
        },
        paymentPlan: {
          type: 'INSTALLMENT',
          totalAmount: 2450,
          paidAmount: 400,
          remainingAmount: 2050,
          progress: 16.3,
          nextPaymentDate: '2025-03-15',
          nextPaymentAmount: 200,
          status: 'ACTIVE',
          payments: [
            { id: '1', amount: 200, dueDate: '2025-01-15', paidDate: '2025-01-14', status: 'PAID' },
            { id: '2', amount: 200, dueDate: '2025-02-15', paidDate: '2025-02-16', status: 'PAID' },
            { id: '3', amount: 200, dueDate: '2025-03-15', status: 'PENDING' },
            { id: '4', amount: 200, dueDate: '2025-04-15', status: 'PENDING' },
          ],
        },
        timeline: [
          { id: '1', type: 'DEFENDER_ASSIGNED', description: 'Public defender assigned', timestamp: '2025-01-20T10:00:00Z' },
          { id: '2', type: 'PAYMENT_MADE', description: 'Payment of $200 received', timestamp: '2025-02-16T14:30:00Z' },
          { id: '3', type: 'PLAN_ACCEPTED', description: 'Payment plan accepted', timestamp: '2025-01-10T09:00:00Z' },
        ],
        recommendedActions: {
          priority: 'medium',
          actions: [
            { action: 'Send payment reminder', reason: 'Payment of $200 due in 3 days' },
            { action: 'Follow up with debtor', reason: 'No communication in 5 days' },
          ],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Case: {data.debtor.firstName} {data.debtor.lastName}
            </h1>
            <p className="text-gray-600 mt-1">
              {data.case.creditorName} • {formatCurrency(data.case.currentAmount)}
            </p>
          </div>
          <div className="flex space-x-3">
            <a
              href={`/defender/messages/${caseId}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Message Debtor
            </a>
            <a
              href={`/defender/notes/${caseId}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Case Notes
            </a>
          </div>
        </div>

        {/* Recommended Actions */}
        {data.recommendedActions.actions.length > 0 && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              data.recommendedActions.priority === 'high'
                ? 'bg-red-50 border border-red-200'
                : data.recommendedActions.priority === 'medium'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <h3 className="font-medium text-gray-900 mb-2">Recommended Actions</h3>
            <ul className="space-y-1">
              {data.recommendedActions.actions.map((action, idx) => (
                <li key={idx} className="text-sm">
                  <span className="font-medium">{action.action}</span>
                  <span className="text-gray-600"> - {action.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'payments', label: 'Payment Plan' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'rights', label: 'Debtor Rights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'overview' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Debtor Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Debtor Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {data.debtor.firstName} {data.debtor.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-sm font-medium text-gray-900">{data.debtor.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900">{data.debtor.phone || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            {/* Financial Summary */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
              {data.debtor.financialProfile ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Monthly Income</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(data.debtor.financialProfile.monthlyIncome || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Monthly Expenses</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(data.debtor.financialProfile.monthlyExpenses || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Disposable Income</dt>
                    <dd className="text-sm font-medium text-green-600">
                      {formatCurrency(data.debtor.financialProfile.monthlyDisposable || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Employment</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {data.debtor.financialProfile.employmentStatus || 'Unknown'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-gray-500">Financial assessment not completed</p>
              )}
            </div>

            {/* Case Summary */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Case Summary</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Original Amount</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(data.case.originalAmount)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(data.case.currentAmount)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Debt Age</p>
                  <p className="text-xl font-semibold text-gray-900">{data.case.debtAge} months</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {data.case.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && data.paymentPlan && (
          <div className="p-6">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Payment Progress</span>
                <span className="font-medium">
                  {formatCurrency(data.paymentPlan.paidAmount)} of{' '}
                  {formatCurrency(data.paymentPlan.totalAmount)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{ width: `${data.paymentPlan.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {data.paymentPlan.progress.toFixed(1)}% complete •{' '}
                {formatCurrency(data.paymentPlan.remainingAmount)} remaining
              </p>
            </div>

            {/* Next Payment */}
            {data.paymentPlan.nextPaymentDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Next Payment:</strong>{' '}
                  {formatCurrency(data.paymentPlan.nextPaymentAmount || 0)} due{' '}
                  {new Date(data.paymentPlan.nextPaymentDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Payment History */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Due Date</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Paid Date</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentPlan.payments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-3 text-sm">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm">{formatCurrency(payment.amount)}</td>
                    <td className="py-3 text-sm">
                      {payment.paidDate
                        ? new Date(payment.paidDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          payment.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'MISSED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="p-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {data.timeline.map((event, idx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {idx !== data.timeline.length - 1 && (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                            <svg
                              className="h-4 w-4 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <p className="text-sm text-gray-900">{event.description}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                            {event.actor && <span> • {event.actor}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'rights' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">FDCPA Debtor Rights</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Key Rights</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Right to request debt validation within 30 days of initial contact</li>
                  <li>Right to dispute the debt in writing</li>
                  <li>Right to request that the collector stop contacting them</li>
                  <li>Right to sue collectors who violate FDCPA</li>
                  <li>Right to be free from harassment and abuse</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Prohibited Practices</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Calling before 8am or after 9pm</li>
                  <li>Threatening violence or criminal prosecution</li>
                  <li>Using obscene language</li>
                  <li>Misrepresenting the amount owed</li>
                  <li>Contacting third parties about the debt</li>
                  <li>Continuing contact after written cease request</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Key Dates</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">30-Day Validation Period</dt>
                    <dd className="text-gray-600">
                      Debtor can request debt validation within 30 days of initial contact
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Statute of Limitations</dt>
                    <dd className="text-gray-600">
                      Varies by state, typically 3-6 years for most debt types
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseViewPage;
