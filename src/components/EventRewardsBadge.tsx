'use client';

import { motion } from 'framer-motion';

interface EventRewardsBadgeProps {
  xpMultiplier: number;
  luckyDropBoost?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function EventRewardsBadge({
  xpMultiplier,
  luckyDropBoost,
  size = 'md',
}: EventRewardsBadgeProps) {
  if (xpMultiplier <= 1 && (!luckyDropBoost || luckyDropBoost <= 1)) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1"
    >
      {xpMultiplier > 1 && (
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 ${sizeClasses[size]}`}
        >
          <span className="text-yellow-400">⚡</span>
          <span className="text-yellow-400 font-bold">{xpMultiplier}x</span>
        </motion.div>
      )}

      {luckyDropBoost && luckyDropBoost > 1 && (
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className={`flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 ${sizeClasses[size]}`}
        >
          <span>🎁</span>
          <span className="text-purple-400 font-bold">{luckyDropBoost}x</span>
        </motion.div>
      )}
    </motion.div>
  );
}

// Compact inline version for use in buttons/cards
export function EventBonusTag({ xpMultiplier }: { xpMultiplier: number }) {
  if (xpMultiplier <= 1) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold ml-1"
    >
      ⚡{xpMultiplier}x
    </motion.span>
  );
}
