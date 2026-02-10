'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SUGGESTED_EMOJIS } from '@/lib/constants';
import { EmojiButton } from './EmojiButton';
import { EmojiPicker } from './EmojiPicker';
import { Countdown } from './Countdown';
import { PostPulseScreen } from './PostPulseScreen';
import { StreakDisplay } from './StreakDisplay';
import { EventRewardsBadge, EventBonusTag } from './EventRewardsBadge';
import { useActiveWindow } from '@/hooks/useActiveWindow';
import { usePulse } from '@/hooks/usePulse';
import { useUser } from '@/providers/UserProvider';
import { sharePulse } from '@/lib/share';

// Spring configs based on Remotion best practices
const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

interface SecretAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shieldReward?: number;
}

interface MoodSelectorProps {
  onPulseSubmitted?: (emoji: string) => void;
  onAchievement?: (achievement: SecretAchievement) => void;
}

export function MoodSelector({ onPulseSubmitted, onAchievement }: MoodSelectorProps) {
  const router = useRouter();
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isChangingMood, setIsChangingMood] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNewMood, setPendingNewMood] = useState<string | null>(null);
  const { isActive, currentWindow, windowId, remainingTime, nextWindow, customWindow, isCustomWindow } = useActiveWindow();
  const { submitPulse, changeMood, isSubmitting, hasSubmittedThisWindow, hasMoodChanged, previousStreak, pulseContext, lastPulseResult } = usePulse();
  const { user } = useUser();

  const handleEmojiSelect = useCallback(async (emoji: string) => {
    if (!windowId) return;

    // If changing mood, show confirmation
    if (isChangingMood) {
      if (emoji === selectedEmoji) {
        // Same emoji, just go back
        setIsChangingMood(false);
        return;
      }
      setPendingNewMood(emoji);
      setShowConfirmDialog(true);
      return;
    }

    if (hasSubmittedThisWindow) return;

    setSelectedEmoji(emoji);

    const result = await submitPulse(emoji, windowId);

    if (result.success) {
      onPulseSubmitted?.(emoji);

      // Show secret achievement if earned
      if (result.newAchievements && result.newAchievements.length > 0 && onAchievement) {
        setTimeout(() => {
          onAchievement(result.newAchievements![0]);
        }, 1500);
      }
    }
  }, [windowId, hasSubmittedThisWindow, isChangingMood, selectedEmoji, submitPulse, onPulseSubmitted, onAchievement]);

  const handleConfirmChange = useCallback(async () => {
    if (!windowId || !pendingNewMood) return;

    setShowConfirmDialog(false);

    const result = await changeMood(pendingNewMood, windowId);

    if (result.success) {
      setSelectedEmoji(pendingNewMood);
      onPulseSubmitted?.(pendingNewMood);
    }

    setIsChangingMood(false);
    setPendingNewMood(null);
  }, [windowId, pendingNewMood, changeMood, onPulseSubmitted]);

  const handleCancelChange = useCallback(() => {
    setShowConfirmDialog(false);
    setIsChangingMood(false);
    setPendingNewMood(null);
  }, []);

  const handleStartChangeMood = useCallback(() => {
    setIsChangingMood(true);
  }, []);

  const openPicker = useCallback(() => setIsPickerOpen(true), []);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);

  // Window is not active
  if (!isActive || !currentWindow) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8"
      >
        {/* Show streak even when window is closed */}
        {user && user.streakDays > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSmooth}
            className="mb-8 w-full max-w-sm"
          >
            <StreakDisplay
              streakDays={user.streakDays}
              shields={user.streakShields}
              aura={user.aura}
              showProgress={true}
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: user?.streakDays ? 0.1 : 0 }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-3">
            No active window
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            The next pulse window is coming up
          </p>
        </motion.div>

        {nextWindow ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springSmooth, delay: 0.2 }}
          >
            <Countdown
              targetDate={nextWindow.startsAt}
              label={`${nextWindow.windowType.charAt(0).toUpperCase() + nextWindow.windowType.slice(1)} window opens in`}
            />
          </motion.div>
        ) : null}
      </motion.div>
    );
  }

  // Already submitted for this window (and not in change mode)
  if (hasSubmittedThisWindow && selectedEmoji && user && !isChangingMood) {
    return (
      <>
        <PostPulseScreen
          emoji={selectedEmoji}
          streakDays={user.streakDays}
          previousStreak={previousStreak}
          shields={user.streakShields}
          aura={user.aura}
          currentWindow={currentWindow || 'morning'}
          cityName={pulseContext?.cityName}
          cityMatchPercentage={pulseContext?.cityMatchPercentage}
          globalTopMood={pulseContext?.globalTopMood}
          globalTopPercentage={pulseContext?.globalTopPercentage}
          remainingTime={remainingTime}
          nextWindow={nextWindow}
          shieldUsed={lastPulseResult?.shieldUsed}
          streakLost={lastPulseResult?.streakLost}
          onViewResults={() => router.push('/results')}
          onShare={() => {
            sharePulse({
              emoji: selectedEmoji,
              streakDays: user.streakDays,
              aura: user.aura,
              cityMatchPercentage: pulseContext?.cityMatchPercentage,
              cityName: pulseContext?.cityName,
            });
          }}
          onChangeMood={handleStartChangeMood}
          canChangeMood={!hasMoodChanged}
        />
      </>
    );
  }

  // Active window - show emoji selector
  return (
    <div className="w-full max-w-lg px-4">
      {/* Streak Display */}
      {user && user.streakDays > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSmooth}
          className="mb-6"
        >
          <StreakDisplay
            streakDays={user.streakDays}
            shields={user.streakShields}
            aura={user.aura}
            showProgress={true}
          />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: user?.streakDays ? 0.1 : 0 }}
        className="text-center mb-8"
      >
        {/* Custom Window Event Header */}
        {isCustomWindow && customWindow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded-xl border-2"
            style={{
              borderColor: customWindow.color,
              backgroundColor: `${customWindow.color}15`,
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl"
              >
                {customWindow.icon}
              </motion.span>
              <span className="font-bold text-white">{customWindow.name}</span>
              <EventBonusTag xpMultiplier={customWindow.xp_multiplier} />
            </div>
            {customWindow.description && (
              <p className="text-zinc-400 text-xs mt-1">{customWindow.description}</p>
            )}
          </motion.div>
        )}

        <h2 className="font-display text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          {isChangingMood ? 'Change your mood' : 'How are you feeling?'}
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          {isCustomWindow ? (
            <>Special event active!</>
          ) : (
            <><span className="capitalize">{currentWindow}</span> pulse is open</>
          )}
        </p>
        {remainingTime ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`font-mono text-sm mt-2 ${
              isCustomWindow && remainingTime.minutes <= 15
                ? 'text-orange-400'
                : 'text-[var(--color-aurora-cyan)]'
            }`}
          >
            {remainingTime.minutes}m {remainingTime.seconds}s remaining
            {isCustomWindow && customWindow && customWindow.xp_multiplier > 1 && (
              <span className="text-yellow-400 ml-2">({customWindow.xp_multiplier}x XP!)</span>
            )}
          </motion.p>
        ) : null}
      </motion.div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {SUGGESTED_EMOJIS.map(({ emoji, label }, index) => (
          <EmojiButton
            key={emoji}
            emoji={emoji}
            label={label}
            isSelected={selectedEmoji === emoji}
            isDisabled={isSubmitting}
            onSelect={handleEmojiSelect}
            index={index}
          />
        ))}
      </div>

      {/* Custom Picker Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-3"
      >
        <motion.button
          onClick={openPicker}
          disabled={isSubmitting}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="glass-card-subtle px-6 py-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all disabled:opacity-50 btn-glow"
        >
          <span className="mr-2">✨</span>
          Pick another emoji
        </motion.button>
        {isChangingMood && (
          <button
            onClick={handleCancelChange}
            className="block mx-auto text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Cancel change
          </button>
        )}
      </motion.div>

      {/* Loading State */}
      <AnimatePresence>
        {isSubmitting ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center bg-[var(--color-void)]/80 backdrop-blur-sm z-50"
          >
            <div className="glass-card-glow p-8">
              <div className="w-12 h-12 border-3 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Emoji Picker Modal */}
      <EmojiPicker
        isOpen={isPickerOpen}
        onClose={closePicker}
        onSelect={handleEmojiSelect}
      />

      {/* Mood Change Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && pendingNewMood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-void)]/90 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card-glow p-6 text-center max-w-xs w-full"
            >
              <p className="text-[var(--color-text-secondary)] text-sm mb-3">Change your mood?</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-4xl">{selectedEmoji}</span>
                <span className="text-[var(--color-text-muted)]">&rarr;</span>
                <span className="text-4xl">{pendingNewMood}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">
                You can only change your mood once per window.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelChange}
                  className="flex-1 py-2.5 glass-card-subtle rounded-xl text-sm text-[var(--color-text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmChange}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)] border border-[var(--color-aurora-cyan)]/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Changing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
