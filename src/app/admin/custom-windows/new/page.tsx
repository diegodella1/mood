'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CUSTOM_WINDOW_EVENT_TYPES,
  RECURRENCE_FREQUENCIES,
  DAYS_OF_WEEK,
} from '@/lib/admin/constants';
import { AdminEmojiPicker } from '@/components/admin';

const initialFormState = {
  name: '',
  description: '',
  icon: '🎉',
  color: '#8B5CF6',
  banner_url: '',
  start_hour: 18,
  end_hour: 21,
  event_type: 'one_time' as 'one_time' | 'recurring',
  event_date: '',
  recurrence_frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
  recurrence_days: [] as string[],
  recurrence_day_of_month: 1,
  recurrence_start: '',
  recurrence_end: '',
  xp_multiplier: 1.5,
  bonus_badge_id: '',
  lucky_drop_boost: 1.0,
  notify_on_open: true,
  notify_before_close: true,
  notify_minutes_before: 30,
  custom_notification_title: '',
  custom_notification_body: '',
  target_timezones: '',
  target_countries: '',
  min_streak_days: 0,
  status: 'draft' as 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled',
  priority: 100,
};

export default function NewCustomWindowPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');

      // Build recurrence rule if recurring
      let recurrence_rule = null;
      if (formData.event_type === 'recurring') {
        recurrence_rule = {
          frequency: formData.recurrence_frequency,
          ...(formData.recurrence_frequency === 'weekly' && {
            daysOfWeek: formData.recurrence_days,
          }),
          ...(formData.recurrence_frequency === 'monthly' && {
            dayOfMonth: formData.recurrence_day_of_month,
          }),
        };
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        banner_url: formData.banner_url || null,
        start_hour: formData.start_hour,
        end_hour: formData.end_hour,
        event_type: formData.event_type,
        event_date: formData.event_type === 'one_time' ? formData.event_date : null,
        recurrence_rule,
        recurrence_start: formData.event_type === 'recurring' ? formData.recurrence_start : null,
        recurrence_end: formData.recurrence_end || null,
        xp_multiplier: formData.xp_multiplier,
        bonus_badge_id: formData.bonus_badge_id || null,
        lucky_drop_boost: formData.lucky_drop_boost,
        notify_on_open: formData.notify_on_open,
        notify_before_close: formData.notify_before_close,
        notify_minutes_before: formData.notify_minutes_before,
        custom_notification_title: formData.custom_notification_title || null,
        custom_notification_body: formData.custom_notification_body || null,
        target_timezones: formData.target_timezones
          ? formData.target_timezones.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        target_countries: formData.target_countries
          ? formData.target_countries.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        min_streak_days: formData.min_streak_days,
        status: formData.status,
        priority: formData.priority,
      };

      const response = await fetch('/api/admin/custom-windows', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/admin/custom-windows/${data.window.id}`);
      } else {
        setError(data.error || 'Failed to create custom window');
      }
    } catch (err) {
      console.error('Error creating window:', err);
      setError('Failed to create custom window');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white mb-2 flex items-center gap-1"
        >
          ← Back to Custom Windows
        </button>
        <h1 className="text-2xl font-bold text-white">Create Custom Window</h1>
        <p className="text-zinc-500">Set up a new special time window with custom rewards</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Basic Info</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="e.g., Friday Night Special"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <AdminEmojiPicker
                value={formData.icon}
                onChange={(emoji) => setFormData({ ...formData, icon: emoji })}
              />
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="A brief description of this special window..."
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Banner URL</label>
            <input
              type="url"
              value={formData.banner_url}
              onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Schedule</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Start Hour *</label>
              <select
                required
                value={formData.start_hour}
                onChange={(e) => setFormData({ ...formData, start_hour: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">End Hour *</label>
              <select
                required
                value={formData.end_hour}
                onChange={(e) => setFormData({ ...formData, end_hour: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Event Type *</label>
              <select
                required
                value={formData.event_type}
                onChange={(e) =>
                  setFormData({ ...formData, event_type: e.target.value as 'one_time' | 'recurring' })
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {CUSTOM_WINDOW_EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.event_type === 'one_time' && (
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
          )}

          {formData.event_type === 'recurring' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Frequency *</label>
                  <select
                    required
                    value={formData.recurrence_frequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence_frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                      })
                    }
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {RECURRENCE_FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.recurrence_start}
                    onChange={(e) => setFormData({ ...formData, recurrence_start: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {formData.recurrence_frequency === 'weekly' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Days of Week *</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <label
                        key={day.value}
                        className={`px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                          formData.recurrence_days.includes(day.value)
                            ? 'bg-purple-500 border-purple-400 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.recurrence_days.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                recurrence_days: [...formData.recurrence_days, day.value],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                recurrence_days: formData.recurrence_days.filter((d) => d !== day.value),
                              });
                            }
                          }}
                          className="sr-only"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.recurrence_frequency === 'monthly' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Day of Month *</label>
                  <select
                    required
                    value={formData.recurrence_day_of_month}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrence_day_of_month: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-1">End Date (optional)</label>
                <input
                  type="date"
                  value={formData.recurrence_end}
                  onChange={(e) => setFormData({ ...formData, recurrence_end: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rewards */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Rewards</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">XP Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.xp_multiplier}
                onChange={(e) => setFormData({ ...formData, xp_multiplier: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Base XP will be multiplied by this value</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Lucky Drop Boost</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.lucky_drop_boost}
                onChange={(e) => setFormData({ ...formData, lucky_drop_boost: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Increases lucky drop chances</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Bonus Badge ID</label>
              <input
                type="text"
                value={formData.bonus_badge_id}
                onChange={(e) => setFormData({ ...formData, bonus_badge_id: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="e.g., event_explorer"
              />
              <p className="text-xs text-zinc-500 mt-1">Badge awarded on participation</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Notifications</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={formData.notify_on_open}
                onChange={(e) => setFormData({ ...formData, notify_on_open: e.target.checked })}
                className="rounded bg-zinc-800 border-zinc-700"
              />
              Notify when window opens
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={formData.notify_before_close}
                onChange={(e) => setFormData({ ...formData, notify_before_close: e.target.checked })}
                className="rounded bg-zinc-800 border-zinc-700"
              />
              Notify before window closes
            </label>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Minutes Before Close</label>
              <input
                type="number"
                min="5"
                max="120"
                value={formData.notify_minutes_before}
                onChange={(e) => setFormData({ ...formData, notify_minutes_before: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Custom Notification Title</label>
              <input
                type="text"
                value={formData.custom_notification_title}
                onChange={(e) => setFormData({ ...formData, custom_notification_title: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="Leave empty for default"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Custom Notification Body</label>
              <input
                type="text"
                value={formData.custom_notification_body}
                onChange={(e) => setFormData({ ...formData, custom_notification_body: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="Leave empty for default"
              />
            </div>
          </div>
        </div>

        {/* Targeting */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Targeting (Optional)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Target Timezones</label>
              <input
                type="text"
                value={formData.target_timezones}
                onChange={(e) => setFormData({ ...formData, target_timezones: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="e.g., America/New_York, Europe/London"
              />
              <p className="text-xs text-zinc-500 mt-1">Comma-separated. Leave empty for all timezones.</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Target Countries</label>
              <input
                type="text"
                value={formData.target_countries}
                onChange={(e) => setFormData({ ...formData, target_countries: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="e.g., US, MX, CA"
              />
              <p className="text-xs text-zinc-500 mt-1">Comma-separated country codes. Leave empty for all.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Min Streak Days</label>
              <input
                type="number"
                min="0"
                value={formData.min_streak_days}
                onChange={(e) => setFormData({ ...formData, min_streak_days: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Only show to users with this streak or higher</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Priority</label>
              <input
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Higher priority windows override normal windows</p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
          <div
            className="p-4 rounded-xl border-2"
            style={{ borderColor: formData.color, backgroundColor: `${formData.color}15` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">{formData.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-white">{formData.name || 'Window Name'}</h3>
                <p className="text-zinc-400 text-sm">
                  {formatHour(formData.start_hour)} - {formatHour(formData.end_hour)}
                  {formData.xp_multiplier > 1 && (
                    <span className="ml-2 text-yellow-400 font-medium">{formData.xp_multiplier}x XP</span>
                  )}
                </p>
              </div>
            </div>
            {formData.description && <p className="text-zinc-300 mt-2 text-sm">{formData.description}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating...' : 'Create Custom Window'}
          </button>
        </div>
      </form>
    </div>
  );
}
