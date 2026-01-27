'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, Action, Modal, ConfirmModal } from '@/components/admin';
import { EVENT_TYPES, EVENT_STATUSES } from '@/lib/admin/constants';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  banner_url: string | null;
  event_type: string;
  status: string;
  created_at: string;
  participant_count: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const initialFormState = {
  title: '',
  description: '',
  start_at: '',
  end_at: '',
  banner_url: '',
  event_type: 'general',
  status: 'draft',
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', event_type: '' });
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const fetchEvents = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: String(page),
        ...(filters.status && { status: filters.status }),
        ...(filters.event_type && { event_type: filters.event_type }),
      });

      const response = await fetch(`/api/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data.events);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = () => {
    setSelectedEvent(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start_at: event.start_at.slice(0, 16),
      end_at: event.end_at.slice(0, 16),
      banner_url: event.banner_url || '',
      event_type: event.event_type,
      status: event.status,
    });
    setShowModal(true);
  };

  const handleDelete = (event: Event) => {
    setSelectedEvent(event);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const url = selectedEvent
        ? `/api/admin/events/${selectedEvent.id}`
        : '/api/admin/events';
      const method = selectedEvent ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchEvents(pagination.page);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        fetchEvents(pagination.page);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = EVENT_STATUSES.find((s) => s.value === status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusConfig?.color || 'bg-gray-500'} text-white`}>
        {statusConfig?.label || status}
      </span>
    );
  };

  const columns: Column<Event>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (event) => (
        <div>
          <p className="text-white font-medium">{event.title}</p>
          <p className="text-zinc-500 text-xs">{event.event_type}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => getStatusBadge(event.status),
    },
    {
      key: 'start_at',
      header: 'Start',
      render: (event) => new Date(event.start_at).toLocaleDateString(),
    },
    {
      key: 'end_at',
      header: 'End',
      render: (event) => new Date(event.end_at).toLocaleDateString(),
    },
    {
      key: 'participant_count',
      header: 'Participants',
      sortable: true,
    },
  ];

  const actions: Action<Event>[] = [
    {
      label: 'View',
      icon: '👁',
      onClick: (event) => router.push(`/admin/events/${event.id}`),
    },
    {
      label: 'Edit',
      icon: '✏️',
      onClick: handleEdit,
    },
    {
      label: 'Delete',
      icon: '🗑',
      onClick: handleDelete,
      variant: 'danger',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-zinc-500">Manage events and challenges</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + New Event
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          >
            <option value="">All Statuses</option>
            {EVENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={filters.event_type}
            onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          >
            <option value="">All Types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table */}
      <DataTable
        data={events}
        columns={columns}
        actions={actions}
        keyField="id"
        loading={loading}
        emptyMessage="No events found"
        pagination={{
          ...pagination,
          onPageChange: (page) => fetchEvents(page),
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedEvent ? 'Edit Event' : 'Create Event'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
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
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="Event description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Start Date *</label>
              <input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">End Date *</label>
              <input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {EVENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${selectedEvent?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
      />
    </div>
  );
}
