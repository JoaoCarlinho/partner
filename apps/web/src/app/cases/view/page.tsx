'use client';

import { Suspense } from 'react';
import CaseViewContent from './CaseViewContent';

export default function CaseViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <CaseViewContent />
    </Suspense>
  );
}
