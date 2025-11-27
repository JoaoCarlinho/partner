import { render, screen } from '@testing-library/react';
import { CompliancePanel, ComplianceResult, ComplianceCheck } from '../CompliancePanel';

describe('CompliancePanel', () => {
  const mockChecks: ComplianceCheck[] = [
    { id: '1', name: 'FDCPA Disclosure', passed: true, required: true },
    { id: '2', name: 'Debt Amount Stated', passed: true, required: true },
    { id: '3', name: 'Dispute Rights', passed: false, required: true, message: 'Missing 30-day notice' },
    { id: '4', name: 'Optional Check', passed: false, required: false, message: 'Optional warning' },
  ];

  const mockComplianceResult: ComplianceResult = {
    isCompliant: false,
    score: 85,
    checks: mockChecks,
  };

  // AC-2.1.3: Display compliance score as percentage
  describe('Compliance Score Display (AC-2.1.3)', () => {
    it('renders compliance score as percentage', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      const scoreElement = screen.getByTestId('compliance-score');
      expect(scoreElement).toHaveTextContent('85%');
    });

    it('renders progress bar with correct width', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
      expect(progressBar).toHaveStyle({ width: '85%' });
    });

    it('renders green color for score >= 90', () => {
      const highScoreResult: ComplianceResult = { ...mockComplianceResult, score: 95 };
      render(<CompliancePanel complianceResult={highScoreResult} />);

      const scoreElement = screen.getByTestId('compliance-score');
      expect(scoreElement).toHaveClass('text-green-600');
    });

    it('renders yellow color for score >= 70 and < 90', () => {
      const mediumScoreResult: ComplianceResult = { ...mockComplianceResult, score: 75 };
      render(<CompliancePanel complianceResult={mediumScoreResult} />);

      const scoreElement = screen.getByTestId('compliance-score');
      expect(scoreElement).toHaveClass('text-yellow-600');
    });

    it('renders red color for score < 70', () => {
      const lowScoreResult: ComplianceResult = { ...mockComplianceResult, score: 50 };
      render(<CompliancePanel complianceResult={lowScoreResult} />);

      const scoreElement = screen.getByTestId('compliance-score');
      expect(scoreElement).toHaveClass('text-red-600');
    });
  });

  // AC-2.1.4: Each compliance check shows name, pass/fail status, and message if failed
  describe('Compliance Checks Display (AC-2.1.4)', () => {
    it('renders all compliance checks', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      mockChecks.forEach((check) => {
        expect(screen.getByText(check.name)).toBeInTheDocument();
      });
    });

    it('shows checkmark icon for passing checks', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      const passingCheck = screen.getByTestId('compliance-check-1');
      // The CheckCircle icon should be present with green color
      const icon = passingCheck.querySelector('svg');
      expect(icon).toHaveClass('text-green-500');
    });

    it('shows X icon for failing required checks', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      const failingCheck = screen.getByTestId('compliance-check-3');
      // The XCircle icon should be present with red color
      const icon = failingCheck.querySelector('svg');
      expect(icon).toHaveClass('text-red-500');
    });

    it('shows warning icon for failing optional checks', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      const optionalFailingCheck = screen.getByTestId('compliance-check-4');
      // The AlertCircle icon should be present with yellow color
      const icon = optionalFailingCheck.querySelector('svg');
      expect(icon).toHaveClass('text-yellow-500');
    });

    it('shows message for failed checks', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      expect(screen.getByText('Missing 30-day notice')).toBeInTheDocument();
      expect(screen.getByText('Optional warning')).toBeInTheDocument();
    });

    it('shows "(optional)" label for non-required checks', () => {
      render(<CompliancePanel complianceResult={mockComplianceResult} />);

      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });

    it('does not show message for passing checks', () => {
      const passOnlyResult: ComplianceResult = {
        isCompliant: true,
        score: 100,
        checks: [
          { id: '1', name: 'Test Check', passed: true, required: true, message: 'This should not show' },
        ],
      };
      render(<CompliancePanel complianceResult={passOnlyResult} />);

      expect(screen.queryByText('This should not show')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows message when no checks available', () => {
      const emptyResult: ComplianceResult = {
        isCompliant: true,
        score: 100,
        checks: [],
      };
      render(<CompliancePanel complianceResult={emptyResult} />);

      expect(screen.getByText('No compliance checks available')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies additional className when provided', () => {
      const { container } = render(
        <CompliancePanel complianceResult={mockComplianceResult} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
