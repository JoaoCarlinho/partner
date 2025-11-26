/**
 * Reminder Settings Component
 * Organization-level reminder configuration
 */

import React, { useState, useEffect } from 'react';

/**
 * Reminder settings
 */
interface ReminderSettings {
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
  reminderTime: string;
}

/**
 * Props
 */
interface ReminderSettingsProps {
  orgId: string;
  onSave?: (settings: ReminderSettings) => void;
}

/**
 * Available day options
 */
const DAYS_BEFORE_OPTIONS = [1, 2, 3, 5, 7, 14, 30];
const DAYS_AFTER_OPTIONS = [1, 2, 3, 5, 7, 14, 30];

/**
 * Time options (hourly)
 */
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({ orgId, onSave }) => {
  const [settings, setSettings] = useState<ReminderSettings>({
    reminderDaysBefore: [7, 1],
    reminderDaysAfter: [1, 7],
    reminderTime: '10:00',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    // In production, fetch from API
    const stored = localStorage.getItem(`reminder-settings-${orgId}`);
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, [orgId]);

  /**
   * Toggle a day option
   */
  const toggleDay = (type: 'before' | 'after', day: number) => {
    const key = type === 'before' ? 'reminderDaysBefore' : 'reminderDaysAfter';
    const current = settings[key];

    if (current.includes(day)) {
      setSettings({
        ...settings,
        [key]: current.filter((d) => d !== day),
      });
    } else {
      setSettings({
        ...settings,
        [key]: [...current, day].sort((a, b) => b - a),
      });
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // In production, call API
      localStorage.setItem(`reminder-settings-${orgId}`, JSON.stringify(settings));
      onSave?.(settings);
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Reminder Settings</h3>

      {/* Days Before Due Date */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Send Reminders Before Due Date
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Select how many days before the due date to send reminder emails
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS_BEFORE_OPTIONS.map((day) => {
            const isSelected = settings.reminderDaysBefore.includes(day);
            return (
              <button
                key={`before-${day}`}
                type="button"
                onClick={() => toggleDay('before', day)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {day} {day === 1 ? 'day' : 'days'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Days After Due Date */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Send Follow-ups After Due Date
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Select how many days after a missed payment to send follow-up notices
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS_AFTER_OPTIONS.map((day) => {
            const isSelected = settings.reminderDaysAfter.includes(day);
            return (
              <button
                key={`after-${day}`}
                type="button"
                onClick={() => toggleDay('after', day)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  isSelected
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {day} {day === 1 ? 'day' : 'days'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Send Time */}
      <div className="mb-6">
        <label htmlFor="reminderTime" className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Send Time
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Choose when reminders should be sent (organization timezone)
        </p>
        <select
          id="reminderTime"
          value={settings.reminderTime}
          onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
          className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Reminder Schedule Preview</h4>
        <div className="space-y-2">
          {settings.reminderDaysBefore
            .sort((a, b) => b - a)
            .map((day) => (
              <div key={`preview-before-${day}`} className="flex items-center text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                <span className="text-gray-600">
                  {day} {day === 1 ? 'day' : 'days'} before due date - Friendly reminder
                </span>
              </div>
            ))}
          <div className="flex items-center text-sm">
            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
            <span className="text-gray-500 font-medium">Due Date</span>
          </div>
          {settings.reminderDaysAfter
            .sort((a, b) => a - b)
            .map((day) => (
              <div key={`preview-after-${day}`} className="flex items-center text-sm">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                <span className="text-gray-600">
                  {day} {day === 1 ? 'day' : 'days'} after due date -{' '}
                  {day === 1 ? 'Missed payment notice' : 'Follow-up'}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
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
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default ReminderSettings;
