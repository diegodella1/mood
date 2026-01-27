'use client';

import { memo, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { normalizeToEmoji, getEmojiLabel } from '@/lib/constants';
import { useAggregates } from '@/hooks/useAggregates';
import { useActiveWindow } from '@/hooks/useActiveWindow';
import { useUser } from '@/providers/UserProvider';
import { PulseCard } from './PulseCard';

// Lazy load the map component
const PulseMap = lazy(() => import('./PulseMap').then(mod => ({ default: mod.PulseMap })));

// Spring configs
const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };
const springBouncy = { type: 'spring' as const, damping: 15, stiffness: 120 };

export function ResultsView() {
  const { user } = useUser();
  const { windowId } = useActiveWindow();
  const { global, city, isLoading, error } = useAggregates(windowId, user?.cityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="relative">
          <div className="w-16 h-16 border-3 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 aurora-gradient opacity-30 blur-xl rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center p-8"
      >
        <div className="glass-card p-6">
          <p className="text-[var(--color-aurora-pink)] font-display font-medium">
            Failed to load results
          </p>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">{error}</p>
        </div>
      </motion.div>
    );
  }

  if (!global) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-8"
      >
        <div className="glass-card-glow p-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-4"
          >
            ✨
          </motion.div>
          <p className="font-display font-medium text-[var(--color-text-primary)]">
            No results yet for this window
          </p>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">
            Be the first to share your mood!
          </p>
        </div>
      </motion.div>
    );
  }

  // Sort moods by count (descending) and take top 10
  const sortedMoods = Object.entries(global.moodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Global Pulse */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
      >
        <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3">
          <span className="text-2xl">🌍</span>
          <span>Global Pulse</span>
        </h2>
        <PulseCard
          title="The World"
          moodCounts={global.moodCounts}
          totalCount={global.totalCount}
          dominantMood={global.dominantMood}
        />
      </motion.section>

      {/* City Pulse */}
      {city ? (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.1 }}
        >
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3">
            <span className="text-2xl">🏙️</span>
            <span>Your City</span>
          </h2>
          <PulseCard
            title={city.cityId}
            moodCounts={city.moodCounts}
            totalCount={city.totalCount}
            dominantMood={city.dominantMood}
          />
        </motion.section>
      ) : null}

      {/* World Map */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: 0.15 }}
      >
        <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <span>World Pulse Map</span>
        </h2>
        <Suspense
          fallback={
            <div className="glass-card h-[400px] flex items-center justify-center">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          }
        >
          <PulseMap windowId={windowId} />
        </Suspense>
      </motion.section>

      {/* Mood Breakdown */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: 0.2 }}
      >
        <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-5">
          Mood Breakdown
        </h3>
        <div className="glass-card p-5 space-y-4">
          {sortedMoods.map(([mood, count], index) => {
            const percentage = global.totalCount > 0 ? (count / global.totalCount) * 100 : 0;
            const emoji = normalizeToEmoji(mood);
            const isTop = index === 0;

            return (
              <MoodBar
                key={mood}
                emoji={emoji}
                label={getEmojiLabel(mood)}
                count={count}
                percentage={percentage}
                isTop={isTop}
                index={index}
              />
            );
          })}
        </div>
        {sortedMoods.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm">No mood data yet</p>
        ) : null}
      </motion.section>

      {/* Top Cities */}
      {global.topCities.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.3 }}
        >
          <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-5">
            Top Active Cities
          </h3>
          <div className="space-y-3">
            {global.topCities.slice(0, 5).map((cityData, index) => (
              <motion.div
                key={cityData.cityId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springBouncy, delay: 0.4 + index * 0.05 }}
                className="glass-card-subtle px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className={`
                    font-mono text-sm w-6 h-6 flex items-center justify-center rounded-full
                    ${index === 0 ? 'bg-[var(--color-aurora-amber)] text-black font-bold' :
                      index === 1 ? 'bg-[var(--color-text-secondary)] text-black' :
                      index === 2 ? 'bg-[var(--color-aurora-pink)]/60 text-white' :
                      'text-[var(--color-text-muted)]'}
                  `}>
                    {index + 1}
                  </span>
                  <span className="font-display text-[var(--color-text-primary)]">
                    {cityData.cityId}
                  </span>
                </div>
                <span className="font-mono text-sm text-[var(--color-aurora-cyan)]">
                  {cityData.count} pulses
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}

interface MoodBarProps {
  emoji: string;
  label: string;
  count: number;
  percentage: number;
  isTop: boolean;
  index: number;
}

const MoodBar = memo(function MoodBar({ emoji, label, count, percentage, isTop, index }: MoodBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...springBouncy, delay: index * 0.05 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springBouncy, delay: index * 0.05 + 0.1 }}
            className="text-2xl"
          >
            {emoji}
          </motion.span>
          <span className={`
            font-display text-sm
            ${isTop ? 'text-[var(--color-text-primary)] font-semibold' : 'text-[var(--color-text-secondary)]'}
          `}>
            {label}
          </span>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.2 }}
          className="font-mono text-sm text-[var(--color-text-muted)]"
        >
          {count}
        </motion.span>
      </div>

      <div className="progress-bar-cosmic">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 80,
            delay: index * 0.05 + 0.15,
          }}
          className={isTop ? 'fill fill-top' : 'fill'}
        />
      </div>
    </motion.div>
  );
});
