/**
 * Debtor Dashboard Page
 * Main dashboard view for debtors showing case information
 */

import React, { useEffect, useState } from 'react';
import { AmountOwedCard } from '../components/AmountOwedCard';
import { CreditorInfoCard } from '../components/CreditorInfoCard';
import { TimelineCard } from '../components/TimelineCard';
import { OptionsPanel } from '../components/OptionsPanel';

/**
 * Dashboard data interface
 */
interface DashboardData {
  caseId: string;
  status: 'active' | 'resolved' | 'disputed';
  amount: {
    total: number;
    principal: number;
    interest: number;
    fees: number;
    formatted: {
      total: string;
      principal: string;
      interest: string;
      fees: string;
    };
  };
  creditor: {
    name: string;
    originalCreditor: string;
    accountNumber: string;
  };
  timeline: {
    debtOriginDate: string;
    responseDeadline: string | null;
    daysRemaining: number;
    isExpired: boolean;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  options: {
    canPay: boolean;
    canDispute: boolean;
    canNegotiate: boolean;
    disputeWindowOpen: boolean;
  };
  paraphraseAvailable: boolean;
  debtor: {
    firstName: string;
    onboardingCompleted: boolean;
  };
}

/**
 * Loading skeleton component
 */
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  </div>
);

/**
 * Error display component
 */
const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="text-center py-12">
    <div className="text-red-500 text-4xl mb-4">⚠️</div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-4">{message}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
);

export const DebtorDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/debtors/dashboard', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOptionSelect = (option: 'pay' | 'dispute' | 'negotiate' | 'questions') => {
    // Navigation would be handled here based on the selected option
    console.log('Selected option:', option);
    // Example: router.push(`/${option}`)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <ErrorDisplay message={error || 'Unable to load data'} onRetry={fetchDashboardData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hello, {data.debtor.firstName}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's an overview of your case.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:px-8">
        {/* Status Badge */}
        {data.status !== 'active' && (
          <div className={`mb-6 p-4 rounded-lg ${
            data.status === 'resolved' ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
          }`}>
            <p className="font-medium">
              {data.status === 'resolved'
                ? '✓ This case has been resolved'
                : '⏸ This case is currently under dispute'
              }
            </p>
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount Card - Full width on mobile, half on desktop */}
          <AmountOwedCard
            amount={data.amount}
            className="md:col-span-1"
          />

          {/* Timeline Card */}
          <TimelineCard
            timeline={data.timeline}
            className="md:col-span-1"
          />

          {/* Creditor Info Card */}
          <CreditorInfoCard
            creditor={data.creditor}
            className="md:col-span-1"
          />

          {/* Options Panel */}
          <OptionsPanel
            options={data.options}
            onOptionSelect={handleOptionSelect}
            className="md:col-span-1"
          />
        </div>

        {/* Paraphrase Available Banner */}
        {data.paraphraseAvailable && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium text-blue-900">
                  Plain English version available
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  We've translated the legal document into easy-to-understand language.
                </p>
                <button className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                  View simplified version →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Have questions? We're here to help.{' '}
            <button className="text-blue-600 hover:text-blue-800">Contact Support</button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default DebtorDashboard;
