import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DefenderLayout from '../layout';
import * as hooks from '@/features/defender/hooks';

// Mock next/navigation
const mockPathname = jest.fn(() => '/defender/dashboard');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => mockPathname(),
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Need to also mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  );
});

// Mock the hooks module
jest.mock('@/features/defender/hooks', () => ({
  useUserProfile: jest.fn(),
  useLogout: jest.fn(),
}));

// Mock window.confirm
const originalConfirm = window.confirm;

describe('DefenderLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/defender/dashboard');
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('renders navigation sidebar with user info', async () => {
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Defender')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  it('renders all navigation items', async () => {
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('My Assignments').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Messages').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    });
  });

  it('highlights active navigation item', async () => {
    mockPathname.mockReturnValue('/defender/dashboard');
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      // Find the dashboard link that should have active styling
      const dashboardLinks = screen.getAllByText('Dashboard');
      const activeLink = dashboardLinks.find(link =>
        link.closest('a')?.classList.contains('bg-blue-50')
      );
      expect(activeLink).toBeTruthy();
    });
  });

  it('shows Messages as disabled/coming soon', async () => {
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Soon').length).toBeGreaterThan(0);
    });
  });

  it('renders logout button', async () => {
    const mockLogout = jest.fn();
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: mockLogout,
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });
  });

  it('calls logout when logout button is clicked', async () => {
    const mockLogout = jest.fn();
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: mockLogout,
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    const logoutButton = screen.getByText('Log out');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it('skips layout for onboarding page', () => {
    mockPathname.mockReturnValue('/defender/onboarding');
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div data-testid="content">Onboarding Content</div>
      </DefenderLayout>
    );

    // Should render children without sidebar
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByText('Defender Portal')).not.toBeInTheDocument();
  });

  it('displays user initials in avatar', async () => {
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div>Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      // Look for JD initials (Jane Defender)
      const initialsElements = screen.getAllByText('JD');
      expect(initialsElements.length).toBeGreaterThan(0);
    });
  });

  it('renders children content', async () => {
    (hooks.useUserProfile as jest.Mock).mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Defender', email: 'jane@example.com' },
      loading: false,
      error: null,
    });
    (hooks.useLogout as jest.Mock).mockReturnValue({
      logout: jest.fn(),
    });

    render(
      <DefenderLayout>
        <div data-testid="page-content">Page Content</div>
      </DefenderLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });
  });
});
