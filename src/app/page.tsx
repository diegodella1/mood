'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodSelector } from '@/components/MoodSelector';
import { PushOptIn } from '@/components/PushOptIn';
import { StreakIndicator } from '@/components/StreakIndicator';
import { DailyProgress } from '@/components/DailyProgress';
import { LiveActivity } from '@/components/LiveActivity';
import { BadgeUnlocked } from '@/components/BadgeUnlocked';
import { Onboarding } from '@/components/Onboarding';
import { StreakBadge } from '@/components/StreakDisplay';
import { AuraProgress } from '@/components/AuraProgress';
import { InviteFriendsButton } from '@/components/ShareButton';
import { LivePulseCounter } from '@/components/LivePulseCounter';
import { FriendsFeed } from '@/components/FriendsFeed';
import { FriendStreaks } from '@/components/FriendStreaks';
import { LuckyDropNotification } from '@/components/LuckyDropNotification';
import { SecretAchievementUnlocked } from '@/components/SecretAchievementUnlocked';
import { UserSearch } from '@/components/UserSearch';
import { CustomWindowBanner } from '@/components/CustomWindowBanner';
import { useUser } from '@/providers/UserProvider';
import { useOneSignal } from '@/providers/OneSignalProvider';
import { useActiveWindow } from '@/hooks/useActiveWindow';
import { usePulse } from '@/hooks/usePulse';
import { useReferral } from '@/hooks/useReferral';
import { getUserVisibility } from '@/lib/progressive-disclosure';
import type { BadgeDefinition } from '@/lib/badges';

const ONBOARDING_STORAGE_KEY = 'global_pulse_onboarding_complete';

// Spring configs
const springSmooth = { type: 'spring' as const, damping: 30, stiffness: 200 };

export default function HomePage() {
  const { user, isLoading } = useUser();
  const { isSubscribed } = useOneSignal();
  const { isActive, currentWindow, windowId, isCustomWindow, customWindow, remainingTime } = useActiveWindow();
  const { hasSubmittedThisWindow } = usePulse();
  useReferral(); // Process referral codes from URL
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<BadgeDefinition | null>(null);
  const [windowsCompletedToday, setWindowsCompletedToday] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const visibility = getUserVisibility(user?.createdAt ?? null);
  const [secretAchievement, setSecretAchievement] = useState<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    shieldReward?: number;
  } | null>(null);

  // Check if onboarding should be shown
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = async (city?: string) => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);

    // Save city if selected
    if (city && user?.id) {
      try {
        await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city }),
        });
      } catch (error) {
        console.error('Failed to save city:', error);
      }
    }
  };

  // Fetch today's completed windows count
  useEffect(() => {
    if (!user?.id) return;

    const fetchTodayProgress = async () => {
      try {
        const response = await fetch(`/api/users/${user.id}/today-progress`);
        if (response.ok) {
          const data = await response.json();
          setWindowsCompletedToday(data.windowsCompleted || 0);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      }
    };

    fetchTodayProgress();
  }, [user?.id, hasSubmittedThisWindow]);

  const handlePulseSubmitted = async (emoji: string) => {
    // Update windows completed
    setWindowsCompletedToday((prev) => Math.min(prev + 1, 3));

    // Check for new badges (would normally come from API response)
    try {
      const response = await fetch(`/api/users/${user?.id}/check-badges`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.newBadges?.length > 0) {
          // Show first new badge (could queue multiple)
          setUnlockedBadge(data.newBadges[0]);
        }
      }
    } catch (error) {
      console.error('Badge check failed:', error);
    }

    if (!isSubscribed) {
      setTimeout(() => setShowPushPrompt(true), 2000);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full glass-card animate-pulse-glow" />
            <div className="absolute inset-0 rounded-full aurora-gradient opacity-20 blur-xl" />
          </div>
          <div className="h-3 w-28 rounded-full bg-[var(--color-cosmic-mid)]" />
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Floating Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4"
      >
        <div className="max-w-lg mx-auto glass-card px-5 py-3 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-gradient-aurora">
            Global Pulse
          </h1>
          <nav className="flex items-center gap-1">
            <Link
              href="/results"
              data-tour="results"
              className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--surface-glass-light)]"
            >
              Results
            </Link>
            <Link
              href="/history"
              className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--surface-glass-light)]"
            >
              History
            </Link>
            {visibility.showLeaderboard && (
              <Link
                href="/leaderboard"
                className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--surface-glass-light)]"
              >
                Ranks
              </Link>
            )}
            <Link
              href="/profile"
              className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--surface-glass-light)]"
            >
              Profile
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Live Counter */}
      <LivePulseCounter />

      {/* Custom Window Banner */}
      {isCustomWindow && customWindow && remainingTime && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-4"
        >
          <div className="max-w-lg mx-auto">
            <CustomWindowBanner
              customWindow={customWindow}
              remainingMinutes={remainingTime.minutes}
            />
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div data-tour="mood-selector">
          <MoodSelector onPulseSubmitted={handlePulseSubmitted} onAchievement={setSecretAchievement} />
        </div>
      </div>

      {/* Engagement Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: 0.3 }}
        className="px-4 pb-6 space-y-4"
      >
        <div className="max-w-lg mx-auto space-y-4">
          {/* Aura Progress — visible after day 7 */}
          {visibility.showAuraProgress && user && (
            <AuraProgress
              streakDays={user.streakDays || 0}
              aura={user.aura}
            />
          )}

          {/* Streak Indicator with Loss Aversion */}
          <div data-tour="streak">
            <StreakIndicator hasSubmittedToday={hasSubmittedThisWindow || windowsCompletedToday > 0} />
          </div>

          {/* Daily Progress — visible after day 7 */}
          {visibility.showDailyProgress && (
            <div data-tour="daily-progress">
              <DailyProgress
                windowsCompleted={windowsCompletedToday}
                currentWindow={currentWindow}
                hasSubmittedCurrentWindow={hasSubmittedThisWindow}
              />
            </div>
          )}

          {/* Live Activity for Social Proof */}
          {isActive && windowId && (
            <LiveActivity windowId={windowId} />
          )}

          {/* Friend features — visible after day 3 */}
          {visibility.showFriendFeatures && (
            <>
              {/* Friend Streaks (Snapchat-style) */}
              {user && <FriendStreaks />}

              {/* Friends Feed */}
              {user && <FriendsFeed />}

              {/* Find Friends + Invite CTA */}
              {user && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUserSearch(true)}
                    data-tour="find-friends"
                    className="flex-1 glass-card-subtle p-4 flex items-center justify-center gap-2 hover:bg-[var(--surface-glass)] transition-all rounded-xl"
                  >
                    <svg className="w-5 h-5 text-[var(--color-aurora-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">Find Friends</span>
                  </button>
                  <div className="flex-1" data-tour="invite">
                    <InviteFriendsButton className="w-full h-full" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="py-6 text-center space-y-3">
        <p className="text-sm text-[var(--color-text-muted)] font-display">
          Share how you feel. See how the world feels.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/guide"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-aurora-cyan)] transition-colors"
          >
            Game Guide
          </Link>
          <span className="text-[var(--color-text-muted)]">•</span>
          <Link
            href="/about"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-aurora-cyan)] transition-colors"
          >
            About
          </Link>
        </div>
      </footer>

      {/* Push Prompt Modal */}
      {showPushPrompt && (
        <PushOptIn onClose={() => setShowPushPrompt(false)} />
      )}

      {/* Badge Unlocked Modal */}
      {unlockedBadge && (
        <BadgeUnlocked
          badge={unlockedBadge}
          onClose={() => setUnlockedBadge(null)}
        />
      )}

      {/* Onboarding Flow */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* User Search Modal */}
      <UserSearch isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} />

      {/* Lucky Drop Notification */}
      <LuckyDropNotification />

      {/* Secret Achievement Unlocked */}
      {secretAchievement && (
        <SecretAchievementUnlocked
          achievement={secretAchievement}
          onClose={() => setSecretAchievement(null)}
        />
      )}
    </main>
  );
}
