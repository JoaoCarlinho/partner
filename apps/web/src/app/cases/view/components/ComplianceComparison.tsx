'use client';

interface ComplianceCheck {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
}

interface ComplianceResult {
  isCompliant: boolean;
  score: number;
  checks: ComplianceCheck[];
}

interface ComplianceChange {
  before: number;
  after: number;
  change: number;
  direction: 'improved' | 'declined' | 'same';
  isSignificantImprovement: boolean;
}

interface CheckChange {
  check: ComplianceCheck;
  status: 'newly-passing' | 'newly-failing' | 'unchanged';
}

interface ComplianceComparisonProps {
  beforeCompliance: ComplianceResult;
  afterCompliance: ComplianceResult;
}

// Calculate compliance score change
export function calculateComplianceChange(before: number, after: number): ComplianceChange {
  const change = after - before;
  const direction = change > 0 ? 'improved' : change < 0 ? 'declined' : 'same';
  return {
    before,
    after,
    change,
    direction,
    isSignificantImprovement: change >= 10,
  };
}

// Compare individual compliance checks
export function compareChecks(
  beforeChecks: ComplianceCheck[],
  afterChecks: ComplianceCheck[]
): CheckChange[] {
  return afterChecks.map((afterCheck) => {
    const beforeCheck = beforeChecks.find((c) => c.id === afterCheck.id);
    if (!beforeCheck) return { check: afterCheck, status: 'unchanged' as const };

    if (!beforeCheck.passed && afterCheck.passed) {
      return { check: afterCheck, status: 'newly-passing' as const };
    }
    if (beforeCheck.passed && !afterCheck.passed) {
      return { check: afterCheck, status: 'newly-failing' as const };
    }
    return { check: afterCheck, status: 'unchanged' as const };
  });
}

// Get score bar color based on score
function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ComplianceComparison({
  beforeCompliance,
  afterCompliance,
}: ComplianceComparisonProps) {
  const scoreChange = calculateComplianceChange(
    beforeCompliance.score,
    afterCompliance.score
  );

  const checkChanges = compareChecks(
    beforeCompliance.checks,
    afterCompliance.checks
  );

  const changedChecks = checkChanges.filter((c) => c.status !== 'unchanged');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">Compliance Impact</h4>

      {/* Score Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Before Score */}
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Before</p>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="relative w-full h-3 bg-gray-200 rounded-full mb-2">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${getScoreColor(beforeCompliance.score)}`}
                style={{ width: `${beforeCompliance.score}%` }}
              ></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{beforeCompliance.score}%</p>
          </div>
        </div>

        {/* After Score */}
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">After</p>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="relative w-full h-3 bg-gray-200 rounded-full mb-2">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${getScoreColor(afterCompliance.score)}`}
                style={{ width: `${afterCompliance.score}%` }}
              ></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{afterCompliance.score}%</p>
          </div>
        </div>
      </div>

      {/* Change Indicator */}
      <div className="text-center mb-4">
        {scoreChange.direction === 'improved' && (
          <div className="flex items-center justify-center gap-1 text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="font-medium">+{scoreChange.change}% improvement</span>
          </div>
        )}
        {scoreChange.direction === 'declined' && (
          <div className="flex items-center justify-center gap-1 text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="font-medium">{scoreChange.change}% decline</span>
          </div>
        )}
        {scoreChange.direction === 'same' && (
          <div className="flex items-center justify-center gap-1 text-gray-500">
            <span className="font-medium">—</span>
            <span className="font-medium">No change</span>
          </div>
        )}
      </div>

      {/* Check Changes */}
      {changedChecks.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Check Changes:</p>
          <ul className="space-y-2">
            {changedChecks.map((item, index) => (
              <li key={item.check.id || index} className="flex items-center gap-2">
                {item.status === 'newly-passing' ? (
                  <>
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-700">
                      {item.check.name} <span className="text-green-500">— now passing</span>
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-red-700">
                      {item.check.name} <span className="text-red-500">— now failing</span>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Export types
export type { ComplianceChange, CheckChange, ComplianceComparisonProps };
