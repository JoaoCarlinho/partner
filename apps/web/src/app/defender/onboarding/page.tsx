'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingPage } from '@/features/defender/pages/OnboardingPage';
import {
  useDefenderAuth,
  useOnboardingStatus,
} from '@/features/defender/hooks';

export default function DefenderOnboardingRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useDefenderAuth();
  const { status, loading: statusLoading, error } = useOnboardingStatus();
  const [redirecting, setRedirecting] = useState(false);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setRedirecting(true);
      router.replace('/login?redirect=/defender/onboarding');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect ACTIVE users to dashboard
  useEffect(() => {
    if (status?.status === 'ACTIVE') {
      setRedirecting(true);
      router.replace('/defender/dashboard');
    }
  }, [status, router]);

  // Handle auth error (not authenticated)
  useEffect(() => {
    if (error === 'NOT_AUTHENTICATED') {
      setRedirecting(true);
      router.replace('/login?redirect=/defender/onboarding');
    }
  }, [error, router]);

  // Show loading state while checking auth or status
  if (authLoading || statusLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state (but not for auth errors - those redirect)
  if (error && error !== 'NOT_AUTHENTICATED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Onboarding</h2>
          <p className="text-gray-600 mb-4">
            Something went wrong while loading your onboarding status. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render the onboarding page with status data
  return <OnboardingPage initialStatus={status} />;
}
