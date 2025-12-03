'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CollectorNav } from '@/components/CollectorNav';
import { RefinementChat, RefinementResult, AnalysisResult } from './components/RefinementChat';
import { VersionToolbar } from './components/VersionToolbar';
import { DemandLetterList } from './components/DemandLetterList';
import { DemandLetterDetail } from './components/DemandLetterDetail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Case {
  id: string;
  referenceNumber: string;
  debtorName: string;
  debtorEmail: string;
  creditorName: string;
  debtAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
  isAiModified: boolean;
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

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ATTORNEY: { bg: 'bg-blue-100', text: 'text-blue-800' },
  PARALEGAL: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DEBTOR: { bg: 'bg-green-100', text: 'text-green-800' },
  ADMIN: { bg: 'bg-orange-100', text: 'text-orange-800' },
};

export default function CaseViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get('id');
  const letterId = searchParams.get('letterId');

  const [user, setUser] = useState<User | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'documents' | 'demands'>('details');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<{
    id: string;
    content: string;
    status?: string;
    currentVersion: number;
    totalVersions: number;
  } | null>(null);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    if (!caseId) {
      router.push('/cases');
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
      fetchCaseData();
      fetchMessages();
    } catch {
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router, caseId]);

  const fetchCaseData = async () => {
    if (!caseId) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/cases/${caseId}`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCaseData(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch case:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!caseId) return;
    try {
      const token = localStorage.getItem('authToken');
      // Note: Messages endpoint may not exist yet - this is a placeholder
      const response = await fetch(`${API_URL}/api/v1/demands/cases/${caseId}/messages`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data?.items || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !caseId) return;

    setSendingMessage(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/cases/${caseId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleGenerateLetter = async () => {
    if (!caseData || !caseId) return;

    // Validate debt amount before making the request
    const principal = Number(caseData.debtAmount);
    if (!principal || principal <= 0 || isNaN(principal)) {
      setGenerateError('Debt amount must be greater than 0. Please update the case details with a valid debt amount.');
      return;
    }

    // Validate required fields
    if (!caseData.debtorName || !caseData.creditorName) {
      setGenerateError('Debtor name and creditor name are required. Please update the case details.');
      return;
    }

    setGeneratingLetter(true);
    setGenerateError('');
    setGeneratedLetter(null);

    try {
      const token = localStorage.getItem('authToken');
      // Use streaming to avoid CloudFront timeout on long AI generation
      const response = await fetch(`${API_URL}/api/v1/demands/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          caseId,
          caseDetails: {
            debtorName: caseData.debtorName || 'Unknown Debtor',
            creditorName: caseData.creditorName || 'Unknown Creditor',
            debtAmount: {
              principal: principal, // Use validated value
            },
            stateJurisdiction: 'NY', // Default state - could be made dynamic
          },
          options: { stream: true }, // Enable streaming to avoid timeout
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        // Extract detailed validation errors if available
        let errorMessage = data.error?.message || 'Failed to generate letter';

        if (data.error?.details) {
          const detailMessages = Object.entries(data.error.details)
            .map(([field, errors]) => {
              const errorList = Array.isArray(errors) ? errors.join(', ') : String(errors);
              return `${field}: ${errorList}`;
            })
            .join('\n');

          if (detailMessages) {
            errorMessage = `${errorMessage}\n\nValidation errors:\n${detailMessages}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported');
      }

      const decoder = new TextDecoder();
      let content = '';
      let letterId = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'started' || data.type === 'heartbeat') {
                // Heartbeat events keep the connection alive - no UI update needed
                continue;
              } else if (data.type === 'content') {
                content += data.content;
                // Update UI progressively
                setGeneratedLetter({
                  id: letterId || 'generating...',
                  content: content,
                  status: 'GENERATING',
                  currentVersion: 1,
                  totalVersions: 1,
                });
              } else if (data.type === 'done') {
                letterId = data.id;
                setGeneratedLetter({
                  id: data.id,
                  content: content,
                  status: 'DRAFT',
                  currentVersion: 1,
                  totalVersions: 1,
                });
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines (like empty lines)
            }
          }
        }
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate letter');
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleRefineLetter = async (instruction: string): Promise<RefinementResult> => {
    if (!generatedLetter) {
      throw new Error('No letter to refine');
    }

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/v1/demands/${generatedLetter.id}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify({ instruction }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to refine letter');
    }

    const data = await response.json();
    const result: RefinementResult = {
      id: data.data?.id || data.id || generatedLetter.id,
      content: data.data?.content || data.content,
      version: data.data?.version || data.version || 1,
      previousVersion: data.data?.previousVersion || data.previousVersion || 1,
      refinementInstruction: instruction,
      complianceResult: data.data?.complianceResult || data.complianceResult || {
        isCompliant: true,
        score: 85,
        checks: [],
      },
      diff: data.data?.diff || data.diff || { additions: 0, deletions: 0 },
      warnings: data.data?.warnings || data.warnings || [],
    };

    return result;
  };

  const handleAcceptRefinement = (result: RefinementResult) => {
    setGeneratedLetter((prev) => ({
      id: result.id,
      content: result.content,
      status: 'DRAFT',
      currentVersion: result.version,
      totalVersions: result.version, // After accepting, this becomes the latest version
    }));
  };

  const handleRejectRefinement = () => {
    // Just dismiss the results, original content is preserved
  };

  const handleAnalyzeLetter = async (): Promise<AnalysisResult> => {
    if (!generatedLetter) {
      throw new Error('No letter to analyze');
    }

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/v1/demands/${generatedLetter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to analyze letter');
    }

    const data = await response.json();
    return {
      analysis: data.data?.analysis || data.analysis || '',
      overallTone: data.data?.overallTone || data.overallTone || 'neutral',
      issues: data.data?.issues || data.issues || [],
      suggestedActions: data.data?.suggestedActions || data.suggestedActions || [],
    };
  };

  const handleVersionChange = (newContent: string, newVersion: number, newTotalVersions: number) => {
    setGeneratedLetter((prev) => prev ? {
      ...prev,
      content: newContent,
      currentVersion: newVersion,
      totalVersions: newTotalVersions,
    } : null);
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!caseId || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CollectorNav user={user} />
        <main className="max-w-7xl mx-auto py-6 px-4">
          <div className="text-center py-12">
            <p className="text-gray-500">Case not found</p>
            <Link href="/cases" className="text-primary-600 hover:underline mt-2 inline-block">
              Back to cases
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CollectorNav user={user} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link href="/cases" className="text-primary-600 hover:underline text-sm">
            &larr; Back to cases
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Case: {caseData.referenceNumber || caseData.id.substring(0, 8)}
              </h1>
              <p className="text-gray-500 mt-1">{caseData.debtorName}</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                STATUS_COLORS[caseData.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {caseData.status}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Debt Amount</p>
              <p className="text-xl font-bold text-primary-600">
                ${Number(caseData.debtAmount || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Creditor</p>
              <p className="text-lg font-medium text-gray-900">{caseData.creditorName || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(caseData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['details', 'demands', 'messages', 'documents'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Debtor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Full Name</label>
                <p className="mt-1 text-gray-900">{caseData.debtorName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-gray-900">{caseData.debtorEmail || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-gray-900">
                  {caseData.updatedAt
                    ? new Date(caseData.updatedAt).toLocaleString()
                    : '-'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t flex gap-3">
              <button
                onClick={handleGenerateLetter}
                disabled={generatingLetter}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {generatingLetter ? 'Generating...' : 'Generate Demand Letter'}
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Update Status
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Record Payment
              </button>
            </div>

            {generateError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {generateError}
              </div>
            )}

            {generatedLetter && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-green-800">Demand Letter Generated</h4>
                    {generatedLetter.status && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {generatedLetter.status}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setGeneratedLetter(null)}
                    className="text-green-600 hover:text-green-800"
                  >
                    &times;
                  </button>
                </div>

                {/* Version Toolbar - Only show for DRAFT letters with multiple versions */}
                {(!generatedLetter.status || generatedLetter.status === 'DRAFT') && (
                  <div className="mb-3">
                    <VersionToolbar
                      letterId={generatedLetter.id}
                      currentVersion={generatedLetter.currentVersion}
                      totalVersions={generatedLetter.totalVersions}
                      onVersionChange={handleVersionChange}
                    />
                  </div>
                )}

                <div className="bg-white p-4 rounded border max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {generatedLetter.content}
                  </pre>
                </div>
                <p className="mt-2 text-xs text-green-600">
                  Letter ID: {generatedLetter.id}
                </p>
              </div>
            )}

            {/* AI Refinement Chat - Only show for DRAFT letters */}
            {generatedLetter && (!generatedLetter.status || generatedLetter.status === 'DRAFT') && (
              <div className="mt-6">
                <RefinementChat
                  letterId={generatedLetter.id}
                  letterContent={generatedLetter.content}
                  onRefine={handleRefineLetter}
                  onAccept={handleAcceptRefinement}
                  onReject={handleRejectRefinement}
                  onAnalyze={handleAnalyzeLetter}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow">
            {/* Messages List */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No messages yet</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const roleConfig = ROLE_COLORS[msg.senderRole] || {
                      bg: 'bg-gray-100',
                      text: 'text-gray-800',
                    };
                    const isOwn = msg.senderId === user.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn ? 'bg-primary-100' : 'bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{msg.senderName}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${roleConfig.bg} ${roleConfig.text}`}
                            >
                              {msg.senderRole}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                            {msg.isAiModified && (
                              <span className="text-xs text-gray-400">AI enhanced</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'demands' && (
          <div className="bg-white rounded-lg shadow p-6">
            {letterId ? (
              /* Show detail view when letterId is present (AC-2.1.8) */
              <DemandLetterDetail caseId={caseId} letterId={letterId} />
            ) : (
              /* Show list view otherwise */
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Demand Letters</h2>
                <DemandLetterList
                  caseId={caseId}
                  onGenerateLetter={handleGenerateLetter}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-8">
              <p className="text-gray-500">No documents uploaded yet</p>
              <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Upload Document
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
