import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToAll } from '@/lib/onesignal/server';
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
    const shiftConfig = config.shift || {};

    if (!shiftConfig.enabled) {
      return Response.json({ skipped: true, reason: 'Shifts disabled' });
    }

    const minGlobalPulses = shiftConfig.min_global_pulses || 100;
    const minDeltaPoints = shiftConfig.min_delta_points || 10;
    const frequency = shiftConfig.frequency || 'per_window';

    // Get current window aggregates globally
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const { data: globalAggregates } = await supabaseAdmin
      .from('aggregates_global_window')
      .select('*')
      .like('window_id', `${dateStr}%`)
      .order('window_id', { ascending: true });

    if (!globalAggregates || globalAggregates.length < 2) {
      return Response.json({ skipped: true, reason: 'Not enough data' });
    }

    // Check for recent shifts to avoid duplicates
    const { data: recentShifts } = await supabaseAdmin
      .from('global_shifts')
      .select('window_id')
      .eq('notification_sent', true)
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const recentShiftWindows = new Set((recentShifts || []).map((s) => s.window_id));

    // Compare consecutive windows
    const shiftsDetected: Array<{
      window_id: string;
      previous_mood: string;
      new_mood: string;
      delta_points: number;
      total_pulses: number;
    }> = [];

    for (let i = 1; i < globalAggregates.length; i++) {
      const prev = globalAggregates[i - 1];
      const current = globalAggregates[i];

      if (current.total_count < minGlobalPulses) continue;
      if (recentShiftWindows.has(current.window_id)) continue;

      const prevTop = getTopMood(prev.mood_counts || {});
      const currentTop = getTopMood(current.mood_counts || {});

      if (prevTop && currentTop && prevTop !== currentTop) {
        const prevCount = prev.mood_counts[prevTop] || 0;
        const currentCount = current.mood_counts[currentTop] || 0;
        const delta = Math.abs(currentCount - prevCount);

        if (delta >= minDeltaPoints) {
          shiftsDetected.push({
            window_id: current.window_id,
            previous_mood: prevTop,
            new_mood: currentTop,
            delta_points: delta,
            total_pulses: current.total_count,
          });
        }
      }
    }

    // Process only the most recent shift if frequency is per_window
    const shiftsToProcess = frequency === 'per_day'
      ? shiftsDetected.slice(-1)
      : shiftsDetected;

    const results = [];

    for (const shift of shiftsToProcess) {
      // Record the shift
      const { data: shiftRecord } = await supabaseAdmin
        .from('global_shifts')
        .insert({
          window_id: shift.window_id,
          previous_top_mood: shift.previous_mood,
          new_top_mood: shift.new_mood,
          delta_points: shift.delta_points,
          total_pulses: shift.total_pulses,
          audience_target: 'global',
        })
        .select()
        .single();

      // Send notification
      // Normalize to emoji for display (handles legacy mood strings)
      const prevEmoji = normalizeToEmoji(shift.previous_mood);
      const newEmoji = normalizeToEmoji(shift.new_mood);
      const result = await sendNotificationToAll({
        title: `Global Mood Shift ${newEmoji}`,
        message: `The world just shifted from ${prevEmoji} to ${newEmoji}. Join the pulse!`,
        url: '/results',
      });

      // Mark as sent
      if (shiftRecord) {
        await supabaseAdmin
          .from('global_shifts')
          .update({ notification_sent: true })
          .eq('id', shiftRecord.id);
      }

      results.push({
        window_id: shift.window_id,
        shift: `${prevEmoji} -> ${newEmoji}`,
        notification_sent: result.success,
      });
    }

    return Response.json({
      processed: true,
      shifts_detected: shiftsDetected.length,
      results,
    });
  } catch (error) {
    console.error('Shifts cron error:', error);
    return Response.json({ error: 'Failed to process shifts' }, { status: 500 });
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
