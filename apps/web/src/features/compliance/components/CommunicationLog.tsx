/**
 * Communication Log Component
 * Searchable and filterable communication history for compliance
 */

import React, { useState, useEffect } from 'react';

/**
 * Communication log entry
 */
interface LogEntry {
  id: string;
  caseId: string;
  debtorId: string;
  creditorId: string | null;
  communicationType: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  content: string | null;
  toneScore: number | null;
  compliant: boolean;
  complianceIssues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  timestamp: string;
}

interface CommunicationLogProps {
  caseId?: string;
  className?: string;
}

/**
 * Direction badge
 */
const DirectionBadge: React.FC<{ direction: 'inbound' | 'outbound' }> = ({ direction }) => (
  <span
    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
      direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
    }`}
  >
    {direction === 'inbound' ? '← In' : '→ Out'}
  </span>
);

/**
 * Compliance badge
 */
const ComplianceBadge: React.FC<{ compliant: boolean; issueCount: number }> = ({
  compliant,
  issueCount,
}) => {
  if (compliant) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
        ✓ Compliant
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
      ⚠ {issueCount} issue{issueCount !== 1 ? 's' : ''}
    </span>
  );
};

/**
 * Channel icon
 */
const ChannelIcon: React.FC<{ channel: string }> = ({ channel }) => {
  const icons: Record<string, string> = {
    platform: '💬',
    email: '📧',
    sms: '📱',
    phone: '📞',
  };
  return <span>{icons[channel] || '📋'}</span>;
};

/**
 * Log entry row
 */
const LogEntryRow: React.FC<{ entry: LogEntry; onSelect: () => void }> = ({ entry, onSelect }) => (
  <tr
    className="hover:bg-gray-50 cursor-pointer"
    onClick={onSelect}
  >
    <td className="px-4 py-3 text-sm text-gray-500">
      {new Date(entry.timestamp).toLocaleString()}
    </td>
    <td className="px-4 py-3">
      <DirectionBadge direction={entry.direction} />
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <ChannelIcon channel={entry.channel} />
        <span className="text-sm text-gray-700 capitalize">{entry.channel}</span>
      </div>
    </td>
    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
      {entry.content || '-'}
    </td>
    <td className="px-4 py-3 text-center">
      {entry.toneScore !== null ? (
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${
            entry.toneScore >= 50
              ? 'bg-green-100 text-green-700'
              : entry.toneScore >= 30
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {entry.toneScore}
        </span>
      ) : (
        '-'
      )}
    </td>
    <td className="px-4 py-3">
      <ComplianceBadge compliant={entry.compliant} issueCount={entry.complianceIssues.length} />
    </td>
  </tr>
);

export const CommunicationLog: React.FC<CommunicationLogProps> = ({ caseId, className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [filters, setFilters] = useState({
    direction: '',
    compliant: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [caseId, filters, page]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.direction) params.set('direction', filters.direction);
      if (filters.compliant) params.set('compliantOnly', filters.compliant);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      params.set('page', page.toString());
      params.set('limit', '20');

      const url = caseId
        ? `/api/v1/compliance/cases/${caseId}/communication-log?${params}`
        : `/api/v1/compliance/communication-log?${params}`;

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setLogs(result.data);
        setTotalPages(result.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load communication log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Communication Log</h3>
        <p className="text-sm text-gray-600">All communications with compliance status</p>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.direction}
            onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>

          <select
            value={filters.compliant}
            onChange={(e) => setFilters({ ...filters, compliant: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Compliant Only</option>
            <option value="false">Non-Compliant Only</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="End Date"
          />

          <button
            onClick={() => setFilters({ direction: '', compliant: '', startDate: '', endDate: '' })}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No communications found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Content
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((entry) => (
                <LogEntryRow
                  key={entry.id}
                  entry={entry}
                  onSelect={() => setSelectedEntry(entry)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Communication Details</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="font-medium">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Direction</p>
                  <DirectionBadge direction={selectedEntry.direction} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Channel</p>
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={selectedEntry.channel} />
                    <span className="capitalize">{selectedEntry.channel}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tone Score</p>
                  <p className="font-medium">{selectedEntry.toneScore ?? '-'}</p>
                </div>
              </div>

              {selectedEntry.content && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Content</p>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">{selectedEntry.content}</div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Compliance Status</p>
                <ComplianceBadge
                  compliant={selectedEntry.compliant}
                  issueCount={selectedEntry.complianceIssues.length}
                />
              </div>

              {selectedEntry.complianceIssues.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Issues</p>
                  <div className="space-y-2">
                    {selectedEntry.complianceIssues.map((issue, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${
                          issue.severity === 'violation'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}
                      >
                        <p className="font-medium text-sm">{issue.type}</p>
                        <p className="text-sm text-gray-600">{issue.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationLog;
