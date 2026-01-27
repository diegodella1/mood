'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/admin';

interface BattleDetail {
  battle: {
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
    copy: Record<string, string>;
    assets: Record<string, string>;
  };
  scores: Array<{
    city_id: string;
    window_id: string;
    raw_pulses: number;
    weighted_score: number;
  }>;
  totals: Record<string, { pulses: number; score: number }>;
}

export default function BattleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBattle = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/battles/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.replace('/admin/battles');
            return;
          }
          throw new Error('Failed to fetch battle');
        }

        const battleData = await response.json();
        setData(battleData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBattle();
  }, [id, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-800 rounded w-1/4 mb-4"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-zinc-500">Battle not found</div>;
  }

  const { battle, totals } = data;
  const scoreA = totals[battle.city_a_id]?.score || 0;
  const scoreB = totals[battle.city_b_id]?.score || 0;
  const pulsesA = totals[battle.city_a_id]?.pulses || 0;
  const pulsesB = totals[battle.city_b_id]?.pulses || 0;

  const now = new Date();
  const startAt = new Date(battle.start_at);
  const endAt = new Date(battle.end_at);
  const totalDuration = endAt.getTime() - startAt.getTime();
  const elapsed = Math.max(0, Math.min(now.getTime() - startAt.getTime(), totalDuration));
  const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-yellow-500',
      active: 'bg-green-500',
      completed: 'bg-blue-500',
      cancelled: 'bg-red-500',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm text-white ${colors[status] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
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
            ← Back to Battles
          </button>
          <h1 className="text-2xl font-bold text-white">{battle.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            {getStatusBadge(battle.status)}
            <span className="text-zinc-500">{battle.scoring_mode}</span>
          </div>
        </div>
      </div>

      {/* Battle Scoreboard */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
        <div className="grid grid-cols-3 gap-8 items-center text-center">
          {/* City A */}
          <div className={`${battle.winner_city_id === battle.city_a_id ? 'text-green-400' : ''}`}>
            <h2 className="text-2xl font-bold text-white">{battle.city_a_name}</h2>
            <p className="text-5xl font-bold my-4" style={{ color: battle.assets?.card_color_a || '#3b82f6' }}>
              {Math.round(scoreA)}
            </p>
            <p className="text-zinc-500">{pulsesA} pulses</p>
            {battle.winner_city_id === battle.city_a_id && (
              <p className="text-green-400 mt-2">Winner!</p>
            )}
          </div>

          {/* VS */}
          <div>
            <p className="text-4xl font-bold text-zinc-600">VS</p>
            {battle.status === 'active' && (
              <div className="mt-4">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-1">{Math.round(progress)}% complete</p>
              </div>
            )}
          </div>

          {/* City B */}
          <div className={`${battle.winner_city_id === battle.city_b_id ? 'text-green-400' : ''}`}>
            <h2 className="text-2xl font-bold text-white">{battle.city_b_name}</h2>
            <p className="text-5xl font-bold my-4" style={{ color: battle.assets?.card_color_b || '#ef4444' }}>
              {Math.round(scoreB)}
            </p>
            <p className="text-zinc-500">{pulsesB} pulses</p>
            {battle.winner_city_id === battle.city_b_id && (
              <p className="text-green-400 mt-2">Winner!</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pulses"
          value={pulsesA + pulsesB}
          icon="💫"
          color="purple"
        />
        <StatsCard
          title="Score Difference"
          value={Math.abs(scoreA - scoreB).toFixed(0)}
          icon="📊"
          color="blue"
        />
        <StatsCard
          title="Starts"
          value={startAt.toLocaleDateString()}
          icon="📅"
          color="green"
        />
        <StatsCard
          title="Ends"
          value={endAt.toLocaleDateString()}
          icon="🏁"
          color="yellow"
        />
      </div>

      {/* Details */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Battle Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-zinc-500 text-sm">City A ID</p>
            <p className="text-white font-mono">{battle.city_a_id}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">City B ID</p>
            <p className="text-white font-mono">{battle.city_b_id}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Scoring Mode</p>
            <p className="text-white">{battle.scoring_mode}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Status</p>
            <p className="text-white capitalize">{battle.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
