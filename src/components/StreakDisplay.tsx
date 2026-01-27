'use client';

import { motion } from 'framer-motion';
import {
  AuraType,
  AURA_DEFINITIONS,
  getMilestoneProgress,
  getStreakLevelName,
} from '@/lib/auras';

interface StreakDisplayProps {
  streakDays: number;
  shields: number;
  aura: AuraType;
  compact?: boolean;
  showProgress?: boolean;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function StreakDisplay({
  streakDays,
  shields,
  aura,
  compact = false,
  showProgress = true,
}: StreakDisplayProps) {
  const { progress, daysRemaining, nextMilestone } = getMilestoneProgress(streakDays);
  const levelName = getStreakLevelName(streakDays);
  const auraDefinition = aura ? AURA_DEFINITIONS[aura] : null;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springSmooth}
        className="flex items-center gap-2"
      >
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card-subtle ${auraDefinition?.cssClass || ''}`}>
          {aura && <span className="text-lg">{auraDefinition?.icon}</span>}
          <span className="font-mono font-bold text-[var(--color-text-primary)]">
            {streakDays}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">days</span>
        </div>
        {shields > 0 && (
          <div className="flex items-center gap-0.5 text-sm text-[var(--color-text-muted)]">
            {Array.from({ length: shields }).map((_, i) => (
              <span key={i}>🛡️</span>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSmooth}
      className={`glass-card-subtle p-4 rounded-2xl ${auraDefinition?.cssClass || ''}`}
    >
      {/* Streak Number & Aura */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`relative ${auraDefinition ? 'aura-glow' : ''}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springSmooth, delay: 0.1 }}
              className="text-4xl font-mono font-bold text-[var(--color-text-primary)]"
            >
              {streakDays}
            </motion.div>
            {auraDefinition && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springSmooth, delay: 0.2 }}
                className="absolute -top-1 -right-3 text-xl"
              >
                {auraDefinition.icon}
              </motion.span>
            )}
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-secondary)]">day streak</div>
            <div className="text-xs text-[var(--color-aurora-cyan)] font-medium">
              {levelName}
            </div>
          </div>
        </div>

        {/* Shields */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-lg transition-opacity ${i < shields ? 'opacity-100' : 'opacity-20'}`}
              >
                🛡️
              </span>
            ))}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">shields</span>
        </div>
      </div>

      {/* Progress to next milestone */}
      {showProgress && nextMilestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[var(--color-text-muted)]">
              Next: {nextMilestone.icon} {nextMilestone.name}
            </span>
            <span className="text-[var(--color-text-secondary)]">
              {daysRemaining}d left
            </span>
          </div>
          <div className="h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ...springSmooth, delay: 0.4 }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-aurora-pink)] to-[var(--color-aurora-cyan)]"
            />
          </div>
          {nextMilestone.aura && (
            <div className="text-xs text-[var(--color-text-muted)] mt-1.5 text-center">
              Unlock {AURA_DEFINITIONS[nextMilestone.aura].icon} {AURA_DEFINITIONS[nextMilestone.aura].name} aura
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Mini version for header/nav
export function StreakBadge({ streakDays, aura }: { streakDays: number; aura: AuraType }) {
  const auraDefinition = aura ? AURA_DEFINITIONS[aura] : null;

  if (streakDays === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm glass-card-subtle ${auraDefinition?.cssClass || ''}`}
    >
      {aura ? (
        <span>{auraDefinition?.icon}</span>
      ) : (
        <span className="text-orange-400">🔥</span>
      )}
      <span className="font-mono font-semibold text-[var(--color-text-primary)]">
        {streakDays}
      </span>
    </motion.div>
  );
}
