'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDefenderAuth, useUserProfile } from '@/features/defender/hooks';
import { AssignmentList } from '@/features/defender/components/AssignmentList';

export default function DefenderAssignmentsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useDefenderAuth();
  const { user, loading: userLoading } = useUserProfile();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/defender/assignments');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!userLoading && user && user.status !== 'ACTIVE') {
      router.push('/defender/onboarding');
    }
  }, [userLoading, user, router]);

  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AssignmentList />;
}
