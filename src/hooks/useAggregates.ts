'use client';

import { useState, useEffect, useCallback } from 'react';

// Dynamic mood counts - any emoji can be a key
type MoodCounts = Record<string, number>;

interface GlobalAggregate {
  windowId: string;
  moodCounts: MoodCounts;
  totalCount: number;
  topCities: Array<{ cityId: string; count: number }>;
  dominantMood: string;
}

interface CityAggregate {
  windowId: string;
  cityId: string;
  moodCounts: MoodCounts;
  totalCount: number;
  dominantMood: string;
}

interface AggregatesState {
  global: GlobalAggregate | null;
  city: CityAggregate | null;
  isLoading: boolean;
  error: string | null;
}

function getDominantMood(moodCounts: MoodCounts): string {
  let maxCount = 0;
  let dominant = '';

  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = mood;
    }
  }

  return dominant;
}

export function useAggregates(windowId: string | null, cityId?: string | null) {
  const [state, setState] = useState<AggregatesState>({
    global: null,
    city: null,
    isLoading: false,
    error: null,
  });

  const fetchAggregates = useCallback(async () => {
    if (!windowId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({ windowId });
      if (cityId) {
        params.append('cityId', cityId);
      }

      const response = await fetch(`/api/pulse/aggregate?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch aggregates');
      }

      const data = await response.json();

      const global: GlobalAggregate | null = data.global ? {
        windowId: data.global.window_id,
        moodCounts: data.global.mood_counts,
        totalCount: data.global.total_count,
        topCities: data.global.top_cities || [],
        dominantMood: getDominantMood(data.global.mood_counts),
      } : null;

      const city: CityAggregate | null = data.city ? {
        windowId: data.city.window_id,
        cityId: data.city.city_id,
        moodCounts: data.city.mood_counts,
        totalCount: data.city.total_count,
        dominantMood: getDominantMood(data.city.mood_counts),
      } : null;

      setState({
        global,
        city,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Aggregates fetch error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [windowId, cityId]);

  // Fetch on mount and when windowId changes
  useEffect(() => {
    fetchAggregates();
  }, [fetchAggregates]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!windowId) return;

    const interval = setInterval(fetchAggregates, 30000);

    return () => clearInterval(interval);
  }, [windowId, fetchAggregates]);

  return {
    ...state,
    refresh: fetchAggregates,
  };
}

export type { MoodCounts, GlobalAggregate, CityAggregate };
