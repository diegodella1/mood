'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, Action, ConfirmModal } from '@/components/admin';
import { CUSTOM_WINDOW_STATUSES, CUSTOM_WINDOW_EVENT_TYPES } from '@/lib/admin/constants';

interface CustomWindow {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  start_hour: number;
  end_hour: number;
  event_type: 'one_time' | 'recurring';
  event_date: string | null;
  xp_multiplier: number;
  status: string;
  priority: number;
  created_at: string;
  participant_count: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function CustomWindowsPage() {
  const [windows, setWindows] = useState<CustomWindow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', event_type: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<CustomWindow | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const fetchWindows = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: String(page),
        ...(filters.status && { status: filters.status }),
        ...(filters.event_type && { event_type: filters.event_type }),
      });

      const response = await fetch(`/api/admin/custom-windows?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch custom windows');

      const data = await response.json();
      setWindows(data.windows);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching custom windows:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const handleDelete = (window: CustomWindow) => {
    setSelectedWindow(window);
    setShowDeleteConfirm(true);
  };

  const handleAction = (window: CustomWindow, action: string) => {
    setSelectedWindow(window);
    setPendingAction(action);
    setShowActionConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedWindow) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/custom-windows/${selectedWindow.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        fetchWindows(pagination.page);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete window');
      }
    } catch (error) {
      console.error('Error deleting window:', error);
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = async () => {
    if (!selectedWindow || !pendingAction) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/custom-windows/${selectedWindow.id}/activate`, {
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
        fetchWindows(pagination.page);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update window');
      }
    } catch (error) {
      console.error('Error updating window:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = CUSTOM_WINDOW_STATUSES.find((s) => s.value === status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusConfig?.color || 'bg-gray-500'} text-white`}>
        {statusConfig?.label || status}
      </span>
    );
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const columns: Column<CustomWindow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (w) => (
        <div className="flex items-center gap-2">
          <span className="text-2xl">{w.icon}</span>
          <div>
            <p className="text-white font-medium">{w.name}</p>
            <p className="text-zinc-500 text-xs">
              {w.event_type === 'one_time' ? 'One-time' : 'Recurring'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => getStatusBadge(w.status),
    },
    {
      key: 'hours',
      header: 'Hours',
      render: (w) => (
        <span className="text-zinc-300 text-sm">
          {formatHour(w.start_hour)} - {formatHour(w.end_hour)}
        </span>
      ),
    },
    {
      key: 'xp_multiplier',
      header: 'XP Boost',
      render: (w) => (
        <span className={`font-medium ${w.xp_multiplier > 1 ? 'text-yellow-400' : 'text-zinc-400'}`}>
          {w.xp_multiplier}x
        </span>
      ),
    },
    {
      key: 'event_date',
      header: 'Date',
      render: (w) => (
        <span className="text-zinc-400 text-sm">
          {w.event_type === 'one_time' && w.event_date
            ? new Date(w.event_date).toLocaleDateString()
            : 'Recurring'}
        </span>
      ),
    },
    {
      key: 'participant_count',
      header: 'Participants',
      sortable: true,
    },
  ];

  const actions: Action<CustomWindow>[] = [
    {
      label: 'View',
      icon: '👁',
      onClick: (w) => router.push(`/admin/custom-windows/${w.id}`),
    },
    {
      label: 'Edit',
      icon: '✏️',
      onClick: (w) => router.push(`/admin/custom-windows/${w.id}?edit=true`),
    },
    {
      label: 'Schedule',
      icon: '📅',
      onClick: (w) => handleAction(w, 'schedule'),
      show: (w) => w.status === 'draft',
    },
    {
      label: 'Activate Now',
      icon: '▶️',
      onClick: (w) => handleAction(w, 'activate'),
      show: (w) => w.status === 'draft' || w.status === 'scheduled',
    },
    {
      label: 'Deactivate',
      icon: '⏹',
      onClick: (w) => handleAction(w, 'deactivate'),
      variant: 'danger',
      show: (w) => w.status === 'active',
    },
    {
      label: 'Cancel',
      icon: '❌',
      onClick: (w) => handleAction(w, 'cancel'),
      variant: 'danger',
      show: (w) => w.status === 'scheduled',
    },
    {
      label: 'Delete',
      icon: '🗑',
      onClick: handleDelete,
      variant: 'danger',
      show: (w) => w.status !== 'active',
    },
  ];

  const getActionMessage = () => {
    if (!pendingAction || !selectedWindow) return '';

    const actionMessages: Record<string, string> = {
      activate: `Are you sure you want to activate "${selectedWindow.name}"? It will become active immediately.`,
      deactivate: `Are you sure you want to deactivate "${selectedWindow.name}"? Users will no longer see this window.`,
      schedule: `Are you sure you want to schedule "${selectedWindow.name}"? It will activate automatically at the configured time.`,
      cancel: `Are you sure you want to cancel "${selectedWindow.name}"? This cannot be undone.`,
    };

    return actionMessages[pendingAction] || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Windows</h1>
          <p className="text-zinc-500">Manage special time windows and events</p>
        </div>
        <button
          onClick={() => router.push('/admin/custom-windows/new')}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          + New Custom Window
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
            {CUSTOM_WINDOW_STATUSES.map((status) => (
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
            {CUSTOM_WINDOW_EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Windows Table */}
      <DataTable
        data={windows}
        columns={columns}
        actions={actions}
        keyField="id"
        loading={loading}
        emptyMessage="No custom windows found"
        pagination={{
          ...pagination,
          onPageChange: (page) => fetchWindows(page),
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Custom Window"
        message={`Are you sure you want to delete "${selectedWindow?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
      />

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
