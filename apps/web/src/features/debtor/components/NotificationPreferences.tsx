/**
 * Notification Preferences Component
 * Debtor notification settings with quiet hours
 */

import React, { useState, useEffect } from 'react';

/**
 * Notification preferences
 */
interface NotificationPreferences {
  reminderEmail: boolean;
  reminderInApp: boolean;
  reminderSms: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

/**
 * Props
 */
interface NotificationPreferencesProps {
  userId: string;
  onSave?: (preferences: NotificationPreferences) => void;
}

/**
 * Common timezones
 */
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

/**
 * Time options for quiet hours
 */
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return {
    value: `${hour}:00`,
    label: new Date(`2000-01-01T${hour}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
});

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userId,
  onSave,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    reminderEmail: true,
    reminderInApp: true,
    reminderSms: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'America/New_York',
  });
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    // In production, fetch from API
    const stored = localStorage.getItem(`notification-prefs-${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setPreferences(parsed);
      setQuietHoursEnabled(parsed.quietHoursStart !== null);
    }
  }, [userId]);

  /**
   * Toggle a channel
   */
  const toggleChannel = (channel: 'reminderEmail' | 'reminderInApp' | 'reminderSms') => {
    setPreferences({
      ...preferences,
      [channel]: !preferences[channel],
    });
  };

  /**
   * Toggle quiet hours
   */
  const handleQuietHoursToggle = () => {
    if (quietHoursEnabled) {
      setPreferences({
        ...preferences,
        quietHoursStart: null,
        quietHoursEnd: null,
      });
    } else {
      setPreferences({
        ...preferences,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
      });
    }
    setQuietHoursEnabled(!quietHoursEnabled);
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // In production, call API
      localStorage.setItem(`notification-prefs-${userId}`, JSON.stringify(preferences));
      onSave?.(preferences);
      setSaveMessage('Preferences saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if at least one channel is enabled
  const hasEnabledChannel =
    preferences.reminderEmail || preferences.reminderInApp || preferences.reminderSms;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences</h3>
      <p className="text-sm text-gray-500 mb-6">
        Choose how you'd like to receive payment reminders and notifications
      </p>

      {/* Notification Channels */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-gray-700">Notification Channels</h4>

        {/* Email */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">Email</span>
              <p className="text-xs text-gray-500">Receive reminders via email</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={preferences.reminderEmail}
              onChange={() => toggleChannel('reminderEmail')}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                preferences.reminderEmail ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                  preferences.reminderEmail ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>
        </label>

        {/* In-App */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">In-App Notifications</span>
              <p className="text-xs text-gray-500">See reminders in your dashboard</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={preferences.reminderInApp}
              onChange={() => toggleChannel('reminderInApp')}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                preferences.reminderInApp ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                  preferences.reminderInApp ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>
        </label>

        {/* SMS */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">SMS Text Messages</span>
              <p className="text-xs text-gray-500">Get text message reminders (standard rates apply)</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={preferences.reminderSms}
              onChange={() => toggleChannel('reminderSms')}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                preferences.reminderSms ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                  preferences.reminderSms ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>
        </label>

        {!hasEnabledChannel && (
          <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
            You have disabled all notification channels. You won't receive payment reminders.
          </p>
        )}
      </div>

      {/* Quiet Hours */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quiet Hours</h4>

        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-4">
          <div>
            <span className="text-sm font-medium text-gray-900">Enable Quiet Hours</span>
            <p className="text-xs text-gray-500">Don't send notifications during specified hours</p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={quietHoursEnabled}
              onChange={handleQuietHoursToggle}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                quietHoursEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                  quietHoursEnabled ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>
        </label>

        {quietHoursEnabled && (
          <div className="flex items-center gap-4 ml-4">
            <div>
              <label htmlFor="quietStart" className="block text-xs text-gray-500 mb-1">
                Start
              </label>
              <select
                id="quietStart"
                value={preferences.quietHoursStart || '21:00'}
                onChange={(e) =>
                  setPreferences({ ...preferences, quietHoursStart: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-gray-400 mt-5">to</span>
            <div>
              <label htmlFor="quietEnd" className="block text-xs text-gray-500 mb-1">
                End
              </label>
              <select
                id="quietEnd"
                value={preferences.quietHoursEnd || '08:00'}
                onChange={(e) => setPreferences({ ...preferences, quietHoursEnd: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Timezone */}
      <div className="mb-6">
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
          Your Timezone
        </label>
        <select
          id="timezone"
          value={preferences.timezone}
          onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        {saveMessage && (
          <span
            className={`text-sm ${
              saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {saveMessage}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
