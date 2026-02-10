'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';
import { ShareButton } from '@/components/ShareButton';
import { AURA_DEFINITIONS, type AuraType } from '@/lib/auras';

type TabType = 'cities' | 'streaks';

interface CityRank {
  city_id: string;
  city_name: string;
  active_users: number;
  dominant_emoji: string;
  pulse_count: number;
}

interface StreakRank {
  rank: number;
  displayName: string;
  streakDays: number;
  aura: AuraType;
  cityId: string | null;
  isAnonymous: boolean;
}

interface UserRank {
  city_rank: number | null;
  global_rank: number | null;
  city_name: string | null;
  city_total_users: number | null;
}

const springSmooth = { type: 'spring' as const, damping: 30, stiffness: 200 };

export default function LeaderboardPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('streaks');
  const [cities, setCities] = useState<CityRank[]>([]);
  const [streaks, setStreaks] = useState<StreakRank[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch based on active tab
        if (activeTab === 'cities') {
          const res = await fetch('/api/leaderboard?type=cities');
          if (res.ok) {
            const data = await res.json();
            setCities(data.cities || []);
          }
        } else {
          const res = await fetch('/api/leaderboard?type=streaks');
          if (res.ok) {
            const data = await res.json();
            setStreaks(data.streaks || []);
          }
        }

        // Fetch user's rank if logged in
        if (user?.id) {
          const rankRes = await fetch(`/api/leaderboard?type=user&userId=${user.id}`);
          if (rankRes.ok) {
            const rankData = await rankRes.json();
            setUserRank(rankData.rank || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user?.id]);

  const getAuraIcon = (aura: AuraType | null) => {
    if (!aura) return null;
    return AURA_DEFINITIONS[aura]?.icon || null;
  };

  const getAuraColor = (aura: AuraType | null) => {
    if (!aura) return 'text-[var(--color-text-secondary)]';
    // Map aura to color class
    const colorMap: Record<string, string> = {
      fire: 'text-orange-400',
      lightning: 'text-yellow-400',
      diamond: 'text-blue-300',
    };
    return colorMap[aura] || 'text-[var(--color-text-secondary)]';
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4"
      >
        <div className="max-w-lg mx-auto glass-card px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            Leaderboard
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </motion.header>

      {/* User's Rank Card */}
      {user && userRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.1 }}
          className="px-4 mt-2"
        >
          <div className="max-w-lg mx-auto glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Your Rank</p>
                <div className="flex items-baseline gap-2 mt-1">
                  {userRank.city_rank && userRank.city_name ? (
                    <>
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                        #{userRank.city_rank}
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        in {userRank.city_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      Select a city to see your rank
                    </span>
                  )}
                </div>
              </div>
              {userRank.city_rank && (
                <ShareButton
                  type="leaderboard"
                  data={{
                    userRank: userRank.city_rank,
                    cityName: userRank.city_name || undefined,
                  }}
                  variant="secondary"
                  size="sm"
                  label="Share"
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springSmooth, delay: 0.2 }}
        className="px-4 mt-4"
      >
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={() => setActiveTab('streaks')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'streaks'
                ? 'aurora-gradient text-white shadow-lg'
                : 'glass-card-subtle text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Top Streaks
          </button>
          <button
            onClick={() => setActiveTab('cities')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'cities'
                ? 'aurora-gradient text-white shadow-lg'
                : 'glass-card-subtle text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Cities
          </button>
        </div>
      </motion.div>

      {/* Leaderboard Content */}
      <div className="flex-1 px-4 py-4">
        <div className="max-w-lg mx-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-card-subtle p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-glass)]" />
                    <div className="flex-1">
                      <div className="h-4 bg-[var(--surface-glass)] rounded w-32 mb-2" />
                      <div className="h-3 bg-[var(--surface-glass)] rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'streaks' ? (
                <motion.div
                  key="streaks"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-2"
                >
                  {streaks.length === 0 ? (
                    <div className="glass-card-subtle p-8 text-center">
                      <p className="text-[var(--color-text-secondary)]">No streaks yet</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Be the first to start a streak!
                      </p>
                    </div>
                  ) : (
                    streaks.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`glass-card-subtle p-4 flex items-center gap-4 ${
                          user?.id && entry.displayName === user.displayName
                            ? 'ring-2 ring-[var(--color-aurora-teal)]'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.rank === 1
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : entry.rank === 2
                            ? 'bg-gray-400/20 text-gray-300'
                            : entry.rank === 3
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-[var(--surface-glass)] text-[var(--color-text-secondary)]'
                        }`}>
                          {entry.rank <= 3 ? ['', '1st', '2nd', '3rd'][entry.rank] : entry.rank}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">
                            {entry.isAnonymous ? 'Anonymous' : entry.displayName}
                          </p>
                          {entry.cityId && (
                            <p className="text-xs text-[var(--color-text-muted)] truncate">
                              {entry.cityId}
                            </p>
                          )}
                        </div>

                        {/* Streak with Aura */}
                        <div className={`flex items-center gap-1.5 ${getAuraColor(entry.aura)}`}>
                          <span className="text-lg font-bold">
                            {entry.streakDays}
                          </span>
                          <span className="text-xl">{getAuraIcon(entry.aura) || '📈'}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="cities"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-2"
                >
                  {cities.length === 0 || (user?.cityId && cities.find(c => c.city_id === user.cityId)?.active_users !== undefined && (cities.find(c => c.city_id === user.cityId)?.active_users ?? 0) < 3) ? (
                    <div className="glass-card-subtle p-8 text-center">
                      <p className="text-2xl mb-2">🌍</p>
                      <p className="text-[var(--color-text-secondary)] font-medium">
                        {cities.length === 0 ? 'No city data yet' : 'Your city needs more people!'}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
                        {cities.length === 0 ? 'Select your city to join the ranks!' : 'Invite friends from your city to unlock the leaderboard'}
                      </p>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'Join me on Global Pulse',
                              text: 'Share how you feel and see how the world feels back!',
                              url: window.location.origin,
                            }).catch(() => {});
                          }
                        }}
                        className="px-5 py-2.5 text-sm font-medium rounded-xl bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)] border border-[var(--color-aurora-cyan)]/30 hover:bg-[var(--color-aurora-cyan)]/30 transition-colors"
                      >
                        Invite Friends
                      </button>
                    </div>
                  ) : (
                    cities.map((city, index) => (
                      <motion.div
                        key={city.city_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`glass-card-subtle p-4 flex items-center gap-4 ${
                          user?.cityId === city.city_id
                            ? 'ring-2 ring-[var(--color-aurora-teal)]'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : index === 1
                            ? 'bg-gray-400/20 text-gray-300'
                            : index === 2
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-[var(--surface-glass)] text-[var(--color-text-secondary)]'
                        }`}>
                          {index + 1}
                        </div>

                        {/* City Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">
                            {city.city_name || city.city_id}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {city.active_users} active • {city.pulse_count} pulses
                          </p>
                        </div>

                        {/* Dominant Mood */}
                        <div className="text-2xl">
                          {city.dominant_emoji || '🌍'}
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: 0.4 }}
        className="px-4 pb-6"
      >
        <div className="max-w-lg mx-auto glass-card p-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Climb the ranks by maintaining your streak!
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 aurora-gradient text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            Pulse Now
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
