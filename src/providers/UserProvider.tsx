'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
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
  createdAt: string | null;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

function mapUser(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    timezone: data.timezone as string,
    countryCode: (data.country_code as string | null) ?? null,
    cityId: (data.city_id as string | null) ?? null,
    pushOptIn: Boolean(data.push_opt_in),
    streakDays: (data.streak_days as number) || 0,
    streakShields: (data.streak_shields as number) ?? 1,
    maxStreakEver: (data.max_streak_ever as number) || 0,
    aura: data.aura as AuraType,
    displayName: (data.display_name as string | null) || null,
    referralCode: (data.referral_code as string | null) || null,
    createdAt: (data.created_at as string | null) || null,
  };
}

async function fetchCurrentUser(): Promise<User> {
  const response = await fetch('/api/users/me');
  if (!response.ok) {
    throw new Error('Failed to load user');
  }
  return mapUser(await response.json());
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const legacyUserId = localStorage.getItem(STORAGE_KEYS.USER_ID) || undefined;
        const response = await fetch('/api/users/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timezone: getUserTimezone(),
            legacyUserId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to bootstrap user');
        }

        const data = await response.json();
        if (data.id) {
          localStorage.setItem(STORAGE_KEYS.USER_ID, data.id);
        }
      } catch (err) {
        if (!cancelled) {
          setBootstrapError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: user, error, isLoading, mutate } = useSWR(
    bootstrapped && !bootstrapError ? '/api/users/me' : null,
    fetchCurrentUser,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refreshUser = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const body: Record<string, unknown> = {
      timezone: updates.timezone ?? user?.timezone ?? getUserTimezone(),
    };

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
    await mutate(mapUser(data), { revalidate: false });
  }, [mutate, user?.timezone]);

  return (
    <UserContext.Provider
      value={{
        user: user ?? null,
        isLoading: !bootstrapped || isLoading,
        error: bootstrapError || (error instanceof Error ? error.message : null),
        refreshUser,
        updateUser,
      }}
    >
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
