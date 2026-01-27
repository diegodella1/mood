'use client';

import { useEffect, useState } from 'react';
import { StatsCard, LineChart, PieChart } from '@/components/admin';
import { normalizeToEmoji } from '@/lib/constants';

interface Stats {
  overview: {
    totalUsers: number;
    userGrowth: number;
    totalPulses: number;
    pulseGrowth: number;
    pushOptIns: number;
    pushOptInRate: number;
    activeEvents: number;
    pendingNotifications: number;
    activeAlerts: number;
    avgDailyPulses: number;
  };
  charts: {
    dailyPulses: { name: string; pulses: number }[];
    moodDistribution: { name: string; value: number }[];
    topCountries: { name: string; value: number }[];
  };
  lastUpdated: string;
}

// Base colors for the original 6 moods (for backwards compatibility)
const LEGACY_MOOD_COLORS: Record<string, string> = {
  hype: '#f59e0b',
  overwhelmed: '#ef4444',
  calm: '#10b981',
  chaos: '#8b5cf6',
  low: '#6b7280',
  focused: '#3b82f6',
  // Also map emojis directly
  '\uD83D\uDD25': '#f59e0b', // 🔥
  '\uD83D\uDE35': '#ef4444', // 😵
  '\uD83D\uDE0C': '#10b981', // 😌
  '\uD83C\uDF00': '#8b5cf6', // 🌀
  '\uD83D\uDE14': '#6b7280', // 😔
  '\uD83C\uDFAF': '#3b82f6', // 🎯
};

// Generate a deterministic color from a string (for custom emojis)
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with good saturation and lightness
  const h = Math.abs(hash % 360);
  const s = 65 + (Math.abs(hash >> 8) % 20); // 65-85%
  const l = 50 + (Math.abs(hash >> 16) % 15); // 50-65%

  return `hsl(${h}, ${s}%, ${l}%)`;
}

// Get color for a mood (legacy string or emoji)
function getMoodColor(mood: string): string {
  // Check if it's a known legacy mood or emoji
  if (LEGACY_MOOD_COLORS[mood]) {
    return LEGACY_MOOD_COLORS[mood];
  }

  // Normalize and check again
  const normalized = normalizeToEmoji(mood);
  if (LEGACY_MOOD_COLORS[normalized]) {
    return LEGACY_MOOD_COLORS[normalized];
  }

  // Generate a color for unknown emojis
  return stringToColor(mood);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500">Loading statistics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCard key={i} title="" value="" loading />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
        <h2 className="font-bold mb-2">Error loading dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  // Generate colors dynamically for all moods/emojis
  const moodDataWithColors = stats.charts.moodDistribution.map((item) => ({
    ...item,
    color: getMoodColor(item.name),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500">Overview of Global Pulse metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.overview.totalUsers}
          change={stats.overview.userGrowth}
          icon="👥"
          color="blue"
        />
        <StatsCard
          title="Total Pulses"
          value={stats.overview.totalPulses}
          change={stats.overview.pulseGrowth}
          icon="💫"
          color="purple"
        />
        <StatsCard
          title="Push Opt-ins"
          value={`${stats.overview.pushOptInRate}%`}
          changeLabel={`${stats.overview.pushOptIns} users`}
          icon="🔔"
          color="green"
        />
        <StatsCard
          title="Avg Daily Pulses"
          value={stats.overview.avgDailyPulses}
          icon="📈"
          color="yellow"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Active Events"
          value={stats.overview.activeEvents}
          icon="📅"
          color="purple"
        />
        <StatsCard
          title="Pending Notifications"
          value={stats.overview.pendingNotifications}
          icon="⏰"
          color="yellow"
        />
        <StatsCard
          title="Active Alerts"
          value={stats.overview.activeAlerts}
          icon="📢"
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Pulses Chart */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Pulses (Last 7 Days)</h3>
          <LineChart
            data={stats.charts.dailyPulses}
            lines={[{ dataKey: 'pulses', color: '#3b82f6', name: 'Pulses' }]}
            height={280}
            showLegend={false}
          />
        </div>

        {/* Mood Distribution */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Mood Distribution</h3>
          <PieChart
            data={moodDataWithColors}
            height={280}
            innerRadius={50}
            outerRadius={90}
          />
        </div>
      </div>

      {/* Top Countries */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Countries (Last 7 Days)</h3>
        <div className="space-y-3">
          {stats.charts.topCountries.map((country, index) => (
            <div key={country.name} className="flex items-center gap-4">
              <span className="text-zinc-500 w-6">{index + 1}.</span>
              <span className="text-white font-medium w-12">{country.name}</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{
                    width: `${(country.value / stats.charts.topCountries[0]?.value) * 100}%`,
                  }}
                />
              </div>
              <span className="text-zinc-400 w-16 text-right">{country.value.toLocaleString()}</span>
            </div>
          ))}
          {stats.charts.topCountries.length === 0 && (
            <p className="text-zinc-500">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
