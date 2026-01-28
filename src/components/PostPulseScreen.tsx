'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StreakDisplay } from './StreakDisplay';
import { ShareButton, QuickSharePulse } from './ShareButton';
import { AuraType, AURA_DEFINITIONS, getNextMilestone } from '@/lib/auras';
import { getEmojiLabel } from '@/lib/constants';

interface PostPulseScreenProps {
  emoji: string;
  streakDays: number;
  previousStreak: number;
  shields: number;
  aura: AuraType;
  currentWindow: string;
  cityName?: string;
  cityMatchPercentage?: number;
  globalTopMood?: string;
  globalTopPercentage?: number;
  remainingTime?: { minutes: number; seconds: number } | null;
  nextWindow?: { windowType: string; startsAt: Date } | null;
  onViewResults?: () => void;
  onShare?: () => void;
  // New props from atomic function
  shieldUsed?: boolean;
  streakLost?: number;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };
const springBouncy = { type: 'spring' as const, damping: 10, stiffness: 100 };

export function PostPulseScreen({
  emoji,
  streakDays,
  previousStreak,
  shields,
  aura,
  currentWindow,
  cityName,
  cityMatchPercentage,
  globalTopMood,
  globalTopPercentage,
  remainingTime,
  nextWindow,
  onViewResults,
  onShare,
  shieldUsed,
  streakLost,
}: PostPulseScreenProps) {
  const [showMilestone, setShowMilestone] = useState(false);
  const [showShieldNotification, setShowShieldNotification] = useState(shieldUsed || false);
  const [showMoodMatch, setShowMoodMatch] = useState(false);
  const streakIncreased = streakDays > previousStreak;

  // Check if user's mood matches global top mood
  // Normalize emojis by removing variation selectors for comparison
  const normalizeEmoji = (e: string | undefined | null): string => {
    if (!e) return '';
    // Remove variation selectors (U+FE0E, U+FE0F) and ZWJ sequences for basic comparison
    return e.replace(/[\uFE0E\uFE0F]/g, '').normalize('NFC');
  };
  const isMoodMatch = Boolean(
    globalTopMood &&
    emoji &&
    normalizeEmoji(emoji) === normalizeEmoji(globalTopMood)
  );
  const nextMilestone = getNextMilestone(streakDays);
  const auraDefinition = aura ? AURA_DEFINITIONS[aura] : null;

  // Check if user just reached a milestone
  const justReachedMilestone =
    streakIncreased &&
    [3, 7, 14, 30, 50, 100].includes(streakDays);

  useEffect(() => {
    if (justReachedMilestone) {
      const timer = setTimeout(() => setShowMilestone(true), 800);
      return () => clearTimeout(timer);
    }
  }, [justReachedMilestone]);

  // Show mood match celebration
  useEffect(() => {
    if (isMoodMatch) {
      const timer = setTimeout(() => setShowMoodMatch(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isMoodMatch]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[500px] px-4 py-6"
    >
      {/* Main Card */}
      <div className={`glass-card-glow p-8 text-center max-w-sm w-full ${auraDefinition?.cssClass || ''}`}>
        {/* Emoji Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={springBouncy}
          className="text-7xl mb-4 inline-block"
        >
          {emoji}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.2 }}
          className="font-display text-2xl font-bold text-gradient-aurora mb-2"
        >
          Pulse shared!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.3 }}
          className="text-[var(--color-text-secondary)] mb-6"
        >
          You&apos;re feeling {getEmojiLabel(emoji)} this {currentWindow}
        </motion.p>

        {/* Streak Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.4 }}
          className="mb-6"
        >
          <StreakDisplay
            streakDays={streakDays}
            shields={shields}
            aura={aura}
            showProgress={true}
          />

          {/* Streak increase celebration */}
          {streakIncreased && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...springBouncy, delay: 0.6 }}
              className="mt-3 text-sm text-[var(--color-aurora-amber)] font-medium"
            >
              +1 day streak!
            </motion.div>
          )}

          {/* Shield used notification */}
          {shieldUsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...springBouncy, delay: 0.7 }}
              className="mt-3 p-3 glass-card-subtle rounded-xl"
            >
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-xl">🛡️</span>
                <span className="text-[var(--color-aurora-teal)] font-medium">
                  Shield activated! Your streak is protected.
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {shields} shield{shields !== 1 ? 's' : ''} remaining
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Social Proof Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 pt-4 border-t border-[var(--surface-border)]"
        >
          {/* City match */}
          {cityMatchPercentage !== undefined && cityName && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-[var(--color-text-muted)]">
                You matched with
              </span>
              <span className="font-bold text-[var(--color-aurora-cyan)]">
                {cityMatchPercentage}%
              </span>
              <span className="text-[var(--color-text-muted)]">
                of {cityName}
              </span>
            </div>
          )}

          {/* Global top mood - with match celebration */}
          {globalTopMood && globalTopPercentage !== undefined && (
            isMoodMatch ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springBouncy}
                className="p-3 rounded-xl bg-gradient-to-r from-[var(--color-aurora-cyan)]/20 to-[var(--color-aurora-violet)]/20 border border-[var(--color-aurora-cyan)]/30"
              >
                <div className="flex items-center justify-center gap-2 text-sm">
                  <motion.span
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                    className="text-xl"
                  >
                    ✨
                  </motion.span>
                  <span className="font-bold text-[var(--color-aurora-cyan)]">
                    Mood Match!
                  </span>
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                    className="text-xl"
                  >
                    ✨
                  </motion.span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  You&apos;re in sync with <span className="font-bold text-[var(--color-aurora-violet)]">{globalTopPercentage}%</span> of the world!
                </p>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-[var(--color-text-muted)]">Global vibe:</span>
                <span className="text-lg">{globalTopMood}</span>
                <span className="text-[var(--color-aurora-violet)]">
                  {globalTopPercentage}%
                </span>
              </div>
            )
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.6 }}
          className="flex flex-col gap-3 mt-6"
        >
          <button
            onClick={onViewResults}
            className="w-full py-3 px-4 glass-card-subtle hover:bg-[var(--surface-glass)] transition-all rounded-xl font-medium text-[var(--color-text-primary)] btn-glow"
          >
            View Global Results
          </button>
          <QuickSharePulse
            emoji={emoji}
            cityMatch={cityMatchPercentage}
            cityName={cityName}
          />
        </motion.div>

        {/* Time remaining & next window */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 pt-4 border-t border-[var(--surface-border)] space-y-4"
        >
          {remainingTime && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">
                Window closes in
              </p>
              <div className="font-mono text-2xl font-semibold text-[var(--color-aurora-cyan)] glow-text-cyan">
                {String(remainingTime.minutes).padStart(2, '0')}:
                {String(remainingTime.seconds).padStart(2, '0')}
              </div>
            </div>
          )}

          {nextWindow && (
            <div className="p-3 rounded-lg bg-[var(--surface-glass-light)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {nextWindow.windowType === 'morning' ? '🌅' : nextWindow.windowType === 'afternoon' ? '☀️' : '🌙'}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Next: <span className="capitalize font-medium text-[var(--color-text-primary)]">{nextWindow.windowType}</span>
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {nextWindow.startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Next milestone teaser */}
      {nextMilestone && !justReachedMilestone && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-[var(--color-text-muted)] mt-6 text-center"
        >
          {nextMilestone.days - streakDays} days until{' '}
          <span className="text-[var(--color-aurora-cyan)]">
            {nextMilestone.icon} {nextMilestone.name}
          </span>
        </motion.p>
      )}

      {/* Milestone Celebration Modal */}
      <AnimatePresence>
        {showMilestone && (
          <MilestoneCelebration
            streakDays={streakDays}
            onClose={() => setShowMilestone(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Milestone celebration modal
function MilestoneCelebration({
  streakDays,
  onClose,
}: {
  streakDays: number;
  onClose: () => void;
}) {
  const milestoneData: Record<number, { title: string; icon: string; message: string }> = {
    3: { title: 'First Steps', icon: '🌱', message: 'You\'re building a habit!' },
    7: { title: 'Week Warrior', icon: '🔥', message: 'Fire aura unlocked!' },
    14: { title: 'Fortnight Force', icon: '💪', message: 'Two weeks strong!' },
    30: { title: 'Monthly Master', icon: '⚡', message: 'Lightning aura unlocked!' },
    50: { title: 'Halfway There', icon: '🎯', message: 'Halfway to Centurion!' },
    100: { title: 'CENTURION', icon: '💎', message: 'Diamond aura unlocked forever!' },
  };

  const data = milestoneData[streakDays];
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-void)]/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={springBouncy}
        className="glass-card-glow p-8 text-center max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springBouncy, delay: 0.2 }}
          className="text-8xl mb-4 milestone-celebration"
        >
          {data.icon}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-2xl font-bold text-gradient-warm mb-2"
        >
          {data.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-mono font-bold text-[var(--color-text-primary)] mb-2"
        >
          {streakDays} days
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[var(--color-text-secondary)] mb-6"
        >
          {data.message}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <ShareButton
            type="streak"
            data={{ streakDays }}
            variant="primary"
            size="lg"
            label="Share Milestone"
            className="w-full"
          />
          <button
            onClick={onClose}
            className="w-full py-3 glass-card-subtle rounded-xl font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
