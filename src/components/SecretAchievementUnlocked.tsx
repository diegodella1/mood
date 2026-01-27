'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SecretAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shieldReward?: number;
}

interface SecretAchievementUnlockedProps {
  achievement: SecretAchievement | null;
  onClose: () => void;
}

const springBouncy = { type: 'spring' as const, damping: 10, stiffness: 100 };

const RARITY_CONFIG = {
  common: {
    label: 'Common',
    bgClass: 'bg-gray-500/20',
    borderClass: 'border-gray-500/50',
    textClass: 'text-gray-300',
    glowClass: 'shadow-gray-500/30',
  },
  rare: {
    label: 'Rare',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    textClass: 'text-blue-300',
    glowClass: 'shadow-blue-500/30',
  },
  epic: {
    label: 'Epic',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/50',
    textClass: 'text-purple-300',
    glowClass: 'shadow-purple-500/30',
  },
  legendary: {
    label: 'Legendary',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-300',
    glowClass: 'shadow-amber-500/30',
  },
};

export function SecretAchievementUnlocked({
  achievement,
  onClose,
}: SecretAchievementUnlockedProps) {
  if (!achievement) return null;

  const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={springBouncy}
          onClick={(e) => e.stopPropagation()}
          className={`glass-card p-8 text-center max-w-sm w-full relative overflow-hidden border ${rarityConfig.borderClass}`}
        >
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`absolute -inset-20 ${rarityConfig.bgClass} opacity-30`}
              style={{
                background: `conic-gradient(from 0deg, transparent, ${
                  achievement.rarity === 'legendary'
                    ? 'rgba(251, 191, 36, 0.3)'
                    : achievement.rarity === 'epic'
                    ? 'rgba(168, 85, 247, 0.3)'
                    : achievement.rarity === 'rare'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(156, 163, 175, 0.3)'
                }, transparent)`,
              }}
            />
          </div>

          {/* Secret label */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs uppercase tracking-[0.3em] text-[var(--color-aurora-violet)] mb-4"
          >
            🔓 Secret Achievement
          </motion.div>

          {/* Icon with glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springBouncy, delay: 0.3 }}
            className="relative inline-block mb-6"
          >
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl ${rarityConfig.bgClass} border-2 ${rarityConfig.borderClass}`}
            >
              {achievement.icon}
            </div>
            {/* Glow effect */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.2, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className={`absolute inset-0 rounded-full ${rarityConfig.bgClass} blur-xl -z-10`}
            />
          </motion.div>

          {/* Achievement name */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-2"
          >
            {achievement.name}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-[var(--color-text-secondary)] mb-4"
          >
            {achievement.description}
          </motion.p>

          {/* Rarity badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`inline-block px-4 py-1.5 rounded-full text-xs uppercase tracking-wider ${rarityConfig.bgClass} ${rarityConfig.textClass} border ${rarityConfig.borderClass} font-bold`}
          >
            {rarityConfig.label}
          </motion.div>

          {/* Reward */}
          {achievement.shieldReward && achievement.shieldReward > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4 text-sm text-[var(--color-aurora-teal)]"
            >
              +{achievement.shieldReward} Shield{achievement.shieldReward > 1 ? 's' : ''}
            </motion.div>
          )}

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onClose}
            className={`mt-6 px-8 py-3 rounded-xl font-bold text-white ${rarityConfig.bgClass} border ${rarityConfig.borderClass} hover:opacity-80 transition-opacity`}
          >
            Amazing!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
