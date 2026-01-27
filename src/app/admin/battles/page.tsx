'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, Action, Modal, ConfirmModal } from '@/components/admin';

interface Battle {
  id: string;
  name: string;
  city_a_id: string;
  city_a_name: string;
  city_b_id: string;
  city_b_name: string;
  start_at: string;
  end_at: string;
  scoring_mode: string;
  status: string;
  winner_city_id: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const initialFormState = {
  name: '',
  city_a_id: '',
  city_a_name: '',
  city_b_id: '',
  city_b_name: '',
  start_at: '',
  end_at: '',
  scoring_mode: 'per_capita_bucket',
};

export default function BattlesPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const router = useRouter();

  const fetchBattles = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: String(page),
        ...(filter && { status: filter }),
      });

      const response = await fetch(`/api/admin/battles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch battles');

      const data = await response.json();
      setBattles(data.battles);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching battles:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchBattles();
  }, [fetchBattles]);

  const handleCreate = () => {
    setSelectedBattle(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const handleEdit = (battle: Battle) => {
    setSelectedBattle(battle);
    setFormData({
      name: battle.name,
      city_a_id: battle.city_a_id,
      city_a_name: battle.city_a_name,
      city_b_id: battle.city_b_id,
      city_b_name: battle.city_b_name,
      start_at: battle.start_at.slice(0, 16),
      end_at: battle.end_at.slice(0, 16),
      scoring_mode: battle.scoring_mode,
    });
    setShowModal(true);
  };

  const handleDelete = (battle: Battle) => {
    setSelectedBattle(battle);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const url = selectedBattle
        ? `/api/admin/battles/${selectedBattle.id}`
        : '/api/admin/battles';
      const method = selectedBattle ? 'PATCH' : 'POST';

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
        fetchBattles(pagination.page);
      }
    } catch (error) {
      console.error('Error saving battle:', error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedBattle) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/battles/${selectedBattle.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        fetchBattles(pagination.page);
      }
    } catch (error) {
      console.error('Error deleting battle:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (battle: Battle, status: string) => {
    const token = localStorage.getItem('admin_token');
    await fetch(`/api/admin/battles/${battle.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    fetchBattles(pagination.page);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-yellow-500',
      active: 'bg-green-500',
      completed: 'bg-blue-500',
      cancelled: 'bg-red-500',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs text-white ${colors[status] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  const columns: Column<Battle>[] = [
    {
      key: 'name',
      header: 'Battle',
      render: (b) => (
        <div>
          <p className="text-white font-medium">{b.name}</p>
          <p className="text-zinc-500 text-xs">{b.city_a_name} vs {b.city_b_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => getStatusBadge(b.status),
    },
    {
      key: 'start_at',
      header: 'Start',
      render: (b) => new Date(b.start_at).toLocaleDateString(),
    },
    {
      key: 'end_at',
      header: 'End',
      render: (b) => new Date(b.end_at).toLocaleDateString(),
    },
    {
      key: 'winner_city_id',
      header: 'Winner',
      render: (b) => b.winner_city_id
        ? (b.winner_city_id === b.city_a_id ? b.city_a_name : b.city_b_name)
        : '-',
    },
  ];

  const actions: Action<Battle>[] = [
    {
      label: 'View',
      icon: '👁',
      onClick: (b) => router.push(`/admin/battles/${b.id}`),
    },
    {
      label: 'Start',
      icon: '▶️',
      onClick: (b) => updateStatus(b, 'active'),
      show: (b) => b.status === 'scheduled',
    },
    {
      label: 'Complete',
      icon: '✓',
      onClick: (b) => updateStatus(b, 'completed'),
      show: (b) => b.status === 'active',
    },
    {
      label: 'Edit',
      icon: '✏️',
      onClick: handleEdit,
      show: (b) => b.status !== 'completed',
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
          <h1 className="text-2xl font-bold text-white">City Battles</h1>
          <p className="text-zinc-500">Create and manage weekly city battles</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          + New Battle
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        {['', 'scheduled', 'active', 'completed'].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg ${
              filter === status
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      <DataTable
        data={battles}
        columns={columns}
        actions={actions}
        keyField="id"
        loading={loading}
        emptyMessage="No battles found"
        pagination={{
          ...pagination,
          onPageChange: (page) => fetchBattles(page),
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedBattle ? 'Edit Battle' : 'Create Battle'}
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
            <label className="block text-sm text-zinc-400 mb-1">Battle Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="NYC vs LA - Week 1"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">City A ID *</label>
              <input
                type="text"
                value={formData.city_a_id}
                onChange={(e) => setFormData({ ...formData, city_a_id: e.target.value })}
                placeholder="nyc"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">City A Name *</label>
              <input
                type="text"
                value={formData.city_a_name}
                onChange={(e) => setFormData({ ...formData, city_a_name: e.target.value })}
                placeholder="New York City"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">City B ID *</label>
              <input
                type="text"
                value={formData.city_b_id}
                onChange={(e) => setFormData({ ...formData, city_b_id: e.target.value })}
                placeholder="la"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">City B Name *</label>
              <input
                type="text"
                value={formData.city_b_name}
                onChange={(e) => setFormData({ ...formData, city_b_name: e.target.value })}
                placeholder="Los Angeles"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
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
            <label className="block text-sm text-zinc-400 mb-1">Scoring Mode</label>
            <select
              value={formData.scoring_mode}
              onChange={(e) => setFormData({ ...formData, scoring_mode: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            >
              <option value="per_capita_bucket">Per Capita Bucket</option>
              <option value="total">Total Pulses</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Battle"
        message={`Are you sure you want to delete "${selectedBattle?.name}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
      />
    </div>
  );
}
