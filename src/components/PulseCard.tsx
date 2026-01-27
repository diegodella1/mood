'use client';

import { motion } from 'framer-motion';
import { normalizeToEmoji, getEmojiLabel } from '@/lib/constants';

// Spring config
const springBouncy = { type: 'spring' as const, damping: 12, stiffness: 120 };

interface PulseCardProps {
  title: string;
  moodCounts: Record<string, number>;
  totalCount: number;
  dominantMood: string;
}

export function PulseCard({ title, totalCount, dominantMood }: PulseCardProps) {
  const emoji = normalizeToEmoji(dominantMood);
  const label = getEmojiLabel(dominantMood);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={springBouncy}
      className="glass-card-glow p-6 relative overflow-hidden"
    >
      {/* Aurora glow background */}
      <div className="absolute -top-20 -right-20 w-40 h-40 aurora-gradient opacity-10 blur-3xl rounded-full" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            {title}
          </h3>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-mono text-[var(--color-aurora-cyan)]"
          >
            {totalCount.toLocaleString()} pulses
          </motion.span>
        </div>

        <div className="flex items-center gap-5">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springBouncy, delay: 0.1 }}
            className="text-6xl filter drop-shadow-lg"
            role="img"
            aria-label={label}
          >
            {emoji}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="font-display text-2xl font-bold text-gradient-aurora">
              {label}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Dominant mood
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
