'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sharePulse, shareReferral, ShareData, ShareType } from '@/lib/share';
import { useUser } from '@/providers/UserProvider';

interface ShareButtonProps {
  type?: ShareType;
  data?: Partial<ShareData>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showToast?: boolean;
  className?: string;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function ShareButton({
  type = 'pulse',
  data = {},
  variant = 'secondary',
  size = 'md',
  label,
  showToast = true,
  className = '',
}: ShareButtonProps) {
  const { user } = useUser();
  const [isSharing, setIsSharing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const shareData: ShareData = {
        emoji: data.emoji || '🌍',
        streakDays: data.streakDays ?? user?.streakDays ?? 0,
        aura: data.aura ?? user?.aura ?? null,
        cityMatchPercentage: data.cityMatchPercentage,
        cityName: data.cityName ?? user?.cityId ?? undefined,
        referralCode: data.referralCode ?? user?.referralCode ?? undefined,
        userId: data.userId ?? user?.id,
        globalActiveToday: data.globalActiveToday,
        userRank: data.userRank,
        badgeId: data.badgeId,
        badgeName: data.badgeName,
      };

      let result;
      if (type === 'referral' && shareData.referralCode) {
        result = await shareReferral(shareData.referralCode, shareData.userId);
      } else {
        result = await sharePulse(shareData, type);
      }

      if (showToast) {
        if (result.success) {
          setToast({
            show: true,
            message: result.method === 'clipboard' ? 'Copied to clipboard!' : 'Shared!',
            type: 'success',
          });
        } else {
          setToast({
            show: true,
            message: 'Could not share',
            type: 'error',
          });
        }

        setTimeout(() => setToast((t) => ({ ...t, show: false })), 2000);
      }
    } catch (error) {
      console.error('Share error:', error);
      if (showToast) {
        setToast({ show: true, message: 'Share failed', type: 'error' });
        setTimeout(() => setToast((t) => ({ ...t, show: false })), 2000);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary: 'aurora-gradient text-white font-semibold shadow-lg',
    secondary: 'glass-card-subtle hover:bg-[var(--surface-glass)] text-[var(--color-text-primary)]',
    ghost: 'hover:bg-[var(--surface-glass-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
    icon: 'p-2 hover:bg-[var(--surface-glass-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
  };

  // Default labels
  const defaultLabels: Record<ShareType, string> = {
    pulse: 'Share',
    badge: 'Share Badge',
    streak: 'Share Streak',
    profile: 'Share Profile',
    leaderboard: 'Share Rank',
    referral: 'Invite Friends',
  };

  const buttonLabel = label ?? defaultLabels[type];

  return (
    <div className="relative inline-block">
      <motion.button
        onClick={handleShare}
        disabled={isSharing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          inline-flex items-center justify-center gap-2 rounded-xl transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variant === 'icon' ? '' : sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {isSharing ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        )}
        {variant !== 'icon' && <span>{buttonLabel}</span>}
      </motion.button>

      {/* Toast notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={springSmooth}
            className={`
              absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
              ${toast.type === 'success' ? 'bg-[var(--color-aurora-teal)] text-white' : 'bg-red-500 text-white'}
            `}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick share button for specific contexts
export function QuickSharePulse({ emoji, cityMatch, cityName }: { emoji: string; cityMatch?: number; cityName?: string }) {
  return (
    <ShareButton
      type="pulse"
      data={{ emoji, cityMatchPercentage: cityMatch, cityName }}
      variant="secondary"
      size="md"
      label="Share my vibe"
    />
  );
}

export function InviteFriendsButton({ className = '' }: { className?: string }) {
  return (
    <ShareButton
      type="referral"
      variant="primary"
      size="lg"
      label="Invite Friends (+1 Shield)"
      className={className}
    />
  );
}
