'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DataTable, Column, Modal, ConfirmModal } from '@/components/admin';
import { AUDIENCE_TYPES, NOTIFICATION_STATUSES } from '@/lib/admin/constants';

interface NotificationSchedule {
  id: string;
  title: string;
  body: string;
  scheduled_for: string;
  audience_type: string;
  audience_payload: Record<string, unknown>;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const initialFormState = {
  title: '',
  body: '',
  audience_type: 'all',
  audience_payload: {},
  scheduled_for: '',
};

export default function NotificationsPage() {
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<NotificationSchedule | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [sending, setSending] = useState(false);
  const [countryInput, setCountryInput] = useState('');
  const [filter, setFilter] = useState('');

  const fetchSchedules = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: String(page),
        ...(filter && { status: filter }),
      });

      const response = await fetch(`/api/admin/notifications/schedule?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch schedules');

      const data = await response.json();
      setSchedules(data.schedules);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSendNow = async () => {
    if (!formData.title || !formData.body) return;
    setSending(true);

    try {
      const token = localStorage.getItem('admin_token');
      const payload = {
        title: formData.title,
        body: formData.body,
        audience_type: formData.audience_type,
        audience_payload: formData.audience_payload,
      };

      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowSendModal(false);
        setFormData(initialFormState);
        alert('Notification sent successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!formData.title || !formData.body || !formData.scheduled_for) return;
    setSending(true);

    try {
      const token = localStorage.getItem('admin_token');
      const payload = {
        title: formData.title,
        body: formData.body,
        scheduled_for: formData.scheduled_for,
        audience_type: formData.audience_type,
        audience_payload: formData.audience_payload,
      };

      const response = await fetch('/api/admin/notifications/schedule', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setFormData(initialFormState);
        fetchSchedules();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to schedule notification');
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    } finally {
      setSending(false);
    }
  };

  const handleCancel = (schedule: NotificationSchedule) => {
    setSelectedSchedule(schedule);
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    if (!selectedSchedule) return;
    setSending(true);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/notifications/schedule/${selectedSchedule.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setShowCancelConfirm(false);
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error cancelling schedule:', error);
    } finally {
      setSending(false);
    }
  };

  const updateAudiencePayload = (type: string) => {
    setFormData({ ...formData, audience_type: type, audience_payload: {} });
    setCountryInput('');
  };

  const handleCountryChange = (value: string) => {
    setCountryInput(value);
    const codes = value.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    setFormData({
      ...formData,
      audience_payload: { country_codes: codes },
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = NOTIFICATION_STATUSES.find((s) => s.value === status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusConfig?.color || 'bg-gray-500'} text-white`}>
        {statusConfig?.label || status}
      </span>
    );
  };

  const columns: Column<NotificationSchedule>[] = [
    {
      key: 'title',
      header: 'Notification',
      render: (s) => (
        <div>
          <p className="text-white font-medium">{s.title}</p>
          <p className="text-zinc-500 text-xs truncate max-w-xs">{s.body}</p>
        </div>
      ),
    },
    {
      key: 'audience_type',
      header: 'Audience',
      render: (s) => AUDIENCE_TYPES.find((a) => a.value === s.audience_type)?.label || s.audience_type,
    },
    {
      key: 'scheduled_for',
      header: 'Scheduled For',
      render: (s) => new Date(s.scheduled_for).toLocaleString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => getStatusBadge(s.status),
    },
  ];

  const renderAudienceSelector = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Audience</label>
        <select
          value={formData.audience_type}
          onChange={(e) => updateAudiencePayload(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          {AUDIENCE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {formData.audience_type === 'country' && (
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Country Codes (comma separated)</label>
          <input
            type="text"
            value={countryInput}
            onChange={(e) => handleCountryChange(e.target.value)}
            placeholder="US, MX, BR"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-zinc-500">Send and schedule push notifications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFormData(initialFormState);
              setShowScheduleModal(true);
            }}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Schedule
          </button>
          <button
            onClick={() => {
              setFormData(initialFormState);
              setShowSendModal(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Send Now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setFilter('')}
          className={`pb-2 ${!filter ? 'text-white border-b-2 border-blue-500' : 'text-zinc-400'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`pb-2 ${filter === 'pending' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-400'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={`pb-2 ${filter === 'sent' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-400'}`}
        >
          Sent
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`pb-2 ${filter === 'cancelled' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-400'}`}
        >
          Cancelled
        </button>
      </div>

      {/* Schedules Table */}
      <DataTable
        data={schedules}
        columns={columns}
        actions={[
          {
            label: 'Cancel',
            icon: '✕',
            onClick: handleCancel,
            variant: 'danger',
            show: (s) => s.status === 'pending',
          },
        ]}
        keyField="id"
        loading={loading}
        emptyMessage="No scheduled notifications"
        pagination={{
          ...pagination,
          onPageChange: (page) => fetchSchedules(page),
        }}
      />

      {/* Send Now Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Send Notification"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowSendModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSendNow}
              disabled={sending || !formData.title || !formData.body}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Message *</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="Notification message"
            />
          </div>
          {renderAudienceSelector()}

          {/* Preview */}
          <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/50">
            <p className="text-zinc-400 text-xs mb-2">Preview</p>
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-white font-medium">{formData.title || 'Title'}</p>
              <p className="text-zinc-400 text-sm">{formData.body || 'Message body...'}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Notification"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={sending || !formData.title || !formData.body || !formData.scheduled_for}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {sending ? 'Scheduling...' : 'Schedule'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Message *</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="Notification message"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Schedule For *</label>
            <input
              type="datetime-local"
              value={formData.scheduled_for}
              onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            />
          </div>
          {renderAudienceSelector()}
        </div>
      </Modal>

      {/* Cancel Confirmation */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={confirmCancel}
        title="Cancel Scheduled Notification"
        message={`Are you sure you want to cancel "${selectedSchedule?.title}"?`}
        confirmLabel="Cancel Notification"
        confirmVariant="danger"
        loading={sending}
      />
    </div>
  );
}
