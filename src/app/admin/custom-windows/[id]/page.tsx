'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StatsCard, DataTable, Column, Modal, ConfirmModal, AdminEmojiPicker } from '@/components/admin';
import {
  CUSTOM_WINDOW_STATUSES,
  CUSTOM_WINDOW_EVENT_TYPES,
  RECURRENCE_FREQUENCIES,
  DAYS_OF_WEEK,
} from '@/lib/admin/constants';
import type { CustomWindow, RecurrenceRule } from '@/lib/supabase/types';

interface WindowDetail {
  window: CustomWindow;
  stats: {
    participant_count: number;
    total_xp_awarded: number;
    instance_count: number;
  };
  recent_participations: Array<{
    id: string;
    user_id: string;
    window_instance_id: string;
    xp_earned: number;
    created_at: string;
    users: {
      timezone: string | null;
      country_code: string | null;
    };
  }>;
}

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

export default function CustomWindowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';

  const [data, setData] = useState<WindowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(isEditMode);
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchWindow = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/custom-windows/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.replace('/admin/custom-windows');
            return;
          }
          throw new Error('Failed to fetch window');
        }

        const windowData = await response.json();
        setData(windowData);

        // Populate form data
        const w = windowData.window;
        const rule = w.recurrence_rule as RecurrenceRule | null;
        setFormData({
          name: w.name,
          description: w.description || '',
          icon: w.icon,
          color: w.color,
          banner_url: w.banner_url || '',
          start_hour: w.start_hour,
          end_hour: w.end_hour,
          event_type: w.event_type,
          event_date: w.event_date || '',
          recurrence_frequency: rule?.frequency || 'daily',
          recurrence_days: rule?.daysOfWeek || [],
          recurrence_day_of_month: rule?.dayOfMonth || 1,
          recurrence_start: w.recurrence_start || '',
          recurrence_end: w.recurrence_end || '',
          xp_multiplier: w.xp_multiplier,
          bonus_badge_id: w.bonus_badge_id || '',
          lucky_drop_boost: w.lucky_drop_boost,
          notify_on_open: w.notify_on_open,
          notify_before_close: w.notify_before_close,
          notify_minutes_before: w.notify_minutes_before,
          custom_notification_title: w.custom_notification_title || '',
          custom_notification_body: w.custom_notification_body || '',
          target_timezones: (w.target_timezones || []).join(', '),
          target_countries: (w.target_countries || []).join(', '),
          min_streak_days: w.min_streak_days,
          status: w.status,
          priority: w.priority,
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWindow();
  }, [id, router]);

  const handleSubmit = async () => {
    setSaving(true);
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
        priority: formData.priority,
      };

      const response = await fetch(`/api/admin/custom-windows/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowEditModal(false);
        router.replace(`/admin/custom-windows/${id}`);
        // Refresh data
        const refreshResponse = await fetch(`/api/admin/custom-windows/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshResponse.ok) {
          setData(await refreshResponse.json());
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update window');
      }
    } catch (error) {
      console.error('Error saving window:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = (action: string) => {
    setPendingAction(action);
    setShowActionConfirm(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/custom-windows/${id}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: pendingAction }),
      });

      if (response.ok) {
        setShowActionConfirm(false);
        setPendingAction(null);
        // Refresh data
        const refreshResponse = await fetch(`/api/admin/custom-windows/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshResponse.ok) {
          setData(await refreshResponse.json());
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update window');
      }
    } catch (error) {
      console.error('Error updating window:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-zinc-500">Custom window not found</div>;
  }

  const { window: win, stats, recent_participations } = data;

  const statusConfig = CUSTOM_WINDOW_STATUSES.find((s) => s.value === win.status);

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const participantColumns: Column<(typeof recent_participations)[0]>[] = [
    {
      key: 'user_id',
      header: 'User ID',
      render: (p) => (
        <span className="font-mono text-xs text-zinc-400">
          {p.user_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'users.country_code',
      header: 'Country',
      render: (p) => p.users?.country_code || '-',
    },
    {
      key: 'xp_earned',
      header: 'XP Earned',
      render: (p) => (
        <span className="text-yellow-400 font-medium">+{p.xp_earned}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Participated',
      render: (p) => new Date(p.created_at).toLocaleString(),
    },
  ];

  const getActionMessage = () => {
    if (!pendingAction) return '';
    const actionMessages: Record<string, string> = {
      activate: `Are you sure you want to activate "${win.name}"? It will become active immediately.`,
      deactivate: `Are you sure you want to deactivate "${win.name}"? Users will no longer see this window.`,
      schedule: `Are you sure you want to schedule "${win.name}"? It will activate automatically at the configured time.`,
      cancel: `Are you sure you want to cancel "${win.name}"? This cannot be undone.`,
    };
    return actionMessages[pendingAction] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white mb-2 flex items-center gap-1"
          >
            ← Back to Custom Windows
          </button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{win.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{win.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs ${statusConfig?.color || 'bg-gray-500'} text-white`}>
                  {statusConfig?.label || win.status}
                </span>
                <span className="text-zinc-500 text-sm">
                  {win.event_type === 'one_time' ? 'One-time Event' : 'Recurring Event'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {win.status === 'draft' && (
            <>
              <button
                onClick={() => handleAction('schedule')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Schedule
              </button>
              <button
                onClick={() => handleAction('activate')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Activate Now
              </button>
            </>
          )}
          {win.status === 'scheduled' && (
            <>
              <button
                onClick={() => handleAction('activate')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Activate Now
              </button>
              <button
                onClick={() => handleAction('cancel')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {win.status === 'active' && (
            <button
              onClick={() => handleAction('deactivate')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Deactivate
            </button>
          )}
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Banner */}
      {win.banner_url && (
        <div className="rounded-xl overflow-hidden border border-zinc-800">
          <img src={win.banner_url} alt={win.name} className="w-full h-48 object-cover" />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Participants"
          value={stats.participant_count}
          icon="👥"
          color="blue"
        />
        <StatsCard
          title="XP Multiplier"
          value={`${win.xp_multiplier}x`}
          icon="⚡"
          color="yellow"
        />
        <StatsCard
          title="Total XP Awarded"
          value={stats.total_xp_awarded}
          icon="✨"
          color="purple"
        />
        <StatsCard
          title="Window Instances"
          value={stats.instance_count}
          icon="🪟"
          color="green"
        />
      </div>

      {/* Window Info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Window Details</h2>

        {win.description && <p className="text-zinc-300 mb-6">{win.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-zinc-500 text-sm">Hours</p>
            <p className="text-white">
              {formatHour(win.start_hour)} - {formatHour(win.end_hour)}
            </p>
          </div>
          {win.event_type === 'one_time' && win.event_date && (
            <div>
              <p className="text-zinc-500 text-sm">Event Date</p>
              <p className="text-white">{new Date(win.event_date).toLocaleDateString()}</p>
            </div>
          )}
          {win.event_type === 'recurring' && win.recurrence_rule && (
            <div>
              <p className="text-zinc-500 text-sm">Recurrence</p>
              <p className="text-white capitalize">
                {(win.recurrence_rule as RecurrenceRule).frequency}
                {(win.recurrence_rule as RecurrenceRule).daysOfWeek &&
                  ` (${(win.recurrence_rule as RecurrenceRule).daysOfWeek?.join(', ')})`}
              </p>
            </div>
          )}
          <div>
            <p className="text-zinc-500 text-sm">Lucky Drop Boost</p>
            <p className="text-white">{win.lucky_drop_boost}x</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Priority</p>
            <p className="text-white">{win.priority}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Min Streak Days</p>
            <p className="text-white">{win.min_streak_days}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Created</p>
            <p className="text-white">{new Date(win.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h3 className="text-md font-medium text-white mb-3">Notifications</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-zinc-500 text-sm">Notify on Open</p>
              <p className={win.notify_on_open ? 'text-green-400' : 'text-zinc-400'}>
                {win.notify_on_open ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Notify Before Close</p>
              <p className={win.notify_before_close ? 'text-green-400' : 'text-zinc-400'}>
                {win.notify_before_close ? `Yes (${win.notify_minutes_before}min)` : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Targeting */}
        {((win.target_timezones && win.target_timezones.length > 0) ||
          (win.target_countries && win.target_countries.length > 0)) && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-md font-medium text-white mb-3">Targeting</h3>
            <div className="grid grid-cols-2 gap-4">
              {win.target_timezones && win.target_timezones.length > 0 && (
                <div>
                  <p className="text-zinc-500 text-sm">Timezones</p>
                  <p className="text-white">{win.target_timezones.join(', ')}</p>
                </div>
              )}
              {win.target_countries && win.target_countries.length > 0 && (
                <div>
                  <p className="text-zinc-500 text-sm">Countries</p>
                  <p className="text-white">{win.target_countries.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Participations */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Participations</h2>
        <DataTable
          data={recent_participations}
          columns={participantColumns}
          keyField="id"
          emptyMessage="No participations yet"
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Custom Window"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
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
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Schedule</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Start Hour</label>
                <select
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
                <label className="block text-sm text-zinc-400 mb-1">End Hour</label>
                <select
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
                <label className="block text-sm text-zinc-400 mb-1">Event Type</label>
                <select
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
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            )}

            {formData.event_type === 'recurring' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Frequency</label>
                    <select
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
                      value={formData.recurrence_start}
                      onChange={(e) => setFormData({ ...formData, recurrence_start: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {formData.recurrence_frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Days of Week</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <label
                          key={day.value}
                          className={`px-3 py-1 rounded-lg cursor-pointer border ${
                            formData.recurrence_days.includes(day.value)
                              ? 'bg-purple-500 border-purple-400 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
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
                          {day.label.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.recurrence_frequency === 'monthly' && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Day of Month</label>
                    <select
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
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Rewards</h3>
            <div className="grid grid-cols-3 gap-4">
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
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Notifications</h3>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={formData.notify_on_open}
                  onChange={(e) => setFormData({ ...formData, notify_on_open: e.target.checked })}
                  className="rounded"
                />
                Notify on Open
              </label>
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={formData.notify_before_close}
                  onChange={(e) => setFormData({ ...formData, notify_before_close: e.target.checked })}
                  className="rounded"
                />
                Notify Before Close
              </label>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Minutes Before</label>
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
            <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Targeting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Target Timezones</label>
                <input
                  type="text"
                  value={formData.target_timezones}
                  onChange={(e) => setFormData({ ...formData, target_timezones: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  placeholder="Comma-separated (leave empty for all)"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Target Countries</label>
                <input
                  type="text"
                  value={formData.target_countries}
                  onChange={(e) => setFormData({ ...formData, target_countries: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  placeholder="Comma-separated (leave empty for all)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Min Streak Days</label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_streak_days}
                  onChange={(e) => setFormData({ ...formData, min_streak_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
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
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Action Confirmation */}
      <ConfirmModal
        isOpen={showActionConfirm}
        onClose={() => {
          setShowActionConfirm(false);
          setPendingAction(null);
        }}
        onConfirm={confirmAction}
        title={`${pendingAction?.charAt(0).toUpperCase()}${pendingAction?.slice(1)} Window`}
        message={getActionMessage()}
        confirmLabel={pendingAction?.charAt(0).toUpperCase() + (pendingAction?.slice(1) || '')}
        confirmVariant={['cancel', 'deactivate'].includes(pendingAction || '') ? 'danger' : 'primary'}
        loading={saving}
      />
    </div>
  );
}
