'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollectorNav } from '@/components/CollectorNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

interface User {
  id: string;
  email: string;
  role: string;
}

interface ComplianceFlag {
  id: string;
  caseId: string;
  messageId: string | null;
  flagType: string;
  severity: 'warning' | 'violation';
  details: Record<string, unknown>;
  resolved: boolean;
  createdAt: string;
}

interface SummaryData {
  totalFlags: number;
  unresolvedFlags: number;
  violations: number;
  recentViolations: ComplianceFlag[];
}

const FLAG_TYPE_INFO: Record<string, { label: string; icon: string }> = {
  fdcpa_violation: { label: 'FDCPA Violation', icon: '⚠️' },
  frequency_warning: { label: 'Frequency Warning', icon: '📊' },
  frequency_exceeded: { label: 'Frequency Exceeded', icon: '🚫' },
  time_restriction: { label: 'Time Restriction', icon: '🕐' },
  disclosure_missing: { label: 'Missing Disclosure', icon: '📋' },
  tone_blocked: { label: 'Tone Blocked', icon: '🔇' },
  cease_desist_active: { label: 'Cease & Desist', icon: '✋' },
  manual_review: { label: 'Manual Review', icon: '👁️' },
};

function StatusCard({
  title,
  value,
  subtitle,
  variant = 'default',
  icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  icon: string;
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'danger':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'warning':
        return 'text-yellow-700';
      case 'danger':
        return 'text-red-700';
      case 'success':
        return 'text-green-700';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getVariantStyles()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${getValueColor()}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function CompliancePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [unresolvedFlags, setUnresolvedFlags] = useState<ComplianceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

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
      loadData();
    } catch {
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load summary
      const summaryRes = await fetch(`${API_URL}/api/v1/compliance/summary`, {
        credentials: 'include',
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData.data || summaryData);
      } else {
        // Mock data for demo
        setSummary({
          totalFlags: 24,
          unresolvedFlags: 3,
          violations: 2,
          recentViolations: [],
        });
      }

      // Load unresolved flags
      const flagsRes = await fetch(`${API_URL}/api/v1/compliance/flags?resolved=false&limit=10`, {
        credentials: 'include',
      });
      if (flagsRes.ok) {
        const flagsData = await flagsRes.json();
        setUnresolvedFlags(flagsData.data || []);
      } else {
        // Mock data for demo
        setUnresolvedFlags([
          {
            id: '1',
            caseId: 'case-001',
            messageId: null,
            flagType: 'frequency_warning',
            severity: 'warning',
            details: {},
            resolved: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            caseId: 'case-002',
            messageId: null,
            flagType: 'time_restriction',
            severity: 'warning',
            details: {},
            resolved: false,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      // Set mock data
      setSummary({
        totalFlags: 24,
        unresolvedFlags: 3,
        violations: 2,
        recentViolations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolvingId || !resolveNotes.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/compliance/flags/${resolvingId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ resolutionNotes: resolveNotes }),
      });

      if (response.ok) {
        setResolvingId(null);
        setResolveNotes('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to resolve flag:', error);
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
            <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
            <p className="text-sm text-gray-600">Monitor FDCPA and Regulation F compliance</p>
          </div>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatusCard
                title="Total Flags"
                value={summary?.totalFlags || 0}
                icon="🚩"
                variant="default"
              />
              <StatusCard
                title="Unresolved"
                value={summary?.unresolvedFlags || 0}
                subtitle="Needs attention"
                icon="⏳"
                variant={summary?.unresolvedFlags ? 'warning' : 'success'}
              />
              <StatusCard
                title="Violations"
                value={summary?.violations || 0}
                subtitle="Total violations"
                icon="⚠️"
                variant={summary?.violations ? 'danger' : 'success'}
              />
              <StatusCard
                title="Compliance Rate"
                value={
                  summary?.violations === 0
                    ? '100%'
                    : `${Math.round(
                        (1 - (summary?.violations || 0) / Math.max(summary?.totalFlags || 1, 1)) *
                          100
                      )}%`
                }
                icon="✓"
                variant="success"
              />
            </div>

            {/* Unresolved flags */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Unresolved Flags</h3>
              {unresolvedFlags.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No unresolved flags</p>
              ) : (
                <div className="space-y-3">
                  {unresolvedFlags.map((flag) => {
                    const typeInfo = FLAG_TYPE_INFO[flag.flagType] || {
                      label: flag.flagType,
                      icon: '🚩',
                    };
                    const isViolation = flag.severity === 'violation';

                    return (
                      <div
                        key={flag.id}
                        className={`p-3 rounded-lg border ${
                          isViolation
                            ? 'border-red-200 bg-red-50'
                            : 'border-yellow-200 bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{typeInfo.icon}</span>
                            <div>
                              <p
                                className={`font-medium text-sm ${
                                  isViolation ? 'text-red-800' : 'text-yellow-800'
                                }`}
                              >
                                {typeInfo.label}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Case: {flag.caseId.substring(0, 8)}...
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(flag.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {!flag.resolved && (
                            <button
                              onClick={() => setResolvingId(flag.id)}
                              className="text-xs text-primary-600 hover:underline"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compliance tips */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Compliance Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800">Communication Frequency</p>
                  <p className="text-sm text-blue-700 mt-1">
                    FDCPA limits contact attempts. Avoid contacting debtors more than 7 times per
                    week.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800">Time Restrictions</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Only contact debtors between 8am and 9pm in their local time zone.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800">Required Disclosures</p>
                  <p className="text-sm text-blue-700 mt-1">
                    All communications must include mini-Miranda warning and validation notice.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800">Cease & Desist</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Immediately stop all contact if debtor requests cease communications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resolve modal */}
        {resolvingId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="font-semibold text-gray-900 mb-4">Resolve Compliance Flag</h3>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Enter resolution notes..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setResolvingId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolveNotes.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
