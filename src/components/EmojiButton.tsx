'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { trackMoodSelected } from '@/lib/analytics';

interface EmojiButtonProps {
  emoji: string;
  label?: string;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (emoji: string) => void;
  index?: number;
}

// Spring configs based on Remotion best practices
const springBouncy = { type: 'spring' as const, damping: 12, stiffness: 150 };
const springSnappy = { type: 'spring' as const, damping: 20, stiffness: 300 };

export const EmojiButton = memo(function EmojiButton({
  emoji,
  label,
  isSelected,
  isDisabled,
  onSelect,
  index = 0,
}: EmojiButtonProps) {
  const handleClick = useCallback(() => {
    if (isDisabled) return;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    trackMoodSelected(emoji);
    onSelect(emoji);
  }, [emoji, isDisabled, onSelect]);

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        ...springBouncy,
        delay: index * 0.06,
      }}
      whileHover={isDisabled ? {} : { scale: 1.05, y: -4 }}
      whileTap={isDisabled ? {} : { scale: 0.95, transition: springSnappy }}
      className={`
        relative flex flex-col items-center justify-center
        p-5 rounded-2xl min-h-[110px]
        transition-all duration-300
        ${isSelected
          ? 'emoji-btn selected'
          : 'emoji-btn'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-label={label ? `Select mood: ${label}` : `Select emoji: ${emoji}`}
    >
      {/* Glow effect when selected */}
      {isSelected ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.2 }}
          className="absolute inset-0 rounded-2xl aurora-gradient opacity-20 blur-xl -z-10"
        />
      ) : null}

      <motion.span
        className="text-5xl mb-2 filter drop-shadow-lg"
        role="img"
        aria-hidden="true"
        animate={isSelected ? {
          scale: [1, 1.15, 1],
          rotate: [0, -5, 5, 0]
        } : { scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {emoji}
      </motion.span>

      {label ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.06 + 0.1 }}
          className={`
            text-sm font-medium font-display tracking-wide
            ${isSelected
              ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)]'
            }
          `}
        >
          {label}
        </motion.span>
      ) : null}
    </motion.button>
  );
});
