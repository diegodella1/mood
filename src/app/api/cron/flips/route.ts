import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationByTags } from '@/lib/onesignal/server';
import { normalizeToEmoji } from '@/lib/constants';
import { validateCronAuth } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface MoodCounts {
  [key: string]: number;
}

export async function GET(request: NextRequest) {
  // Validate cron authentication
  const auth = validateCronAuth(request);
  if (!auth.valid) return auth.error;

  try {
    // Get config
    const { data: configRow } = await supabaseAdmin
      .from('app_config')
      .select('config')
      .eq('id', 'main')
      .single();

    const config = configRow?.config || {};
    const flipConfig = config.flip || {};

    if (!flipConfig.enabled) {
      return Response.json({ skipped: true, reason: 'Flips disabled' });
    }

    const minCityPulses = flipConfig.min_city_pulses || 20;
    const minDeltaPoints = flipConfig.min_delta_points || 5;

    // Get current window aggregates by city
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Get city aggregates for today's windows
    const { data: cityAggregates } = await supabaseAdmin
      .from('aggregates_city_window')
      .select('*')
      .like('window_id', `${dateStr}%`);

    // Get previous flips to avoid duplicates
    const { data: recentFlips } = await supabaseAdmin
      .from('city_flips')
      .select('city_id, window_id')
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const recentFlipKeys = new Set(
      (recentFlips || []).map((f) => `${f.city_id}:${f.window_id}`)
    );

    const flipsDetected: Array<{
      city_id: string;
      window_id: string;
      previous_mood: string;
      new_mood: string;
      delta_points: number;
    }> = [];

    // Group by city and detect flips
    const cityWindows: Record<string, Array<{ window_id: string; mood_counts: MoodCounts; total: number }>> = {};

    (cityAggregates || []).forEach((agg) => {
      const cityId = agg.city_id;
      if (!cityWindows[cityId]) {
        cityWindows[cityId] = [];
      }
      cityWindows[cityId].push({
        window_id: agg.window_id,
        mood_counts: agg.mood_counts || {},
        total: agg.total_count,
      });
    });

    // Check each city for flips
    for (const [cityId, windows] of Object.entries(cityWindows)) {
      if (windows.length < 2) continue;

      // Sort by window_id (chronological)
      windows.sort((a, b) => a.window_id.localeCompare(b.window_id));

      for (let i = 1; i < windows.length; i++) {
        const prev = windows[i - 1];
        const current = windows[i];

        if (current.total < minCityPulses) continue;

        // Skip if already processed
        const flipKey = `${cityId}:${current.window_id}`;
        if (recentFlipKeys.has(flipKey)) continue;

        // Find top moods
        const prevTop = getTopMood(prev.mood_counts);
        const currentTop = getTopMood(current.mood_counts);

        if (prevTop && currentTop && prevTop !== currentTop) {
          const prevCount = prev.mood_counts[prevTop] || 0;
          const currentCount = current.mood_counts[currentTop] || 0;
          const delta = Math.abs(currentCount - prevCount);

          if (delta >= minDeltaPoints) {
            flipsDetected.push({
              city_id: cityId,
              window_id: current.window_id,
              previous_mood: prevTop,
              new_mood: currentTop,
              delta_points: delta,
            });
          }
        }
      }
    }

    // Process detected flips
    const results = [];

    for (const flip of flipsDetected) {
      // Record the flip
      const { data: flipRecord } = await supabaseAdmin
        .from('city_flips')
        .insert({
          city_id: flip.city_id,
          window_id: flip.window_id,
          previous_mood: flip.previous_mood,
          new_mood: flip.new_mood,
          delta_points: flip.delta_points,
          total_pulses: cityWindows[flip.city_id]?.find((w) => w.window_id === flip.window_id)?.total || 0,
        })
        .select()
        .single();

      // Send notification to city users
      // Normalize to emoji for display (handles legacy mood strings)
      const moodEmoji = normalizeToEmoji(flip.new_mood);
      const result = await sendNotificationByTags(
        {
          title: `City Mood Flip! ${moodEmoji}`,
          message: `Your city just shifted to ${moodEmoji}. See how others are feeling.`,
          url: '/results',
        },
        {
          filters: [{ field: 'tag', key: 'city_id', value: flip.city_id }],
        }
      );

      // Mark as sent
      if (flipRecord) {
        await supabaseAdmin
          .from('city_flips')
          .update({ notification_sent: true })
          .eq('id', flipRecord.id);
      }

      results.push({
        city_id: flip.city_id,
        flip: `${normalizeToEmoji(flip.previous_mood)} -> ${moodEmoji}`,
        notification_sent: result.success,
      });
    }

    return Response.json({
      processed: true,
      flips_detected: flipsDetected.length,
      results,
    });
  } catch (error) {
    console.error('Flips cron error:', error);
    return Response.json({ error: 'Failed to process flips' }, { status: 500 });
  }
}

/**
 * Get the top mood from mood counts (iterates all keys dynamically)
 */
function getTopMood(moodCounts: MoodCounts): string | null {
  let topMood: string | null = null;
  let topCount = 0;

  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > topCount) {
      topCount = count;
      topMood = mood;
    }
  }

  return topMood;
}
