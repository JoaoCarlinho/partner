import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DefenderCaseViewRoute from '../cases/[caseId]/page';
import * as hooks from '@/features/defender/hooks';

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useParams: () => ({ caseId: 'test-case-123' }),
  usePathname: () => '/defender/cases/test-case-123',
}));

// Mock the hooks module
jest.mock('@/features/defender/hooks', () => ({
  useDefenderAuth: jest.fn(),
  useCaseAssignment: jest.fn(),
}));

// Mock CaseViewPage component
jest.mock('@/features/defender/pages/CaseViewPage', () => ({
  CaseViewPage: ({ caseId }: { caseId: string }) => (
    <div data-testid="case-view-page">Case View: {caseId}</div>
  ),
}));

describe('DefenderCaseViewRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it('shows loading state while checking auth and assignment', () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: null,
      loading: true,
      error: null,
      errorCode: null,
    });

    render(<DefenderCaseViewRoute />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects unauthenticated users to login', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: null,
      loading: false,
      error: null,
      errorCode: null,
    });

    render(<DefenderCaseViewRoute />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/defender/cases/test-case-123');
    });
  });

  it('shows 404 error for non-existent case', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: null,
      loading: false,
      error: 'Case not found',
      errorCode: 404,
    });

    render(<DefenderCaseViewRoute />);

    await waitFor(() => {
      expect(screen.getByText('Case Not Found')).toBeInTheDocument();
      expect(screen.getByText(/This case does not exist/)).toBeInTheDocument();
      expect(screen.getByText('Back to Assignments')).toBeInTheDocument();
    });
  });

  it('shows 403 error for unauthorized access', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: null,
      loading: false,
      error: 'Access denied',
      errorCode: 403,
    });

    render(<DefenderCaseViewRoute />);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have access to this case/)).toBeInTheDocument();
    });
  });

  it('renders case view for valid assignment', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: {
        id: 'assignment-1',
        caseId: 'test-case-123',
        debtorName: 'John D.',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
      },
      loading: false,
      error: null,
      errorCode: null,
    });

    render(<DefenderCaseViewRoute />);

    await waitFor(() => {
      expect(screen.getByTestId('case-view-page')).toBeInTheDocument();
      expect(screen.getByText('Case View: test-case-123')).toBeInTheDocument();
    });
  });

  it('displays breadcrumb navigation', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: {
        id: 'assignment-1',
        caseId: 'test-case-123',
        debtorName: 'John D.',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
      },
      loading: false,
      error: null,
      errorCode: null,
    });

    render(<DefenderCaseViewRoute />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Assignments')).toBeInTheDocument();
      expect(screen.getByText('Case: John D.')).toBeInTheDocument();
    });
  });

  it('displays back button', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useCaseAssignment as jest.Mock).mockReturnValue({
      assignment: {
        id: 'assignment-1',
        caseId: 'test-case-123',
        debtorName: 'John D.',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
      },
      loading: false,
      error: null,
      errorCode: null,
    });

    render(<DefenderCaseViewRoute />);

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });
});
