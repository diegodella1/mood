'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';
import { useOneSignal } from '@/providers/OneSignalProvider';
import { useTourContext } from '@/providers/TourProvider';
import { StreakDisplay } from '@/components/StreakDisplay';
import { CitySelector } from '@/components/CitySelector';
import { InviteFriendsButton, ShareButton } from '@/components/ShareButton';
import {
  AURA_DEFINITIONS,
  STREAK_MILESTONES,
  getStreakLevelName,
  getMilestoneProgress,
} from '@/lib/auras';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };
const springBouncy = { type: 'spring' as const, damping: 12, stiffness: 120 };

export default function ProfilePage() {
  const { user, isLoading, updateUser } = useUser();
  const { isSubscribed, requestPermission } = useOneSignal();
  const { startTour, hasCompletedTour } = useTourContext();
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);
  const [isUpdatingCity, setIsUpdatingCity] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [isEmailSaving, setIsEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Reactions received state
  const [reactionsData, setReactionsData] = useState<{
    totalReactions: number;
    reactionsByType: Record<string, number>;
    uniqueReactors: number;
  } | null>(null);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [reactionsError, setReactionsError] = useState<string | null>(null);

  // Referral state
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    referralCount: number;
    wasReferred: boolean;
  } | null>(null);

  // Display name state
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  // Fetch existing email on mount
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/users/email?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            setSavedEmail(data.email);
          }
        })
        .catch(console.error);
    }
  }, [user?.id]);

  // Fetch reactions received
  useEffect(() => {
    if (user?.id) {
      setReactionsLoading(true);
      setReactionsError(null);
      fetch(`/api/users/${user.id}/reactions-received`, {
        headers: {
          'x-user-id': user.id, // Auth header for security
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load reactions');
          return res.json();
        })
        .then((data) => {
          if (!data.error) {
            setReactionsData(data);
          } else {
            setReactionsError(data.error);
          }
        })
        .catch((err) => {
          console.error(err);
          setReactionsError('Could not load reactions');
        })
        .finally(() => setReactionsLoading(false));
    }
  }, [user?.id]);

  // Fetch referral data
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/referral?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setReferralData(data);
          }
        })
        .catch(console.error);
    }
  }, [user?.id]);

  // Initialize display name from user
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  const handleSaveDisplayName = async () => {
    if (!user?.id || !displayName.trim()) return;

    setIsSavingName(true);
    try {
      await updateUser({ displayName: displayName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to save display name:', error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !email) return;

    setIsEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const response = await fetch('/api/users/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save email');
      }

      // Mask the email for display
      const [local, domain] = email.split('@');
      setSavedEmail(local.slice(0, 2) + '***@' + domain);
      setEmail('');
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to save email');
    } finally {
      setIsEmailSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const handleCitySelect = async (cityId: string, cityName: string) => {
    setIsUpdatingCity(true);
    try {
      await updateUser({ cityId: cityId || null });
    } catch (error) {
      console.error('Failed to update city:', error);
    } finally {
      setIsUpdatingCity(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-3 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 aurora-gradient opacity-30 blur-xl rounded-full" />
        </div>
      </main>
    );
  }

  const aura = user?.aura as 'fire' | 'lightning' | 'diamond' | null;
  const auraDefinition = aura ? AURA_DEFINITIONS[aura] : null;
  const levelName = getStreakLevelName(user?.streakDays || 0);
  const { progress, daysRemaining, nextMilestone } = getMilestoneProgress(user?.streakDays || 0);

  // Find earned milestones
  const earnedMilestones = STREAK_MILESTONES.filter(
    (m) => (user?.streakDays || 0) >= m.days
  );

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4"
      >
        <div className="max-w-lg mx-auto glass-card px-5 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="font-display text-xl font-bold text-gradient-aurora">
            Profile
          </h1>
          <div className="w-16" />
        </div>
      </motion.header>

      {/* Profile content */}
      <div className="flex-1 px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Aura & Streak Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0 }}
          className={`glass-card-glow p-6 text-center ${auraDefinition?.cssClass || ''}`}
        >
          {/* Aura badge */}
          {auraDefinition ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={springBouncy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-subtle mb-4"
            >
              <span className="text-2xl">{auraDefinition.icon}</span>
              <span className="font-display font-bold text-[var(--color-text-primary)]">
                {auraDefinition.name} Aura
              </span>
              {auraDefinition.isPermanent && (
                <span className="text-xs text-[var(--color-aurora-amber)]">PERMANENT</span>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={springBouncy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-subtle mb-4"
            >
              <span className="text-2xl">🌱</span>
              <span className="font-display text-[var(--color-text-secondary)]">
                No aura yet
              </span>
            </motion.div>
          )}

          {/* Streak Display */}
          <StreakDisplay
            streakDays={user?.streakDays || 0}
            shields={user?.streakShields || 0}
            aura={aura}
            showProgress={true}
          />

          {/* Level name */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-sm text-[var(--color-text-muted)]"
          >
            Level: <span className="text-[var(--color-aurora-cyan)]">{levelName}</span>
          </motion.p>
        </motion.section>

        {/* Milestones Progress */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-5">
            Milestones
          </h2>
          <div className="space-y-3">
            {STREAK_MILESTONES.map((milestone, index) => {
              const isEarned = (user?.streakDays || 0) >= milestone.days;
              const isCurrent = nextMilestone?.days === milestone.days;

              return (
                <div
                  key={milestone.days}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isEarned
                      ? 'glass-card-subtle'
                      : isCurrent
                      ? 'border border-[var(--color-aurora-cyan)]/30 bg-[var(--color-aurora-cyan)]/5'
                      : 'opacity-40'
                  }`}
                >
                  <span className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>
                    {milestone.icon}
                  </span>
                  <div className="flex-1">
                    <p className={`font-medium ${isEarned ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                      {milestone.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {milestone.days} days • {milestone.reward}
                    </p>
                  </div>
                  {isEarned && (
                    <span className="text-[var(--color-aurora-teal)]">✓</span>
                  )}
                  {isCurrent && (
                    <span className="text-xs text-[var(--color-aurora-cyan)]">
                      {daysRemaining}d left
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Stats card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.15 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-5">
            Your Stats
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={springBouncy}
                className="text-3xl font-bold font-mono text-[var(--color-aurora-cyan)]"
              >
                {user?.streakDays || 0}
              </motion.p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Current Streak</p>
            </div>
            <div className="text-center">
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.1 }}
                className="text-3xl font-bold font-mono text-[var(--color-aurora-violet)]"
              >
                {user?.maxStreakEver || 0}
              </motion.p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Best Streak</p>
            </div>
            <div className="text-center">
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.2 }}
                className="text-3xl font-bold font-mono text-[var(--color-aurora-amber)]"
              >
                {user?.streakShields || 0}
              </motion.p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Shields</p>
            </div>
          </div>
        </motion.section>

        {/* Invite Friends / Referral */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.16 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Invite Friends
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Both you and your friend get +1 Shield when they join!
          </p>

          {referralData && (
            <>
              {/* Referral code display */}
              <div className="flex items-center justify-between p-4 glass-card-subtle rounded-xl mb-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Your Code</p>
                  <p className="text-2xl font-mono font-bold text-[var(--color-aurora-cyan)]">
                    {referralData.referralCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--color-text-muted)]">Referrals</p>
                  <p className="text-xl font-bold text-[var(--color-aurora-violet)]">
                    {referralData.referralCount}
                  </p>
                </div>
              </div>

              {/* Invite button */}
              <InviteFriendsButton className="w-full" />

              {/* Referral stats */}
              {referralData.referralCount > 0 && (
                <p className="text-sm text-center text-[var(--color-aurora-teal)] mt-4">
                  You&apos;ve earned {referralData.referralCount} shield{referralData.referralCount !== 1 ? 's' : ''} from referrals!
                </p>
              )}
            </>
          )}

          {!referralData && (
            <div className="flex items-center justify-center py-6">
              <div className="w-8 h-8 border-2 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </motion.section>

        {/* Display Name */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.165 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Display Name
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Optional name shown on leaderboards (otherwise you&apos;re Anonymous)
          </p>

          {isEditingName ? (
            <div className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                placeholder="Enter a name..."
                maxLength={20}
                className="w-full px-4 py-3 bg-[var(--surface-glass)] border border-[var(--surface-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-aurora-cyan)]"
              />
              <div className="flex gap-2">
                <motion.button
                  onClick={handleSaveDisplayName}
                  disabled={isSavingName || !displayName.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 aurora-gradient rounded-xl font-medium text-white disabled:opacity-50"
                >
                  {isSavingName ? 'Saving...' : 'Save'}
                </motion.button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setDisplayName(user?.displayName || '');
                  }}
                  className="px-4 py-2.5 glass-card-subtle rounded-xl text-[var(--color-text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="w-full flex items-center justify-between p-4 glass-card-subtle rounded-xl hover:bg-[var(--surface-glass)] transition-all"
            >
              <span className="text-[var(--color-text-primary)]">
                {user?.displayName || 'Anonymous'}
              </span>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </motion.section>

        {/* Reactions Received */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.17 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Reactions Received
          </h2>

          {/* Loading state */}
          {reactionsLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-8 h-8 border-2 border-[var(--color-aurora-violet)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error state */}
          {reactionsError && !reactionsLoading && (
            <p className="text-sm text-red-400 text-center py-4">{reactionsError}</p>
          )}

          {/* Empty state */}
          {!reactionsLoading && !reactionsError && (!reactionsData || reactionsData.totalReactions === 0) && (
            <div className="text-center py-6">
              <span className="text-4xl mb-3 block opacity-50">💜</span>
              <p className="text-sm text-[var(--color-text-muted)]">
                No reactions yet. Keep sharing your vibes!
              </p>
            </div>
          )}

          {/* Data state */}
          {!reactionsLoading && !reactionsError && reactionsData && reactionsData.totalReactions > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springBouncy}
                    className="text-4xl"
                  >
                    💜
                  </motion.div>
                  <div>
                    <p className="text-3xl font-bold font-mono text-[var(--color-aurora-violet)]">
                      {reactionsData.totalReactions}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      from {reactionsData.uniqueReactors} {reactionsData.uniqueReactors === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                </div>
              </div>
              {/* Top reactions breakdown */}
              {Object.keys(reactionsData.reactionsByType).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--surface-border)]">
                  {Object.entries(reactionsData.reactionsByType)
                    .slice(0, 5)
                    .map(([emoji, count]) => (
                      <motion.div
                        key={emoji}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={springBouncy}
                        className="flex items-center gap-1 px-3 py-1.5 glass-card-subtle rounded-full"
                      >
                        <span className="text-lg">{emoji}</span>
                        <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                          {count}
                        </span>
                      </motion.div>
                    ))}
                </div>
              )}
            </>
          )}
        </motion.section>

        {/* Location info */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-5">
            Location
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Timezone</span>
              <span className="font-mono text-sm text-[var(--color-text-primary)]">
                {user?.timezone || 'Unknown'}
              </span>
            </div>
            {user?.countryCode && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Country</span>
                <span className="text-[var(--color-text-primary)]">{user.countryCode}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">City</span>
              <button
                onClick={() => setIsCitySelectorOpen(true)}
                disabled={isUpdatingCity}
                className="flex items-center gap-2 text-[var(--color-aurora-cyan)] hover:text-[var(--color-aurora-teal)] transition-colors disabled:opacity-50"
              >
                {isUpdatingCity ? (
                  <span className="animate-pulse">Updating...</span>
                ) : (
                  <>
                    <span>{user?.cityId || 'Select city'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.25 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-5">
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-primary)]">Push Notifications</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Get notified when pulse windows open
              </p>
            </div>
            {isSubscribed ? (
              <span className="px-4 py-1.5 bg-[var(--color-aurora-teal)]/20 text-[var(--color-aurora-teal)] rounded-full text-sm font-medium">
                Enabled
              </span>
            ) : (
              <motion.button
                onClick={handleEnableNotifications}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-5 py-2 aurora-gradient text-white rounded-xl text-sm font-medium shadow-lg shadow-[var(--glow-cyan)]"
              >
                Enable
              </motion.button>
            )}
          </div>
        </motion.section>

        {/* Aura Guide */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.3 }}
          className="glass-card-subtle p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Aura Guide
          </h2>
          <div className="space-y-3">
            {Object.values(AURA_DEFINITIONS).map((auraDef) => (
              <div
                key={auraDef.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  aura === auraDef.id ? auraDef.cssClass : 'opacity-60'
                }`}
              >
                <span className="text-2xl">{auraDef.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {auraDef.name}
                    {auraDef.isPermanent && (
                      <span className="ml-2 text-xs text-[var(--color-aurora-amber)]">FOREVER</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{auraDef.description}</p>
                </div>
                {aura === auraDef.id && (
                  <span className="text-[var(--color-aurora-cyan)]">✓</span>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Help & Tour */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.32 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Help
          </h2>
          <div className="space-y-3">
            <Link
              href="/guide"
              className="flex items-center justify-between p-4 glass-card-subtle rounded-xl hover:bg-[var(--surface-glass)] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <span className="text-[var(--color-text-primary)]">Game Guide</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/about"
              className="flex items-center justify-between p-4 glass-card-subtle rounded-xl hover:bg-[var(--surface-glass)] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">ℹ️</span>
                <span className="text-[var(--color-text-primary)]">About Global Pulse</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button
              onClick={() => {
                startTour();
                window.location.href = '/';
              }}
              className="w-full flex items-center justify-between p-4 glass-card-subtle rounded-xl hover:bg-[var(--surface-glass)] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🎯</span>
                <span className="text-[var(--color-text-primary)]">Restart Tour</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </motion.section>

        {/* Account Recovery */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.35 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Account Recovery
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Add your email to recover your streak if you change devices
          </p>

          {savedEmail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 glass-card-subtle rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Recovery email saved</p>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">{savedEmail}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSavedEmail(null)}
                className="text-sm text-[var(--color-aurora-cyan)] hover:underline"
              >
                Change email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveEmail} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 bg-[var(--surface-glass)] border border-[var(--surface-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-aurora-cyan)]"
              />

              {emailError && (
                <p className="text-sm text-red-400">{emailError}</p>
              )}

              {emailSuccess && (
                <p className="text-sm text-[var(--color-aurora-teal)]">Email saved successfully!</p>
              )}

              <motion.button
                type="submit"
                disabled={isEmailSaving || !email}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 aurora-gradient rounded-xl font-medium text-white disabled:opacity-50"
              >
                {isEmailSaving ? 'Saving...' : 'Save Recovery Email'}
              </motion.button>
            </form>
          )}

          <div className="mt-5 pt-5 border-t border-[var(--surface-border)]">
            <Link
              href="/recovery"
              className="flex items-center justify-between p-3 glass-card-subtle rounded-xl hover:bg-[var(--surface-glass)] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔑</span>
                <span className="text-sm text-[var(--color-text-primary)]">
                  Recover existing account
                </span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </motion.section>

        {/* Anonymous ID */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.4 }}
          className="glass-card-subtle p-6"
        >
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Anonymous ID
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] font-mono break-all bg-[var(--color-cosmic-dark)] p-3 rounded-lg border border-[var(--surface-border)]">
            {user?.id || 'Loading...'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            Your data is anonymous. No account required.
          </p>
        </motion.section>
      </div>

      {/* City Selector Modal */}
      <CitySelector
        isOpen={isCitySelectorOpen}
        onClose={() => setIsCitySelectorOpen(false)}
        onSelect={handleCitySelect}
        currentCityId={user?.cityId}
        countryCode={user?.countryCode}
      />
    </main>
  );
}
