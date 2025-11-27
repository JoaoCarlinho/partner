import { render, screen } from '@testing-library/react';
import {
  ComplianceComparison,
  calculateComplianceChange,
  compareChecks,
} from '../ComplianceComparison';

describe('ComplianceComparison', () => {
  const mockBeforeCompliance = {
    isCompliant: false,
    score: 75,
    checks: [
      { id: 'check-1', name: 'Dispute Rights', passed: false, message: 'Missing dispute rights' },
      { id: 'check-2', name: 'Clear Language', passed: true },
      { id: 'check-3', name: 'Contact Info', passed: true },
    ],
  };

  const mockAfterCompliance = {
    isCompliant: true,
    score: 92,
    checks: [
      { id: 'check-1', name: 'Dispute Rights', passed: true },
      { id: 'check-2', name: 'Clear Language', passed: true },
      { id: 'check-3', name: 'Contact Info', passed: false, message: 'Missing contact info' },
    ],
  };

  describe('calculateComplianceChange', () => {
    it('calculates improvement correctly', () => {
      const change = calculateComplianceChange(75, 92);
      expect(change.before).toBe(75);
      expect(change.after).toBe(92);
      expect(change.change).toBe(17);
      expect(change.direction).toBe('improved');
    });

    it('calculates decline correctly', () => {
      const change = calculateComplianceChange(85, 70);
      expect(change.before).toBe(85);
      expect(change.after).toBe(70);
      expect(change.change).toBe(-15);
      expect(change.direction).toBe('declined');
    });

    it('calculates no change correctly', () => {
      const change = calculateComplianceChange(80, 80);
      expect(change.change).toBe(0);
      expect(change.direction).toBe('same');
    });

    it('identifies significant improvement (>= 10%)', () => {
      const change = calculateComplianceChange(70, 82);
      expect(change.isSignificantImprovement).toBe(true);
    });

    it('identifies non-significant improvement (< 10%)', () => {
      const change = calculateComplianceChange(80, 87);
      expect(change.isSignificantImprovement).toBe(false);
    });
  });

  describe('compareChecks', () => {
    it('identifies newly passing checks', () => {
      const changes = compareChecks(
        mockBeforeCompliance.checks,
        mockAfterCompliance.checks
      );

      const newlyPassing = changes.filter((c) => c.status === 'newly-passing');
      expect(newlyPassing).toHaveLength(1);
      expect(newlyPassing[0].check.name).toBe('Dispute Rights');
    });

    it('identifies newly failing checks', () => {
      const changes = compareChecks(
        mockBeforeCompliance.checks,
        mockAfterCompliance.checks
      );

      const newlyFailing = changes.filter((c) => c.status === 'newly-failing');
      expect(newlyFailing).toHaveLength(1);
      expect(newlyFailing[0].check.name).toBe('Contact Info');
    });

    it('identifies unchanged checks', () => {
      const changes = compareChecks(
        mockBeforeCompliance.checks,
        mockAfterCompliance.checks
      );

      const unchanged = changes.filter((c) => c.status === 'unchanged');
      expect(unchanged).toHaveLength(1);
      expect(unchanged[0].check.name).toBe('Clear Language');
    });
  });

  describe('ComplianceComparison component', () => {
    it('displays before and after scores', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('displays improvement indicator when score increases', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText(/\+17% improvement/)).toBeInTheDocument();
    });

    it('displays decline indicator when score decreases', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockAfterCompliance}
          afterCompliance={mockBeforeCompliance}
        />
      );

      expect(screen.getByText(/-17% decline/)).toBeInTheDocument();
    });

    it('displays no change indicator when score is same', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={{ ...mockBeforeCompliance }}
        />
      );

      expect(screen.getByText('No change')).toBeInTheDocument();
    });

    it('displays newly passing checks in green', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText(/Dispute Rights/)).toBeInTheDocument();
      expect(screen.getByText(/now passing/)).toBeInTheDocument();
    });

    it('displays newly failing checks in red', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText(/Contact Info/)).toBeInTheDocument();
      expect(screen.getByText(/now failing/)).toBeInTheDocument();
    });

    it('shows Before and After labels', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText('Before')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();
    });

    it('shows Compliance Impact heading', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText('Compliance Impact')).toBeInTheDocument();
    });

    it('shows Check Changes section when there are changes', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={mockAfterCompliance}
        />
      );

      expect(screen.getByText('Check Changes:')).toBeInTheDocument();
    });

    it('does not show Check Changes section when no checks changed', () => {
      render(
        <ComplianceComparison
          beforeCompliance={mockBeforeCompliance}
          afterCompliance={{ ...mockBeforeCompliance }}
        />
      );

      expect(screen.queryByText('Check Changes:')).not.toBeInTheDocument();
    });
  });
});
