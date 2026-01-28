'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS } from '@/lib/constants';
import { getUserTimezone } from '@/lib/timezone';
import { AuraType } from '@/lib/auras';

interface User {
  id: string;
  timezone: string;
  countryCode: string | null;
  cityId: string | null;
  pushOptIn: boolean;
  streakDays: number;
  streakShields: number;
  maxStreakEver: number;
  aura: AuraType;
  displayName: string | null;
  referralCode: string | null;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrapUser = useCallback(async () => {
    try {
      // Check for existing user ID in localStorage
      let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
      const timezone = getUserTimezone();

      if (!userId) {
        // Generate new UUID for anonymous user
        userId = uuidv4();
        localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      }

      // Bootstrap user on server
      const response = await fetch('/api/users/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, timezone }),
      });

      if (!response.ok) {
        throw new Error('Failed to bootstrap user');
      }

      const data = await response.json();

      setUser({
        id: data.id,
        timezone: data.timezone,
        countryCode: data.country_code,
        cityId: data.city_id,
        pushOptIn: data.push_opt_in,
        streakDays: data.streak_days || 0,
        streakShields: data.streak_shields ?? 1,
        maxStreakEver: data.max_streak_ever || 0,
        aura: data.aura as AuraType,
        displayName: data.display_name || null,
        referralCode: data.referral_code || null,
      });
    } catch (err) {
      console.error('User bootstrap error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    await bootstrapUser();
  }, [bootstrapUser]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;

    try {
      // Build request body - only include fields that are being updated
      const body: Record<string, unknown> = {
        userId: user.id,
        timezone: updates.timezone ?? user.timezone,
      };

      // Only include these fields if they're explicitly being updated
      if ('countryCode' in updates) {
        body.countryCode = updates.countryCode;
      }
      if ('cityId' in updates) {
        body.cityId = updates.cityId;
      }
      if ('displayName' in updates) {
        body.displayName = updates.displayName;
      }

      const response = await fetch('/api/users/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const data = await response.json();

      setUser({
        id: data.id,
        timezone: data.timezone,
        countryCode: data.country_code,
        cityId: data.city_id,
        pushOptIn: data.push_opt_in,
        streakDays: data.streak_days || 0,
        streakShields: data.streak_shields ?? 1,
        maxStreakEver: data.max_streak_ever || 0,
        aura: data.aura as AuraType,
        displayName: data.display_name || null,
        referralCode: data.referral_code || null,
      });
    } catch (err) {
      console.error('User update error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user]);

  useEffect(() => {
    bootstrapUser();
  }, [bootstrapUser]);

  return (
    <UserContext.Provider value={{ user, isLoading, error, refreshUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
