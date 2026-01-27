'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, Column, Action, Modal, ConfirmModal } from '@/components/admin';
import { ALERT_TYPES, ALERT_SEVERITIES } from '@/lib/admin/constants';

interface Alert {
  id: string;
  title: string;
  message: string;
  alert_type: string;
  severity: string;
  dismissible: boolean;
  active_from: string;
  active_until: string | null;
  target_audience: string;
  created_at: string;
  dismiss_count: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const initialFormState = {
  title: '',
  message: '',
  alert_type: 'info',
  severity: 'low',
  dismissible: true,
  active_from: '',
  active_until: '',
  target_audience: 'all',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);

  const fetchAlerts = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: String(page),
        ...(activeOnly && { active: 'true' }),
      });

      const response = await fetch(`/api/admin/alerts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data.alerts);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = () => {
    setSelectedAlert(null);
    setFormData({
      ...initialFormState,
      active_from: new Date().toISOString().slice(0, 16),
    });
    setShowModal(true);
  };

  const handleEdit = (alert: Alert) => {
    setSelectedAlert(alert);
    setFormData({
      title: alert.title,
      message: alert.message,
      alert_type: alert.alert_type,
      severity: alert.severity,
      dismissible: alert.dismissible,
      active_from: alert.active_from.slice(0, 16),
      active_until: alert.active_until?.slice(0, 16) || '',
      target_audience: alert.target_audience,
    });
    setShowModal(true);
  };

  const handleDelete = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const url = selectedAlert
        ? `/api/admin/alerts/${selectedAlert.id}`
        : '/api/admin/alerts';
      const method = selectedAlert ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        active_until: formData.active_until || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        fetchAlerts(pagination.page);
      }
    } catch (error) {
      console.error('Error saving alert:', error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedAlert) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/alerts/${selectedAlert.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        fetchAlerts(pagination.page);
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (alert: Alert) => {
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/admin/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active_until: new Date().toISOString() }),
      });
      fetchAlerts(pagination.page);
    } catch (error) {
      console.error('Error deactivating alert:', error);
    }
  };

  const isActive = (alert: Alert) => {
    const now = new Date();
    const from = new Date(alert.active_from);
    const until = alert.active_until ? new Date(alert.active_until) : null;
    return now >= from && (!until || now <= until);
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = ALERT_TYPES.find((t) => t.value === type);
    return (
      <span className="flex items-center gap-1">
        <span>{typeConfig?.icon}</span>
        <span className={`px-2 py-0.5 rounded text-xs ${typeConfig?.color} text-white`}>
          {typeConfig?.label || type}
        </span>
      </span>
    );
  };

  const columns: Column<Alert>[] = [
    {
      key: 'title',
      header: 'Alert',
      render: (alert) => (
        <div>
          <p className="text-white font-medium">{alert.title}</p>
          <p className="text-zinc-500 text-xs truncate max-w-xs">{alert.message}</p>
        </div>
      ),
    },
    {
      key: 'alert_type',
      header: 'Type',
      render: (alert) => getTypeBadge(alert.alert_type),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (alert) => {
        const severityConfig = ALERT_SEVERITIES.find((s) => s.value === alert.severity);
        return <span className={severityConfig?.color}>{severityConfig?.label || alert.severity}</span>;
      },
    },
    {
      key: 'active',
      header: 'Status',
      render: (alert) => (
        <span className={`px-2 py-1 rounded text-xs ${isActive(alert) ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
          {isActive(alert) ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'dismiss_count',
      header: 'Dismissed',
    },
    {
      key: 'active_until',
      header: 'Expires',
      render: (alert) => alert.active_until ? new Date(alert.active_until).toLocaleDateString() : 'Never',
    },
  ];

  const actions: Action<Alert>[] = [
    {
      label: 'Edit',
      icon: '✏️',
      onClick: handleEdit,
    },
    {
      label: 'Deactivate',
      icon: '⏸',
      onClick: handleDeactivate,
      show: isActive,
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
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-zinc-500">Manage system alerts and announcements</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + New Alert
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-zinc-400">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
          />
          Active only
        </label>
      </div>

      {/* Alerts Table */}
      <DataTable
        data={alerts}
        columns={columns}
        actions={actions}
        keyField="id"
        loading={loading}
        emptyMessage="No alerts found"
        pagination={{
          ...pagination,
          onPageChange: (page) => fetchAlerts(page),
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedAlert ? 'Edit Alert' : 'Create Alert'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">
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
              placeholder="Alert title"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              placeholder="Alert message"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Type</label>
              <select
                value={formData.alert_type}
                onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {ALERT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                {ALERT_SEVERITIES.map((sev) => (
                  <option key={sev.value} value={sev.value}>
                    {sev.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Active From</label>
              <input
                type="datetime-local"
                value={formData.active_from}
                onChange={(e) => setFormData({ ...formData, active_from: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Active Until (optional)</label>
              <input
                type="datetime-local"
                value={formData.active_until}
                onChange={(e) => setFormData({ ...formData, active_until: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                checked={formData.dismissible}
                onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
              />
              Dismissible by user
            </label>
          </div>

          {/* Preview */}
          <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/50">
            <p className="text-zinc-400 text-xs mb-2">Preview</p>
            <div className={`rounded-lg p-4 ${
              formData.alert_type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30' :
              formData.alert_type === 'error' ? 'bg-red-500/10 border border-red-500/30' :
              formData.alert_type === 'success' ? 'bg-green-500/10 border border-green-500/30' :
              formData.alert_type === 'promo' ? 'bg-purple-500/10 border border-purple-500/30' :
              'bg-blue-500/10 border border-blue-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {ALERT_TYPES.find((t) => t.value === formData.alert_type)?.icon}
                </span>
                <div>
                  <p className="font-medium text-white">{formData.title || 'Title'}</p>
                  <p className="text-zinc-300 text-sm">{formData.message || 'Message...'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Alert"
        message={`Are you sure you want to delete "${selectedAlert?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
      />
    </div>
  );
}
