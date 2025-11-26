/**
 * Compliance Report Component
 * Export controls and report generation for compliance audits
 */

import React, { useState } from 'react';

interface ComplianceReportProps {
  caseId?: string;
  className?: string;
}

export const ComplianceReport: React.FC<ComplianceReportProps> = ({ caseId, className = '' }) => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [format, setFormat] = useState<'json' | 'csv'>('csv');
  const [includeFlags, setIncludeFlags] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<{
    communications: number;
    flags: number;
    violations: number;
    complianceRate: number;
  } | null>(null);

  const loadPreview = async () => {
    try {
      const params = new URLSearchParams();
      if (caseId) params.set('caseId', caseId);
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);
      params.set('includeFlags', 'true');
      params.set('format', 'json');

      const response = await fetch(`/api/v1/compliance/export?${params}`);
      const result = await response.json();

      if (result.success) {
        setPreviewData({
          communications: result.data.communications.length,
          flags: result.data.flags.length,
          violations: result.data.summary.violations,
          complianceRate: result.data.summary.complianceRate,
        });
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (caseId) params.set('caseId', caseId);
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);
      params.set('includeFlags', includeFlags.toString());
      params.set('format', format);

      const response = await fetch(`/api/v1/compliance/export?${params}`);

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json();
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Compliance Report</h3>
        <p className="text-sm text-gray-600">Export communication and compliance data for audits</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Case info */}
        {caseId && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Filtered by Case:</span> {caseId}
            </p>
          </div>
        )}

        {/* Date range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Format selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
                className="text-blue-600"
              />
              <span className="text-sm">CSV (Spreadsheet)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
                className="text-blue-600"
              />
              <span className="text-sm">JSON (Data)</span>
            </label>
          </div>
        </div>

        {/* Include flags */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeFlags}
            onChange={(e) => setIncludeFlags(e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">Include compliance flags</span>
        </label>

        {/* Preview */}
        <div>
          <button
            onClick={loadPreview}
            className="text-sm text-blue-600 hover:underline"
          >
            Preview export contents
          </button>
          {previewData && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Export Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Communications:</span>
                  <span className="ml-2 font-medium">{previewData.communications}</span>
                </div>
                <div>
                  <span className="text-gray-500">Flags:</span>
                  <span className="ml-2 font-medium">{previewData.flags}</span>
                </div>
                <div>
                  <span className="text-gray-500">Violations:</span>
                  <span className="ml-2 font-medium text-red-600">{previewData.violations}</span>
                </div>
                <div>
                  <span className="text-gray-500">Compliance Rate:</span>
                  <span className="ml-2 font-medium text-green-600">{previewData.complianceRate}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Report
            </>
          )}
        </button>

        {/* Format info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>CSV Format:</strong> Ideal for spreadsheet applications (Excel, Google Sheets)
          </p>
          <p>
            <strong>JSON Format:</strong> Ideal for data analysis and integration with other systems
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceReport;
