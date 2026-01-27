'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';

interface LuckyDrop {
  id: string;
  type: string;
  value: {
    amount?: number;
    emoji?: string;
    name?: string;
    multiplier?: number;
    duration_hours?: number;
  };
  createdAt: string;
  expiresAt: string | null;
}

const springBouncy = { type: 'spring' as const, damping: 10, stiffness: 100 };

export function LuckyDropNotification() {
  const { user, refreshUser } = useUser();
  const [drops, setDrops] = useState<LuckyDrop[]>([]);
  const [currentDrop, setCurrentDrop] = useState<LuckyDrop | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch unclaimed drops
  useEffect(() => {
    if (!user?.id) return;

    const fetchDrops = async () => {
      try {
        const res = await fetch(`/api/drops?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setDrops(data.drops || []);

          // Show first unclaimed drop
          if (data.drops?.length > 0 && !currentDrop) {
            setCurrentDrop(data.drops[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch drops:', error);
      }
    };

    fetchDrops();
  }, [user?.id, currentDrop]);

  const handleClaim = async () => {
    if (!user?.id || !currentDrop || isClaiming) return;

    setIsClaiming(true);

    try {
      const res = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          dropId: currentDrop.id,
        }),
      });

      if (res.ok) {
        setShowCelebration(true);

        // Refresh user data to show updated shields
        await refreshUser();

        // Hide after animation
        setTimeout(() => {
          setShowCelebration(false);
          setCurrentDrop(null);
          setDrops((prev) => prev.filter((d) => d.id !== currentDrop.id));
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to claim drop:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDismiss = () => {
    setCurrentDrop(null);
    // Move to next drop if any
    const remaining = drops.filter((d) => d.id !== currentDrop?.id);
    if (remaining.length > 0) {
      setTimeout(() => setCurrentDrop(remaining[0]), 500);
    }
  };

  if (!currentDrop) return null;

  const dropConfig = getDropConfig(currentDrop.type, currentDrop.value);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={springBouncy}
          className="glass-card-glow p-8 text-center max-w-sm w-full relative overflow-hidden"
        >
          {/* Sparkle background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: Math.random() * 300 - 150,
                  y: Math.random() * 300 - 150,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2,
                }}
                className="absolute top-1/2 left-1/2 w-1 h-1 bg-[var(--color-aurora-amber)] rounded-full"
              />
            ))}
          </div>

          {/* Content */}
          {!showCelebration ? (
            <>
              {/* Lucky label */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm uppercase tracking-widest text-[var(--color-aurora-amber)] mb-4"
              >
                Lucky Drop!
              </motion.div>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.3 }}
                className="text-7xl mb-4"
              >
                {dropConfig.icon}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-2"
              >
                {dropConfig.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[var(--color-text-secondary)] mb-6"
              >
                {dropConfig.description}
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col gap-3"
              >
                <motion.button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 aurora-gradient rounded-xl font-bold text-white disabled:opacity-50"
                >
                  {isClaiming ? 'Claiming...' : 'Claim Reward'}
                </motion.button>

                <button
                  onClick={handleDismiss}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  Maybe later
                </button>
              </motion.div>
            </>
          ) : (
            /* Celebration state */
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={springBouncy}
              className="py-8"
            >
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="font-display text-2xl font-bold text-[var(--color-aurora-teal)]">
                Claimed!
              </h2>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getDropConfig(type: string, value: LuckyDrop['value']) {
  switch (type) {
    case 'shield':
      return {
        icon: '🛡️',
        title: 'Shield Drop',
        description: `You found ${value.amount || 1} streak shield${(value.amount || 1) > 1 ? 's' : ''}! Protect your streak when you miss a day.`,
      };
    case 'special_emoji':
      return {
        icon: value.emoji || '✨',
        title: value.name || 'Special Emoji',
        description: `You unlocked the ${value.emoji} emoji! Use it to express yourself.`,
      };
    case 'xp_boost':
      return {
        icon: '⚡',
        title: 'XP Boost',
        description: `${value.multiplier || 2}x XP for the next ${value.duration_hours || 24} hours!`,
      };
    default:
      return {
        icon: '🎁',
        title: 'Mystery Reward',
        description: 'Something special awaits...',
      };
  }
}
