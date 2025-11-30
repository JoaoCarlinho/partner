'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useDefenderAuth, useCaseAssignment } from '@/features/defender/hooks';
import { CaseViewPage } from '@/features/defender/pages/CaseViewPage';

// Breadcrumb component
interface BreadcrumbItem {
  label: string;
  href: string | null;
}

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <Link href={item.href} className="text-blue-600 hover:text-blue-700">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-500">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Error components
function NotFoundError() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Case Not Found</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        This case does not exist or has been removed.
      </p>
      <Link
        href="/defender/assignments"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to Assignments
      </Link>
    </div>
  );
}

function ForbiddenError() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        You don&apos;t have access to this case. You may only view cases that are assigned to you.
      </p>
      <Link
        href="/defender/assignments"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to Assignments
      </Link>
    </div>
  );
}

export default function CaseViewClient() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.caseId as string;

  const { isAuthenticated, isLoading: authLoading } = useDefenderAuth();
  const { assignment, loading: assignmentLoading, errorCode } = useCaseAssignment(caseId);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/defender/cases/${caseId}`);
    }
  }, [authLoading, isAuthenticated, router, caseId]);

  if (authLoading || assignmentLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (errorCode === 404) {
    return <NotFoundError />;
  }

  if (errorCode === 403) {
    return <ForbiddenError />;
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/defender/dashboard' },
    { label: 'Assignments', href: '/defender/assignments' },
    { label: `Case: ${assignment?.debtorName || 'Loading...'}`, href: null },
  ];

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm">Back</span>
      </button>

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Case View Content */}
      <CaseViewPage caseId={caseId} />
    </div>
  );
}
