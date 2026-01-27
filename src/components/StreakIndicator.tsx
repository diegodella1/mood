'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

interface StreakIndicatorProps {
  hasSubmittedToday: boolean;
  compact?: boolean;
}

export function StreakIndicator({ hasSubmittedToday, compact = false }: StreakIndicatorProps) {
  const { user } = useUser();

  if (!user) return null;

  const streakDays = user.streakDays || 0;
  const isAtRisk = streakDays > 0 && !hasSubmittedToday;

  // Streak milestones for extra motivation
  const nextMilestone = getNextMilestone(streakDays);
  const daysToMilestone = nextMilestone - streakDays;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          isAtRisk
            ? 'bg-[#ff6b6b]/20 border border-[#ff6b6b]/40'
            : 'bg-[var(--surface-glass-light)]'
        }`}
      >
        <motion.span
          animate={isAtRisk ? { scale: [1, 1.3, 1] } : { scale: [1, 1.1, 1] }}
          transition={{
            duration: isAtRisk ? 0.4 : 0.5,
            repeat: Infinity,
            repeatDelay: isAtRisk ? 0.5 : 2,
          }}
          className="text-lg"
        >
          {isAtRisk ? '⚠️' : '🔥'}
        </motion.span>
        <span
          className={`font-semibold text-sm ${
            isAtRisk ? 'text-[#ff6b6b]' : 'text-[var(--color-text-primary)]'
          }`}
        >
          {streakDays}
        </span>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {streakDays > 0 ? (
        <motion.div
          key={isAtRisk ? 'at-risk' : 'safe'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={springSmooth}
          className="w-full"
        >
          <div
            className={`glass-card px-6 py-4 ${
              isAtRisk ? 'border-[#ff6b6b]/50 bg-[#ff6b6b]/5' : 'glass-card-glow'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.span
                  animate={
                    isAtRisk
                      ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] }
                      : { scale: [1, 1.2, 1] }
                  }
                  transition={{
                    duration: isAtRisk ? 0.5 : 0.5,
                    repeat: Infinity,
                    repeatDelay: isAtRisk ? 0.3 : 2,
                  }}
                  className="text-3xl"
                >
                  {isAtRisk ? '⚠️' : '🔥'}
                </motion.span>
                <div>
                  <p
                    className={`font-display font-semibold text-lg ${
                      isAtRisk
                        ? 'text-[#ff6b6b]'
                        : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    {streakDays} day streak
                    {isAtRisk && ' at risk!'}
                  </p>
                  <p
                    className={`text-sm ${
                      isAtRisk
                        ? 'text-[#ff6b6b]/80'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isAtRisk
                      ? `Submit a pulse to keep your streak!`
                      : hasSubmittedToday
                      ? 'Streak secured for today'
                      : 'Keep the energy flowing'}
                  </p>
                </div>
              </div>

              {/* Milestone indicator */}
              {!isAtRisk && daysToMilestone <= 3 && daysToMilestone > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-right"
                >
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                    Next milestone
                  </p>
                  <p className="font-display font-bold text-[var(--color-aurora-cyan)]">
                    {nextMilestone} days
                  </p>
                  <p className="text-xs text-[var(--color-aurora-purple)]">
                    {daysToMilestone} more to go!
                  </p>
                </motion.div>
              )}
            </div>

            {/* Progress bar to next milestone */}
            {!isAtRisk && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
              >
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                  <span>{getPreviousMilestone(streakDays)} days</span>
                  <span>{nextMilestone} days</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-glass-light)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${getMilestoneProgress(streakDays)}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[var(--color-aurora-cyan)] to-[var(--color-aurora-purple)] rounded-full"
                  />
                </div>
              </motion.div>
            )}

            {/* Loss aversion message */}
            {isAtRisk && streakDays >= 7 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-3 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/20"
              >
                <p className="text-sm text-[#ff6b6b]">
                  <strong>Don&apos;t lose {streakDays} days of progress!</strong>{' '}
                  {streakDays >= 30
                    ? 'Your legendary streak is on the line!'
                    : streakDays >= 14
                    ? "You've worked hard for this streak!"
                    : "You're building momentum!"}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="no-streak"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSmooth}
          className="glass-card-subtle px-6 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl opacity-50">🔥</span>
            <div>
              <p className="font-display font-medium text-[var(--color-text-secondary)]">
                Start your streak!
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Submit a pulse to begin your journey
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Streak milestones for gamification
const MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];

function getNextMilestone(currentStreak: number): number {
  for (const milestone of MILESTONES) {
    if (milestone > currentStreak) return milestone;
  }
  return currentStreak + 30; // After 365, add 30-day milestones
}

function getPreviousMilestone(currentStreak: number): number {
  let previous = 0;
  for (const milestone of MILESTONES) {
    if (milestone > currentStreak) return previous;
    previous = milestone;
  }
  return previous;
}

function getMilestoneProgress(currentStreak: number): number {
  const previous = getPreviousMilestone(currentStreak);
  const next = getNextMilestone(currentStreak);
  const range = next - previous;
  const progress = currentStreak - previous;
  return Math.min(100, (progress / range) * 100);
}
