'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface WindowConfig {
  [key: string]: { start: number; end: number };
}

export interface AppConfig {
  features: {
    windows: boolean;
    flip: boolean;
    shift: boolean;
    battles: boolean;
    a2hs: boolean;
    nudges: boolean;
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
  privacy: {
    minCityPulses: number;
  };
  isLoading: boolean;
  error: string | null;
}

// Default config (used while loading or on error)
const DEFAULT_CONFIG: AppConfig = {
  features: {
    windows: true,
    flip: true,
    shift: true,
    battles: false,
    a2hs: true,
    nudges: true,
  },
  windows: {
    schedule: {
      morning: { start: 8, end: 11 },
      afternoon: { start: 13, end: 16 },
      night: { start: 20, end: 23 },
    },
    customSchedules: [],
  },
  privacy: {
    minCityPulses: 10,
  },
  isLoading: true,
  error: null,
};

const ConfigContext = createContext<AppConfig>(DEFAULT_CONFIG);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await response.json();

        setConfig({
          features: data.features || DEFAULT_CONFIG.features,
          windows: data.windows || DEFAULT_CONFIG.windows,
          privacy: data.privacy || DEFAULT_CONFIG.privacy,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Config fetch error:', error);
        setConfig({
          ...DEFAULT_CONFIG,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load config',
        });
      }
    };

    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

// Helper to get window types from config
export function getWindowTypes(config: AppConfig): string[] {
  return Object.keys(config.windows.schedule);
}

// Helper to get window info
export function getWindowInfo(config: AppConfig, windowType: string): { start: number; end: number } | null {
  return config.windows.schedule[windowType] || null;
}
