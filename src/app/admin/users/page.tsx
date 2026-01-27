'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, Action } from '@/components/admin';

interface User {
  id: string;
  timezone: string;
  country_code: string | null;
  city_id: string | null;
  push_opt_in: boolean;
  streak_days: number;
  created_at: string;
  pulse_count: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    pushOptIn: '',
  });
  const router = useRouter();

  const fetchUsers = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: String(page),
        ...(filters.search && { search: filters.search }),
        ...(filters.country && { country: filters.country }),
        ...(filters.pushOptIn && { push_opt_in: filters.pushOptIn }),
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns: Column<User>[] = [
    {
      key: 'id',
      header: 'User ID',
      render: (user) => (
        <span className="font-mono text-xs text-zinc-400">
          {user.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'country_code',
      header: 'Country',
      render: (user) => user.country_code || '-',
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (user) => (
        <span className="text-xs">{user.timezone || '-'}</span>
      ),
    },
    {
      key: 'pulse_count',
      header: 'Pulses',
      sortable: true,
    },
    {
      key: 'streak_days',
      header: 'Streak',
      render: (user) => (
        <span className="flex items-center gap-1">
          {user.streak_days > 0 && '🔥'}
          {user.streak_days}
        </span>
      ),
    },
    {
      key: 'push_opt_in',
      header: 'Push',
      render: (user) => (
        <span className={user.push_opt_in ? 'text-green-400' : 'text-zinc-500'}>
          {user.push_opt_in ? '✓' : '✗'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      render: (user) => new Date(user.created_at).toLocaleDateString(),
    },
  ];

  const actions: Action<User>[] = [
    {
      label: 'View',
      icon: '👁',
      onClick: (user) => router.push(`/admin/users/${user.id}`),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-zinc-500">Manage and view user accounts</p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <input
              type="text"
              placeholder="Country code"
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value.toUpperCase() })}
              maxLength={2}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <select
              value={filters.pushOptIn}
              onChange={(e) => setFilters({ ...filters, pushOptIn: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Push</option>
              <option value="true">Opted In</option>
              <option value="false">Not Opted In</option>
            </select>
          </div>
          <button
            onClick={() => fetchUsers(1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        data={users}
        columns={columns}
        actions={actions}
        keyField="id"
        loading={loading}
        emptyMessage="No users found"
        pagination={{
          ...pagination,
          onPageChange: (page) => fetchUsers(page),
        }}
      />
    </div>
  );
}
