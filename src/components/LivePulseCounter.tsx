'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';

interface LiveStats {
  activeNow: number;
  pulsingNow: number;
  pulsesLastHour: number;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function LivePulseCounter() {
  const { user } = useUser();
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Fetch live stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/live');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch live stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Send heartbeat
  useEffect(() => {
    if (!user?.id) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
      } catch {
        // Silent fail
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  if (!stats || stats.activeNow < 2) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={springSmooth}
          className="flex items-center justify-center gap-2 py-2"
        >
          {/* Pulsing dot */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-2 h-2 rounded-full bg-[var(--color-aurora-teal)]"
          />

          {/* Counter */}
          <motion.span
            key={stats.activeNow}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-[var(--color-text-secondary)]"
          >
            <span className="font-bold text-[var(--color-aurora-cyan)]">
              {stats.activeNow > 1000
                ? `${(stats.activeNow / 1000).toFixed(1)}K`
                : stats.activeNow}
            </span>{' '}
            {stats.pulsingNow > 0 ? (
              <>
                people online •{' '}
                <span className="text-[var(--color-aurora-violet)]">{stats.pulsingNow}</span>{' '}
                pulsing now
              </>
            ) : (
              'people feeling the pulse'
            )}
          </motion.span>

          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
