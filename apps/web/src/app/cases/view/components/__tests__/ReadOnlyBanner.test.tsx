import { render, screen } from '@testing-library/react';
import { ReadOnlyBanner } from '../ReadOnlyBanner';
import { DemandLetterStatus } from '@/components/StatusBadge';

describe('ReadOnlyBanner', () => {
  // AC-2.3.3: Clear visual indication of read-only state
  describe('Visual Display (AC-2.3.3)', () => {
    it('renders banner with lock icon for SENT status', () => {
      render(<ReadOnlyBanner status="SENT" />);

      expect(screen.getByTestId('read-only-banner')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does not render banner for DRAFT status', () => {
      render(<ReadOnlyBanner status="DRAFT" />);

      expect(screen.queryByTestId('read-only-banner')).not.toBeInTheDocument();
    });
  });

  // AC-2.3.6: Status-specific messages
  describe('Status-Specific Messages (AC-2.3.6)', () => {
    it('shows correct message for PENDING_REVIEW', () => {
      render(<ReadOnlyBanner status="PENDING_REVIEW" />);

      expect(screen.getByText(/awaiting attorney review/)).toBeInTheDocument();
    });

    it('shows correct message for APPROVED', () => {
      render(<ReadOnlyBanner status="APPROVED" />);

      expect(screen.getByText(/has been approved/)).toBeInTheDocument();
    });

    it('shows correct message for READY_TO_SEND', () => {
      render(<ReadOnlyBanner status="READY_TO_SEND" />);

      expect(screen.getByText(/ready to send/)).toBeInTheDocument();
    });

    it('shows correct message for SENT', () => {
      render(<ReadOnlyBanner status="SENT" />);

      expect(screen.getByText(/has been sent/)).toBeInTheDocument();
    });
  });

  // AC-2.3.4: All non-DRAFT statuses are read-only
  describe('Non-DRAFT Statuses (AC-2.3.4)', () => {
    const readOnlyStatuses: DemandLetterStatus[] = [
      'PENDING_REVIEW',
      'APPROVED',
      'READY_TO_SEND',
      'SENT',
    ];

    it.each(readOnlyStatuses)('shows banner for %s status', (status) => {
      render(<ReadOnlyBanner status={status} />);

      expect(screen.getByTestId('read-only-banner')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className when provided', () => {
      const { container } = render(
        <ReadOnlyBanner status="SENT" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has appropriate ARIA role for accessibility', () => {
      render(<ReadOnlyBanner status="SENT" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
