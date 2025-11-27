'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDefenderAuth, useUserProfile } from '@/features/defender/hooks';

export default function DefenderSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useDefenderAuth();
  const { user, loading: userLoading } = useUserProfile();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/defender/settings');
    }
  }, [authLoading, isAuthenticated, router]);

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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {/* Profile Section */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Email notifications for new assignments</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Email notifications for messages</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Email reminders for deadlines</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
            </label>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
          <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
