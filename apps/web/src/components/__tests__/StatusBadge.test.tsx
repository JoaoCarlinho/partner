import { render, screen } from '@testing-library/react';
import { StatusBadge, DEMAND_STATUS_COLORS, DemandLetterStatus } from '../StatusBadge';

const STATUS_LABELS: Record<DemandLetterStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  READY_TO_SEND: 'Ready to Send',
  SENT: 'Sent',
};

describe('StatusBadge', () => {
  const statuses: DemandLetterStatus[] = [
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'READY_TO_SEND',
    'SENT',
  ];

  it.each(statuses)('renders correct classes for %s status', (status) => {
    render(<StatusBadge status={status} />);

    const badge = screen.getByText(STATUS_LABELS[status]);
    const expectedClasses = DEMAND_STATUS_COLORS[status];

    expectedClasses.split(' ').forEach((className) => {
      expect(badge).toHaveClass(className);
    });
  });

  it('renders DRAFT with gray styling', () => {
    render(<StatusBadge status="DRAFT" />);
    const badge = screen.getByText('Draft');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('renders PENDING_REVIEW with yellow styling', () => {
    render(<StatusBadge status="PENDING_REVIEW" />);
    const badge = screen.getByText('Pending Review');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('renders APPROVED with green styling', () => {
    render(<StatusBadge status="APPROVED" />);
    const badge = screen.getByText('Approved');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('renders READY_TO_SEND with blue styling', () => {
    render(<StatusBadge status="READY_TO_SEND" />);
    const badge = screen.getByText('Ready to Send');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('renders SENT with purple styling', () => {
    render(<StatusBadge status="SENT" />);
    const badge = screen.getByText('Sent');
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-800');
  });

  it('has correct aria-label for accessibility', () => {
    render(<StatusBadge status="DRAFT" />);
    const badge = screen.getByLabelText('Status: Draft');
    expect(badge).toBeInTheDocument();
  });

  it('applies additional className when provided', () => {
    render(<StatusBadge status="DRAFT" className="custom-class" />);
    const badge = screen.getByText('Draft');
    expect(badge).toHaveClass('custom-class');
  });
});
