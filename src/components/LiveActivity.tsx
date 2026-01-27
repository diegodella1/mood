'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveActivityProps {
  windowId: string | null;
}

interface ActivityData {
  totalPulses: number;
  topMood: string;
  topMoodCount: number;
  recentPulses: Array<{ mood: string; city?: string; timestamp: number }>;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function LiveActivity({ windowId }: LiveActivityProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedPulse, setDisplayedPulse] = useState<{
    mood: string;
    city?: string;
  } | null>(null);

  // Fetch activity data
  useEffect(() => {
    if (!windowId) return;

    const fetchActivity = async () => {
      try {
        const response = await fetch(`/api/pulse/live?windowId=${windowId}`);
        if (response.ok) {
          const data = await response.json();
          setActivity(data);
        }
      } catch (error) {
        console.error('Failed to fetch live activity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, [windowId]);

  // Rotate through recent pulses for social proof
  useEffect(() => {
    if (!activity?.recentPulses?.length) return;

    let index = 0;
    const showPulse = () => {
      const pulse = activity.recentPulses[index];
      setDisplayedPulse(pulse);
      index = (index + 1) % activity.recentPulses.length;
    };

    showPulse();
    const interval = setInterval(showPulse, 4000);

    return () => clearInterval(interval);
  }, [activity?.recentPulses]);

  if (isLoading || !activity) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSmooth}
      className="glass-card-subtle px-4 py-3"
    >
      {/* Live counter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-[#10b981]"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Live Activity
          </span>
        </div>
        <div className="flex items-center gap-1">
          <motion.span
            key={activity.totalPulses}
            initial={{ scale: 1.3, color: '#22d3ee' }}
            animate={{ scale: 1, color: 'var(--color-text-primary)' }}
            className="font-display font-bold text-lg"
          >
            {activity.totalPulses.toLocaleString()}
          </motion.span>
          <span className="text-sm text-[var(--color-text-muted)]">
            pulses this window
          </span>
        </div>
      </div>

      {/* Top mood indicator */}
      {activity.topMood && (
        <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--surface-glass)] mb-3">
          <span className="text-2xl">{activity.topMood}</span>
          <div className="text-left">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Top mood right now
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {activity.topMoodCount} people feeling this way
            </p>
          </div>
        </div>
      )}

      {/* Recent pulse notifications (social proof) */}
      <AnimatePresence mode="wait">
        {displayedPulse && (
          <motion.div
            key={`${displayedPulse.mood}-${displayedPulse.city}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"
          >
            <span className="text-base">{displayedPulse.mood}</span>
            <span>
              Someone{displayedPulse.city ? ` in ${displayedPulse.city}` : ''}{' '}
              just shared their pulse
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
