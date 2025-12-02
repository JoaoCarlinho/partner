'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CollectorNav } from '@/components/CollectorNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qs5x4c1cp0.execute-api.us-east-1.amazonaws.com/dev';

interface User {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
}

interface DashboardStats {
  activeCases: number;
  collectionRate: number;
  pendingActions: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeCases: 0,
    collectionRate: 0,
    pendingActions: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/v1/demands/cases`, {
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const cases = data.data?.items || [];
        const activeCases = cases.filter((c: { status: string }) => c.status === 'ACTIVE').length;
        setStats(prev => ({ ...prev, activeCases }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role === 'DEBTOR') {
        router.push('/debtor/dashboard');
        return;
      }
      setUser({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        organizationId: userData.organizationId,
      });
      setLoading(false);
      // Fetch stats after user is loaded
      fetchDashboardStats();
    } catch {
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router, fetchDashboardStats]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CollectorNav user={user} />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-600">
              You are logged in as <strong>{user.email}</strong>.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Link href="/cases" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Cases</p>
                  <p className="mt-1 text-2xl font-semibold text-primary-600">
                    {statsLoading ? '...' : stats.activeCases}
                  </p>
                </div>
                <span className="text-2xl">📁</span>
              </div>
            </Link>

            <Link href="/analytics" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Collection Rate</p>
                  <p className="mt-1 text-2xl font-semibold text-green-600">
                    {statsLoading ? '...' : `${stats.collectionRate}%`}
                  </p>
                </div>
                <span className="text-2xl">📈</span>
              </div>
            </Link>

            <Link href="/compliance" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Compliance</p>
                  <p className="mt-1 text-2xl font-semibold text-green-600">100%</p>
                </div>
                <span className="text-2xl">✓</span>
              </div>
            </Link>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Actions</p>
                  <p className="mt-1 text-2xl font-semibold text-yellow-600">
                    {statsLoading ? '...' : stats.pendingActions}
                  </p>
                </div>
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/cases"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <span className="text-2xl mb-2">📁</span>
                <span className="text-sm font-medium text-gray-700">View Cases</span>
              </Link>
              <Link
                href="/cases?new=true"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <span className="text-2xl mb-2">➕</span>
                <span className="text-sm font-medium text-gray-700">New Case</span>
              </Link>
              <Link
                href="/analytics"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <span className="text-2xl mb-2">📊</span>
                <span className="text-sm font-medium text-gray-700">Analytics</span>
              </Link>
              <Link
                href="/compliance"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <span className="text-2xl mb-2">🛡️</span>
                <span className="text-sm font-medium text-gray-700">Compliance</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity</p>
              <Link href="/cases" className="text-primary-600 hover:underline mt-2 inline-block">
                View all cases
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
