'use client';

import { motion } from 'framer-motion';
import { useActiveWindow } from '@/hooks/useActiveWindow';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

interface DailyProgressProps {
  windowsCompleted: number;
  currentWindow: string | null;
  hasSubmittedCurrentWindow: boolean;
}

const WINDOWS = [
  { id: 'morning', label: 'Morning', icon: '🌅', time: '8-11am' },
  { id: 'afternoon', label: 'Afternoon', icon: '☀️', time: '1-4pm' },
  { id: 'night', label: 'Night', icon: '🌙', time: '8-11pm' },
] as const;

export function DailyProgress({
  windowsCompleted,
  currentWindow,
  hasSubmittedCurrentWindow,
}: DailyProgressProps) {
  const { isActive, nextWindow, remainingTime, isCustomWindow, customWindow } = useActiveWindow();
  const totalWindows = 3;
  const actualCompleted = hasSubmittedCurrentWindow
    ? windowsCompleted
    : windowsCompleted;

  const progressPercent = (actualCompleted / totalWindows) * 100;

  // Format countdown for next window
  const formatCountdown = (date: Date) => {
    const diff = date.getTime() - new Date().getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const nextWindowCountdown = nextWindow ? formatCountdown(nextWindow.startsAt) : null;
  const shouldShowNextWindow = !isActive || (isActive && hasSubmittedCurrentWindow);

  // Messages based on progress (Goal-Gradient + Zeigarnik)
  const getMessage = () => {
    if (actualCompleted === 0) {
      return { text: 'Start your day with a pulse!', subtext: '3 windows today' };
    }
    if (actualCompleted === 1) {
      return {
        text: 'Good start! 2 more to go',
        subtext: 'Complete all 3 for a perfect day',
      };
    }
    if (actualCompleted === 2) {
      return {
        text: 'Almost there! Just 1 more',
        subtext: "You're so close to a perfect day!",
      };
    }
    return {
      text: 'Perfect day! All windows completed',
      subtext: 'Come back tomorrow to continue',
    };
  };

  const message = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSmooth}
      className="glass-card-subtle px-5 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display font-semibold text-[var(--color-text-primary)]">
            {message.text}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{message.subtext}</p>
        </div>
        <div className="text-right">
          <p className="font-display font-bold text-2xl text-gradient-aurora">
            {actualCompleted}/{totalWindows}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[var(--surface-glass)] rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            actualCompleted === totalWindows
              ? 'bg-gradient-to-r from-[#10b981] to-[#34d399]'
              : 'bg-gradient-to-r from-[var(--color-aurora-cyan)] to-[var(--color-aurora-purple)]'
          }`}
        />
      </div>

      {/* Window indicators */}
      <div className="flex justify-between">
        {WINDOWS.map((window, index) => {
          const isCompleted = index < actualCompleted;
          const isCurrent = window.id === currentWindow;
          const isUpcoming = index > WINDOWS.findIndex((w) => w.id === currentWindow);

          return (
            <motion.div
              key={window.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col items-center ${
                isCurrent ? 'scale-110' : ''
              }`}
            >
              <motion.div
                animate={
                  isCurrent && !hasSubmittedCurrentWindow
                    ? { scale: [1, 1.1, 1] }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 ${
                  isCompleted
                    ? 'bg-[#10b981]/20 border-2 border-[#10b981]'
                    : isCurrent
                    ? 'bg-[var(--color-aurora-cyan)]/20 border-2 border-[var(--color-aurora-cyan)] ring-2 ring-[var(--color-aurora-cyan)]/30'
                    : 'bg-[var(--surface-glass)] border-2 border-[var(--surface-border)] opacity-50'
                }`}
              >
                {isCompleted ? '✓' : window.icon}
              </motion.div>
              <p
                className={`text-xs font-medium ${
                  isCompleted
                    ? 'text-[#10b981]'
                    : isCurrent
                    ? 'text-[var(--color-aurora-cyan)]'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {window.label}
              </p>
              <p
                className={`text-[10px] ${
                  isUpcoming
                    ? 'text-[var(--color-text-muted)]'
                    : 'text-[var(--color-text-muted)]/60'
                }`}
              >
                {window.time}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Motivational nudge when close to completion */}
      {actualCompleted === 2 && currentWindow && !hasSubmittedCurrentWindow && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 rounded-lg bg-[var(--color-aurora-purple)]/10 border border-[var(--color-aurora-purple)]/20"
        >
          <p className="text-sm text-[var(--color-aurora-purple)] text-center">
            <strong>So close!</strong> Complete this window for a perfect day bonus
          </p>
        </motion.div>
      )}

      {/* Next window countdown */}
      {shouldShowNextWindow && nextWindow && nextWindowCountdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 rounded-lg bg-[var(--color-aurora-cyan)]/10 border border-[var(--color-aurora-cyan)]/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {nextWindow.windowType === 'morning' ? '🌅' : nextWindow.windowType === 'afternoon' ? '☀️' : '🌙'}
              </span>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Next: <span className="capitalize font-medium text-[var(--color-text-primary)]">{nextWindow.windowType}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">opens in</span>
              <span className="font-mono font-semibold text-[var(--color-aurora-cyan)]">
                {nextWindowCountdown}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Current window remaining time */}
      {isActive && !hasSubmittedCurrentWindow && remainingTime && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mt-4 p-3 rounded-lg ${
            isCustomWindow
              ? 'border-2'
              : 'bg-[var(--surface-glass-light)]'
          }`}
          style={isCustomWindow && customWindow ? {
            borderColor: customWindow.color,
            backgroundColor: `${customWindow.color}15`,
          } : {}}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {isCustomWindow && customWindow ? (
                <span className="flex items-center gap-2">
                  <span>{customWindow.icon}</span>
                  <span className="font-medium text-white">{customWindow.name}</span>
                </span>
              ) : (
                'Window closes in'
              )}
            </span>
            <div className="flex items-center gap-2">
              {isCustomWindow && customWindow && customWindow.xp_multiplier > 1 && (
                <span className="text-yellow-400 text-xs font-bold bg-yellow-500/20 px-2 py-0.5 rounded-full">
                  {customWindow.xp_multiplier}x XP
                </span>
              )}
              <span className={`font-mono font-semibold ${
                isCustomWindow && remainingTime.minutes <= 15
                  ? 'text-orange-400'
                  : 'text-[var(--color-aurora-amber)]'
              }`}>
                {remainingTime.minutes}m {remainingTime.seconds}s
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
