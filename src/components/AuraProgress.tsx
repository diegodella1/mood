'use client';

import { motion } from 'framer-motion';
import { AuraType, AURA_DEFINITIONS, getNextMilestone, getMilestoneProgress } from '@/lib/auras';

interface AuraProgressProps {
  streakDays: number;
  aura: AuraType;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function AuraProgress({ streakDays, aura }: AuraProgressProps) {
  // Sanitize inputs to prevent UI bugs from bad data
  const safeStreakDays = Math.max(0, Math.floor(streakDays || 0));

  const { progress, daysRemaining, nextMilestone } = getMilestoneProgress(safeStreakDays);

  // Clamp progress to valid range
  const safeProgress = Math.min(100, Math.max(0, progress || 0));
  const safeDaysRemaining = Math.max(0, daysRemaining || 0);

  // Safely access aura definition (handles invalid aura types)
  const currentAura = aura && aura in AURA_DEFINITIONS ? AURA_DEFINITIONS[aura] : null;

  // If user has diamond (max aura), show special message
  if (aura === 'diamond') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="glass-card-glow p-4 aura-diamond"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl"
            >
              💎
            </motion.span>
            <div>
              <p className="font-display font-bold text-[var(--color-text-primary)]">
                Diamond Aura
              </p>
              <p className="text-xs text-[var(--color-aurora-violet)]">
                Permanent • Centurion status
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">
              {safeStreakDays}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">days</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // No next milestone (shouldn't happen but safety)
  if (!nextMilestone) {
    return null;
  }

  // Determine what aura is coming next
  const nextAura = nextMilestone.aura ? AURA_DEFINITIONS[nextMilestone.aura] : null;

  // Color based on next aura
  const getProgressColors = () => {
    if (nextMilestone.days === 7) {
      return {
        bg: 'from-orange-500/20 to-red-500/20',
        bar: 'from-orange-400 to-red-500',
        text: 'text-orange-400',
        glow: 'shadow-orange-500/20',
      };
    }
    if (nextMilestone.days === 30) {
      return {
        bg: 'from-yellow-500/20 to-orange-500/20',
        bar: 'from-yellow-400 to-orange-500',
        text: 'text-yellow-400',
        glow: 'shadow-yellow-500/20',
      };
    }
    if (nextMilestone.days === 100) {
      return {
        bg: 'from-blue-500/20 to-purple-500/20',
        bar: 'from-blue-400 to-purple-500',
        text: 'text-blue-400',
        glow: 'shadow-blue-500/20',
      };
    }
    return {
      bg: 'from-cyan-500/20 to-teal-500/20',
      bar: 'from-[var(--color-aurora-cyan)] to-[var(--color-aurora-teal)]',
      text: 'text-[var(--color-aurora-cyan)]',
      glow: '',
    };
  };

  const colors = getProgressColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSmooth}
      className={`glass-card p-4 bg-gradient-to-r ${colors.bg} ${currentAura?.cssClass || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {currentAura ? (
            <span className="text-2xl">{currentAura.icon}</span>
          ) : (
            <span className="text-2xl">🌱</span>
          )}
          <div>
            <p className="font-display font-semibold text-[var(--color-text-primary)]">
              {currentAura ? `${currentAura.name} Aura` : 'No Aura Yet'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {safeStreakDays} day{safeStreakDays !== 1 ? 's' : ''} streak
            </p>
          </div>
        </div>

        {/* Next milestone indicator */}
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${colors.text}`}>
              {safeDaysRemaining}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              day{safeDaysRemaining !== 1 ? 's' : ''} to
            </span>
            <span className="text-lg">{nextMilestone.icon}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-3 bg-[var(--surface-glass)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${colors.bar} ${colors.glow} shadow-lg`}
          />
        </div>

        {/* Milestone markers */}
        <div className="absolute top-0 left-0 right-0 h-3 flex items-center">
          {nextAura && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute right-0 -top-1 text-lg"
              style={{ transform: 'translateX(50%)' }}
            >
              {nextMilestone.icon}
            </motion.div>
          )}
        </div>
      </div>

      {/* Motivational message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-3 text-center"
      >
        {safeDaysRemaining <= 3 ? (
          <p className={`text-sm font-medium ${colors.text}`}>
            🔥 So close! {safeDaysRemaining === 1 ? 'Tomorrow you unlock' : `${safeDaysRemaining} more days to`}{' '}
            <span className="font-bold">{nextMilestone.name}</span>!
          </p>
        ) : safeDaysRemaining <= 7 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Keep going! <span className={colors.text}>{nextMilestone.name}</span> is within reach
          </p>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">
            Next: {nextMilestone.name} at {nextMilestone.days} days
            {nextAura && ` • Unlocks ${nextAura.name} Aura`}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
