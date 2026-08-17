'use client';

import useSWR from 'swr';

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

async function fetchAggregates(url: string): Promise<{
  global: GlobalAggregate | null;
  city: CityAggregate | null;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch aggregates');
  }
  const data = await response.json();

  return {
    global: data.global
      ? {
          windowId: data.global.window_id,
          moodCounts: data.global.mood_counts,
          totalCount: data.global.total_count,
          topCities: data.global.top_cities || [],
          dominantMood: getDominantMood(data.global.mood_counts),
        }
      : null,
    city: data.city
      ? {
          windowId: data.city.window_id,
          cityId: data.city.city_id,
          moodCounts: data.city.mood_counts,
          totalCount: data.city.total_count,
          dominantMood: getDominantMood(data.city.mood_counts),
        }
      : null,
  };
}

export function useAggregates(windowId: string | null, cityId?: string | null) {
  const params = new URLSearchParams();
  if (windowId) params.set('windowId', windowId);
  if (cityId) params.set('cityId', cityId);
  const key = windowId ? `/api/pulse/aggregate?${params}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchAggregates, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  return {
    global: data?.global ?? null,
    city: data?.city ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: () => mutate(),
  };
}

export type { MoodCounts, GlobalAggregate, CityAggregate };
