import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DefenderDashboardPage from '../dashboard/page';
import * as hooks from '@/features/defender/hooks';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  usePathname: () => '/defender/dashboard',
}));

// Mock the hooks module
jest.mock('@/features/defender/hooks', () => ({
  useDefenderAuth: jest.fn(),
  useUserProfile: jest.fn(),
  useDefenderDashboard: jest.fn(),
}));

// Mock AssignmentList component
jest.mock('@/features/defender/components/AssignmentList', () => ({
  AssignmentList: () => <div data-testid="assignment-list">Assignment List</div>,
}));

describe('DefenderDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it('shows loading state while checking auth', () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    const { container } = render(<DefenderDashboardPage />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects unauthenticated users to login', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/defender/dashboard');
    });
  });

  it('redirects non-ACTIVE users to onboarding', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Doe', status: 'TERMS_PENDING' },
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/defender/onboarding');
    });
  });

  it('renders dashboard for authenticated ACTIVE users', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', status: 'ACTIVE', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: {
        summary: {
          activeCases: 6,
          needsAttention: 2,
          completedCases: 12,
          pendingConsent: 3,
        },
        recentActivity: [],
        upcomingDeadlines: [],
      },
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Jane')).toBeInTheDocument();
    });
  });

  it('displays summary cards with correct counts', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', status: 'ACTIVE' },
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: {
        summary: {
          activeCases: 6,
          needsAttention: 2,
          completedCases: 12,
          pendingConsent: 3,
        },
        recentActivity: [],
        upcomingDeadlines: [],
      },
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument(); // Active Cases
      expect(screen.getByText('2')).toBeInTheDocument(); // Needs Attention
      expect(screen.getByText('12')).toBeInTheDocument(); // Completed
      expect(screen.getByText('3')).toBeInTheDocument(); // Pending Consent
    });
  });

  it('displays recent activity', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', status: 'ACTIVE' },
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: {
        summary: { activeCases: 0, needsAttention: 0, completedCases: 0, pendingConsent: 0 },
        recentActivity: [
          { type: 'PAYMENT', description: 'Payment received for Case #1234', timestamp: new Date().toISOString() },
        ],
        upcomingDeadlines: [],
      },
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Payment received for Case #1234')).toBeInTheDocument();
    });
  });

  it('displays upcoming deadlines', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', status: 'ACTIVE' },
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: {
        summary: { activeCases: 0, needsAttention: 0, completedCases: 0, pendingConsent: 0 },
        recentActivity: [],
        upcomingDeadlines: [
          { caseId: 'c1', debtorName: 'John D.', deadline: new Date().toISOString(), type: 'Payment Due' },
        ],
      },
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John D.')).toBeInTheDocument();
      expect(screen.getByText('Payment Due')).toBeInTheDocument();
    });
  });

  it('shows quick links section', async () => {
    (hooks.useDefenderAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', status: 'ACTIVE' },
      loading: false,
      error: null,
    });
    (hooks.useDefenderDashboard as jest.Mock).mockReturnValue({
      data: {
        summary: { activeCases: 0, needsAttention: 0, completedCases: 0, pendingConsent: 0 },
        recentActivity: [],
        upcomingDeadlines: [],
      },
      loading: false,
      error: null,
    });

    render(<DefenderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByText('View All Assignments')).toBeInTheDocument();
      expect(screen.getByText('My Profile')).toBeInTheDocument();
    });
  });
});
