'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/providers/UserProvider';
import { trackPulseSubmitted } from '@/lib/analytics';

interface PulseContext {
  cityMatchPercentage?: number;
  cityName?: string;
  globalTopMood?: string;
  globalTopPercentage?: number;
}

interface SecretAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shieldReward?: number;
}

interface LuckyDrop {
  dropped: boolean;
  drop_id?: string;
  type?: string;
  value?: Record<string, unknown>;
}

interface PulseResult {
  success: boolean;
  pulse?: {
    id: string;
    mood: string;
    windowId: string;
  };
  context?: PulseContext;
  error?: string;
  alreadySubmitted?: boolean;
  previousStreak?: number;
  // New fields from atomic function
  shieldUsed?: boolean;
  streakLost?: number;
  newStreak?: number;
  aura?: string | null;
  // Viral/social data
  luckyDrop?: LuckyDrop | null;
  newAchievements?: SecretAchievement[];
  friendStreaksUpdated?: number;
}

export function usePulse() {
  const { user, refreshUser } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPulse, setLastPulse] = useState<PulseResult['pulse'] | null>(null);
  const [hasSubmittedThisWindow, setHasSubmittedThisWindow] = useState(false);
  const [hasMoodChanged, setHasMoodChanged] = useState(false);
  const [previousStreak, setPreviousStreak] = useState<number>(0);
  const [pulseContext, setPulseContext] = useState<PulseContext | null>(null);
  const [lastPulseResult, setLastPulseResult] = useState<PulseResult | null>(null);

  const submitPulse = useCallback(async (mood: string, windowId: string, note?: string): Promise<PulseResult> => {
    if (!user?.id) {
      return { success: false, error: 'User not initialized' };
    }

    if (hasSubmittedThisWindow) {
      return { success: false, alreadySubmitted: true, error: 'Already submitted for this window' };
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          windowId,
          mood,
          ...(note ? { note } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setHasSubmittedThisWindow(true);
          return { success: false, alreadySubmitted: true, error: data.error };
        }
        if (response.status === 429) {
          return { success: false, error: 'Too many requests. Please wait a moment.' };
        }
        return { success: false, error: data.error };
      }

      const pulse = {
        id: data.id,
        mood: data.mood,
        windowId: data.window_id,
      };

      // Capture context data from response
      const context: PulseContext = data.context || {};
      setPulseContext(context);

      setLastPulse(pulse);
      setHasSubmittedThisWindow(true);

      // Track analytics
      trackPulseSubmitted(mood, windowId.split('|')[1]);

      // Capture previous streak from user state (before the atomic update)
      const streakBeforeSubmit = user.streakDays;
      setPreviousStreak(streakBeforeSubmit);

      // Build result with new atomic function data
      const result: PulseResult = {
        success: true,
        pulse,
        context,
        previousStreak: streakBeforeSubmit,
        // New fields from atomic function
        shieldUsed: data.shield_used || false,
        streakLost: data.streak_lost || 0,
        newStreak: data.streak_days,
        aura: data.aura,
        // Viral/social data
        luckyDrop: data.luckyDrop || null,
        newAchievements: data.newAchievements || [],
        friendStreaksUpdated: data.friendStreaksUpdated || 0,
      };

      setLastPulseResult(result);

      // Refresh user to sync local state with database
      await refreshUser();

      return result;
    } catch (err) {
      console.error('Pulse submission error:', err);
      return { success: false, error: 'Failed to submit pulse' };
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, user?.streakDays, hasSubmittedThisWindow, refreshUser]);

  const changeMood = useCallback(async (newMood: string, windowId: string): Promise<{
    success: boolean;
    error?: string;
    oldMood?: string;
    newMood?: string;
  }> => {
    if (!user?.id) {
      return { success: false, error: 'User not initialized' };
    }

    if (hasMoodChanged) {
      return { success: false, error: 'Already changed mood this window' };
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pulse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          windowId,
          newMood,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setHasMoodChanged(true);
        }
        return { success: false, error: data.error };
      }

      // Update local state
      setHasMoodChanged(true);
      setLastPulse((prev) => prev ? { ...prev, mood: newMood } : prev);

      // Track analytics
      trackPulseSubmitted(newMood, windowId.split('|')[1]);

      return {
        success: true,
        oldMood: data.oldMood,
        newMood: data.newMood,
      };
    } catch (err) {
      console.error('Mood change error:', err);
      return { success: false, error: 'Failed to change mood' };
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, hasMoodChanged]);

  const resetWindowState = useCallback(() => {
    setHasSubmittedThisWindow(false);
    setHasMoodChanged(false);
    setLastPulse(null);
    setLastPulseResult(null);
  }, []);

  return {
    submitPulse,
    changeMood,
    isSubmitting,
    lastPulse,
    hasSubmittedThisWindow,
    hasMoodChanged,
    resetWindowState,
    previousStreak,
    pulseContext,
    lastPulseResult,
  };
}
