'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/admin';
import { normalizeToEmoji, getEmojiLabel } from '@/lib/constants';

interface UserDetail {
  user: {
    id: string;
    timezone: string;
    country_code: string | null;
    city_id: string | null;
    push_opt_in: boolean;
    streak_days: number;
    last_pulse_date: string | null;
    created_at: string;
  };
  pulses: Array<{
    id: string;
    mood: string;
    window_id: string;
    created_at: string;
    reaction_count: number;
  }>;
  badges: Array<{
    badge_id: string;
    earned_at: string;
    badges: {
      name: string;
      description: string;
      icon: string;
    };
  }>;
  events: Array<{
    event_id: string;
    joined_at: string;
    events: {
      title: string;
      status: string;
    };
  }>;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ country_code: '', streak_days: 0 });
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.replace('/admin/users');
            return;
          }
          throw new Error('Failed to fetch user');
        }

        const userData = await response.json();
        setData(userData);
        setEditForm({
          country_code: userData.user.country_code || '',
          streak_days: userData.user.streak_days,
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, router]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const { user } = await response.json();
        setData((prev) => prev ? { ...prev, user } : null);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating user:', error);
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
    return (
      <div className="text-zinc-500">User not found</div>
    );
  }

  const { user, pulses, badges, events } = data;

  // Calculate mood distribution
  const moodCounts: Record<string, number> = {};
  pulses.forEach((p) => {
    moodCounts[p.mood] = (moodCounts[p.mood] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white mb-2 flex items-center gap-1"
          >
            ← Back to Users
          </button>
          <h1 className="text-2xl font-bold text-white">User Details</h1>
          <p className="text-zinc-500 font-mono text-sm">{user.id}</p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* User Info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Country Code</label>
                <input
                  type="text"
                  value={editForm.country_code}
                  onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Streak Days</label>
                <input
                  type="number"
                  value={editForm.streak_days}
                  onChange={(e) => setEditForm({ ...editForm, streak_days: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-zinc-500 text-sm">Country</p>
              <p className="text-white">{user.country_code || '-'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Timezone</p>
              <p className="text-white">{user.timezone || '-'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Push Notifications</p>
              <p className={user.push_opt_in ? 'text-green-400' : 'text-zinc-400'}>
                {user.push_opt_in ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Joined</p>
              <p className="text-white">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Current Streak"
          value={user.streak_days}
          icon="🔥"
          color="yellow"
        />
        <StatsCard
          title="Total Pulses"
          value={pulses.length}
          icon="💫"
          color="purple"
        />
        <StatsCard
          title="Badges Earned"
          value={badges.length}
          icon="🏆"
          color="green"
        />
      </div>

      {/* Mood Distribution */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Mood Distribution</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Object.entries(moodCounts).map(([mood, count]) => (
            <div key={mood} className="text-center">
              <div className="text-3xl mb-1">{normalizeToEmoji(mood)}</div>
              <p className="text-white font-bold">{count}</p>
              <p className="text-zinc-500 text-xs">{getEmojiLabel(mood)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Pulses */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Pulses</h2>
        <div className="space-y-2">
          {pulses.slice(0, 10).map((pulse) => (
            <div
              key={pulse.id}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {normalizeToEmoji(pulse.mood)}
                </span>
                <div>
                  <p className="text-white">{getEmojiLabel(pulse.mood)}</p>
                  <p className="text-zinc-500 text-xs">{pulse.window_id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-sm">
                  {new Date(pulse.created_at).toLocaleDateString()}
                </p>
                {pulse.reaction_count > 0 && (
                  <p className="text-zinc-500 text-xs">{pulse.reaction_count} reactions</p>
                )}
              </div>
            </div>
          ))}
          {pulses.length === 0 && (
            <p className="text-zinc-500 text-center py-4">No pulses yet</p>
          )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div key={badge.badge_id} className="p-4 bg-zinc-800/50 rounded-lg text-center">
                <div className="text-3xl mb-2">{badge.badges.icon}</div>
                <p className="text-white font-medium">{badge.badges.name}</p>
                <p className="text-zinc-500 text-xs">{badge.badges.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Event Participations</h2>
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.event_id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <p className="text-white">{event.events.title}</p>
                <span className={`px-2 py-1 rounded text-xs ${
                  event.events.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {event.events.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
