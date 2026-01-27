'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BadgeDefinition, RARITY_COLORS } from '@/lib/badges';
import { ShareButton } from './ShareButton';
import { useUser } from '@/providers/UserProvider';

interface BadgeUnlockedProps {
  badge: BadgeDefinition | null;
  onClose: () => void;
}

export function BadgeUnlocked({ badge, onClose }: BadgeUnlockedProps) {
  const { user } = useUser();

  if (!badge) return null;

  const colors = RARITY_COLORS[badge.rarity];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 200,
          }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card p-8 text-center max-w-sm w-full"
        >
          {/* Confetti effect placeholder */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm uppercase tracking-widest text-[var(--color-aurora-cyan)] mb-4"
          >
            Badge Unlocked!
          </motion.div>

          {/* Badge icon with glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              damping: 10,
              stiffness: 100,
              delay: 0.3,
            }}
            className="relative inline-block mb-6"
          >
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl ${colors.bg} border-2 ${colors.border}`}
            >
              {badge.icon}
            </div>
            {/* Glow effect */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className={`absolute inset-0 rounded-full ${colors.bg} blur-xl -z-10`}
            />
          </motion.div>

          {/* Badge name */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-2"
          >
            {badge.name}
          </motion.h2>

          {/* Badge description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-[var(--color-text-secondary)] mb-4"
          >
            {badge.description}
          </motion.p>

          {/* Rarity indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`inline-block px-3 py-1 rounded-full text-xs uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}
          >
            {badge.rarity}
          </motion.div>

          {/* Secret badge bonus message */}
          {badge.secretUntilEarned && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4 text-sm text-[var(--color-aurora-purple)]"
            >
              You discovered a secret badge!
            </motion.p>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex flex-col gap-3"
          >
            {/* Share button */}
            <ShareButton
              type="badge"
              data={{
                badgeId: badge.id,
                badgeName: badge.name,
                streakDays: user?.streakDays ?? 0,
              }}
              variant="primary"
              size="md"
              label="Share Achievement"
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="px-6 py-2 glass-card-subtle text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded-xl"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
