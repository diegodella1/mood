'use client';

import { createContext, useContext, ReactNode } from 'react';
import useSWR from 'swr';
import type { RecurrenceRule } from '@/lib/supabase/types';

export interface WindowConfig {
  [key: string]: { start: number; end: number };
}

export interface CustomWindowConfig {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  banner_url: string | null;
  start_hour: number;
  end_hour: number;
  event_type: 'one_time' | 'recurring';
  event_date: string | null;
  recurrence_rule: RecurrenceRule | null;
  recurrence_start: string | null;
  recurrence_end: string | null;
  xp_multiplier: number;
  bonus_badge_id: string | null;
  lucky_drop_boost: number;
  target_timezones: string[] | null;
  target_countries: string[] | null;
  min_streak_days: number;
  priority: number;
}

export interface AppConfig {
  features: {
    windows: boolean;
    flip: boolean;
    shift: boolean;
    battles: boolean;
    a2hs: boolean;
    nudges: boolean;
    customWindows: boolean;
  };
  windows: {
    schedule: WindowConfig;
    customSchedules: Array<{
      timezone_bucket: string;
      window_type: string;
      start_hour: number;
      end_hour: number;
      enabled: boolean;
    }>;
  };
  customWindows: CustomWindowConfig[];
  privacy: {
    minCityPulses: number;
  };
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_CONFIG: AppConfig = {
  features: {
    windows: true,
    flip: true,
    shift: true,
    battles: false,
    a2hs: true,
    nudges: true,
    customWindows: true,
  },
  windows: {
    schedule: {
      morning: { start: 8, end: 11 },
      afternoon: { start: 13, end: 16 },
      night: { start: 20, end: 23 },
    },
    customSchedules: [],
  },
  customWindows: [],
  privacy: {
    minCityPulses: 10,
  },
  isLoading: true,
  error: null,
};

const ConfigContext = createContext<AppConfig>(DEFAULT_CONFIG);

async function fetchConfig(): Promise<Omit<AppConfig, 'isLoading' | 'error'>> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  const data = await response.json();
  return {
    features: data.features || DEFAULT_CONFIG.features,
    windows: data.windows || DEFAULT_CONFIG.windows,
    customWindows: data.customWindows || DEFAULT_CONFIG.customWindows,
    privacy: data.privacy || DEFAULT_CONFIG.privacy,
  };
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading } = useSWR('/api/config', fetchConfig, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    fallbackData: {
      features: DEFAULT_CONFIG.features,
      windows: DEFAULT_CONFIG.windows,
      customWindows: DEFAULT_CONFIG.customWindows,
      privacy: DEFAULT_CONFIG.privacy,
    },
  });

  const config: AppConfig = {
    ...(data ?? DEFAULT_CONFIG),
    isLoading,
    error: error instanceof Error ? error.message : null,
  };

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

export function getWindowTypes(config: AppConfig): string[] {
  return Object.keys(config.windows.schedule);
}

export function getWindowInfo(config: AppConfig, windowType: string): { start: number; end: number } | null {
  return config.windows.schedule[windowType] || null;
}
