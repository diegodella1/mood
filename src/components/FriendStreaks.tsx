'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';
import { AURA_DEFINITIONS, AuraType } from '@/lib/auras';

interface FriendStreak {
  id: string;
  friendId: string;
  friendName: string;
  friendAura: AuraType | null;
  streakDays: number;
  maxStreak: number;
  startedAt: string | null;
  userPulsedToday: boolean;
  friendPulsedToday: boolean;
  atRisk: boolean;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function FriendStreaks() {
  const { user } = useUser();
  const [streaks, setStreaks] = useState<FriendStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchStreaks = async () => {
      try {
        const res = await fetch(`/api/friends/streaks?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setStreaks(data.streaks || []);
        }
      } catch (error) {
        console.error('Failed to fetch streaks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreaks();
  }, [user?.id]);

  if (isLoading) return null;

  if (streaks.length === 0) {
    return (
      <div className="glass-card-subtle p-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          No friend streaks yet
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Add friends to build streaks together
        </p>
      </div>
    );
  }

  const atRiskStreaks = streaks.filter((s) => s.atRisk && s.streakDays > 0);
  const healthyStreaks = streaks.filter((s) => !s.atRisk);

  return (
    <div className="space-y-3">
      {/* At risk warning */}
      {atRiskStreaks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-4 border border-[var(--color-aurora-amber)]/30 bg-[var(--color-aurora-amber)]/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="text-sm font-bold text-[var(--color-aurora-amber)]">
              Streaks at Risk!
            </h3>
          </div>
          <div className="space-y-2">
            {atRiskStreaks.map((streak) => (
              <div
                key={streak.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-glass-light)]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {streak.friendName}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {streak.streakDays}d 🔥
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={streak.userPulsedToday ? 'text-green-400' : 'text-[var(--color-aurora-amber)]'}>
                    You: {streak.userPulsedToday ? '✓' : '✗'}
                  </span>
                  <span className={streak.friendPulsedToday ? 'text-green-400' : 'text-[var(--color-aurora-amber)]'}>
                    Them: {streak.friendPulsedToday ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Healthy streaks */}
      {healthyStreaks.length > 0 && (
        <div className="glass-card-subtle p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
            <span>🤝</span>
            Friend Streaks
          </h3>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {healthyStreaks.slice(0, 5).map((streak, index) => (
                <motion.div
                  key={streak.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springSmooth, delay: index * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-glass-light)]"
                >
                  <div className="flex items-center gap-2">
                    {streak.friendAura && AURA_DEFINITIONS[streak.friendAura] && (
                      <span>{AURA_DEFINITIONS[streak.friendAura].icon}</span>
                    )}
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {streak.friendName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--color-aurora-cyan)]">
                      {streak.streakDays}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">days</span>
                    <span className="text-green-400">✓✓</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
