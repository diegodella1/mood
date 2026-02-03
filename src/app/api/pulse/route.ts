import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidEmoji } from '@/lib/constants';
import { parseWindowId } from '@/lib/timezone';
import type { CustomWindow, RecurrenceRule } from '@/lib/supabase/types';

const pulseSchema = z.object({
  userId: z.string().uuid(),
  windowId: z.string(),
  mood: z.string().refine(isValidEmoji, { message: 'Invalid emoji' }),
  customWindowId: z.string().uuid().optional(), // Optional: ID of custom window if submitting during event
});

// Base XP for a pulse (used for custom window multiplier)
const BASE_PULSE_XP = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = pulseSchema.parse(body);

    // Parse window ID to get date
    const { date } = parseWindowId(data.windowId);

    // Check rate limit (10 requests per minute per user)
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: data.userId,
      p_endpoint: 'pulse',
      p_max_requests: 10,
      p_window_seconds: 60,
    });

    if (allowed === false) {
      return NextResponse.json(
        { error: 'Rate limited. Please try again later.' },
        { status: 429 }
      );
    }

    // Submit pulse atomically (handles streak, shields, aggregates in one transaction)
    const { data: result, error: pulseError } = await supabaseAdmin.rpc(
      'submit_pulse_atomic',
      {
        p_user_id: data.userId,
        p_window_id: data.windowId,
        p_mood: data.mood,
        p_pulse_date: date,
      }
    );

    if (pulseError) {
      // Check for unique constraint violation (already submitted)
      if (pulseError.code === '23505' || pulseError.message?.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Already submitted for this window' },
          { status: 409 }
        );
      }

      // Check for user not found
      if (pulseError.message?.includes('User not found')) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.error('Pulse submit error:', pulseError);
      return NextResponse.json(
        { error: 'Failed to submit pulse' },
        { status: 500 }
      );
    }

    // Result is an array with one row from the function
    const pulseResult = Array.isArray(result) ? result[0] : result;

    // Check and process custom window participation
    let customWindowBonus: {
      xpMultiplier: number;
      xpEarned: number;
      luckyDropBoost: number;
      windowName: string;
      windowIcon: string;
    } | null = null;

    if (data.customWindowId || data.windowId.startsWith('custom_')) {
      const customWindowData = await processCustomWindowParticipation(
        data.userId,
        data.customWindowId || data.windowId,
        pulseResult?.pulse_id,
        date
      );
      if (customWindowData) {
        customWindowBonus = customWindowData;
      }
    }

    // Get context data for post-pulse screen (non-blocking, can fail)
    const contextData = await getPulseContext(
      data.windowId,
      data.mood,
      pulseResult?.pulse_id,
      data.userId
    ).catch((err) => {
      console.error('Context fetch error:', err);
      return {};
    });

    // Trigger social and viral mechanics (all non-blocking)
    // Apply lucky drop boost from custom window if applicable
    const luckyDropBoostFactor = customWindowBonus?.luckyDropBoost || 1;
    const luckyDropPromise = supabaseAdmin.rpc('roll_lucky_drop', {
      p_user_id: data.userId,
      p_boost_factor: luckyDropBoostFactor,
    });
    const friendStreaksPromise = supabaseAdmin.rpc('update_friend_streaks', { p_user_id: data.userId });
    const achievementsPromise = supabaseAdmin.rpc('check_secret_achievements', {
      p_user_id: data.userId,
      p_context: {
        hour: new Date().getHours(),
        minute: new Date().getMinutes(),
        emoji: data.mood,
        streak_days: pulseResult?.new_streak || 0,
      },
    });

    // Fire and forget for activity logging
    supabaseAdmin.from('friend_activity').insert({
      user_id: data.userId,
      activity_type: 'pulse',
      emoji: data.mood,
      metadata: { window_id: data.windowId },
    });

    supabaseAdmin.rpc('update_active_session', {
      p_user_id: data.userId,
      p_window: data.windowId.split('_')[1] || 'unknown',
      p_is_pulsing: false,
    });

    // Notify followers (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/friend-pulse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.userId,
        emoji: data.mood,
      }),
    }).catch(() => {}); // Silent fail

    // Await the important ones with proper error handling
    const [luckyDropResult, friendStreaksResult, achievementsResult] = await Promise.all([
      Promise.resolve(luckyDropPromise).then(({ data: drop }) => drop).catch(() => null),
      Promise.resolve(friendStreaksPromise).then(({ data: count }) => count || 0).catch(() => 0),
      Promise.resolve(achievementsPromise).then(({ data: result }) => result?.earned || []).catch(() => []),
    ]);

    const luckyDrop = luckyDropResult;
    const friendStreaksUpdated = friendStreaksResult as number;
    const achievements = achievementsResult;

    return NextResponse.json({
      id: pulseResult?.pulse_id,
      mood: data.mood,
      window_id: data.windowId,
      user_id: data.userId,
      // Streak info from atomic function
      streak_days: pulseResult?.new_streak,
      shield_used: pulseResult?.shield_used,
      streak_lost: pulseResult?.streak_lost,
      aura: pulseResult?.aura,
      context: contextData,
      // Viral/social data
      luckyDrop: luckyDrop?.dropped ? luckyDrop : null,
      friendStreaksUpdated,
      newAchievements: achievements,
      // Custom window bonus info
      customWindowBonus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Pulse error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get context data for the post-pulse celebration screen
async function getPulseContext(
  windowId: string,
  userMood: string,
  pulseId: string | undefined,
  userId?: string
): Promise<{
  cityMatchPercentage?: number;
  cityName?: string;
  globalTopMood?: string;
  globalTopPercentage?: number;
  isMoodMatch?: boolean;
}> {
  const context: {
    cityMatchPercentage?: number;
    cityName?: string;
    globalTopMood?: string;
    globalTopPercentage?: number;
    isMoodMatch?: boolean;
  } = {};

  try {
    // Get pulse with user's city
    let cityId: string | null = null;

    if (pulseId) {
      const { data: pulse } = await supabaseAdmin
        .from('pulses')
        .select('city_id')
        .eq('id', pulseId)
        .single();
      cityId = pulse?.city_id || null;
    }

    // Fetch global and city aggregates in parallel
    const [globalResult, cityResult] = await Promise.all([
      supabaseAdmin
        .from('aggregates_global_window')
        .select('mood_counts, total_count')
        .eq('window_id', windowId)
        .single(),
      cityId
        ? supabaseAdmin
            .from('aggregates_city_window')
            .select('mood_counts, total_count')
            .eq('window_id', windowId)
            .eq('city_id', cityId)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    // Calculate global top mood
    if (globalResult.data && globalResult.data.total_count > 0) {
      const moodCounts = globalResult.data.mood_counts as Record<string, number>;
      const topMood = Object.entries(moodCounts).reduce(
        (max, [mood, count]) => (count > max.count ? { mood, count } : max),
        { mood: '', count: 0 }
      );

      if (topMood.mood) {
        context.globalTopMood = topMood.mood;
        context.globalTopPercentage = Math.round(
          (topMood.count / globalResult.data.total_count) * 100
        );

        // Track mood match for badges
        if (topMood.mood === userMood && userId) {
          context.isMoodMatch = true;
          // Increment mood match counter (non-blocking)
          supabaseAdmin.rpc('increment_mood_match', { p_user_id: userId }).then(
            ({ error }) => {
              if (error) console.error('Failed to increment mood match:', error);
            }
          );
        }
      }
    }

    // Calculate city match percentage
    if (cityResult.data && cityResult.data.total_count > 0) {
      const moodCounts = cityResult.data.mood_counts as Record<string, number>;
      const userMoodCount = moodCounts[userMood] || 0;

      context.cityMatchPercentage = Math.round(
        (userMoodCount / cityResult.data.total_count) * 100
      );
      context.cityName = cityId || undefined;
    }
  } catch (error) {
    console.error('Error fetching pulse context:', error);
  }

  return context;
}

// Process custom window participation and calculate XP bonus
async function processCustomWindowParticipation(
  userId: string,
  customWindowIdOrWindowId: string,
  pulseId: string | undefined,
  date: string
): Promise<{
  xpMultiplier: number;
  xpEarned: number;
  luckyDropBoost: number;
  windowName: string;
  windowIcon: string;
} | null> {
  try {
    // Extract custom window ID from the window ID if needed (format: custom_<uuid>_<date>)
    let customWindowId = customWindowIdOrWindowId;
    if (customWindowIdOrWindowId.startsWith('custom_')) {
      const parts = customWindowIdOrWindowId.split('_');
      if (parts.length >= 2) {
        customWindowId = parts[1];
      }
    }

    // Fetch the custom window
    const { data: customWindow, error: fetchError } = await supabaseAdmin
      .from('custom_windows')
      .select('*')
      .eq('id', customWindowId)
      .single();

    if (fetchError || !customWindow) {
      console.log('Custom window not found:', customWindowId);
      return null;
    }

    const window = customWindow as CustomWindow;

    // Verify the window is currently active
    if (window.status !== 'active') {
      console.log('Custom window is not active:', window.status);
      return null;
    }

    // Calculate the window instance ID
    const windowInstanceId = `${customWindowId}_${date}`;

    // Check if user already participated in this window instance
    const { data: existingParticipation } = await supabaseAdmin
      .from('custom_window_participations')
      .select('id')
      .eq('user_id', userId)
      .eq('window_instance_id', windowInstanceId)
      .single();

    if (existingParticipation) {
      console.log('User already participated in this window instance');
      return null;
    }

    // Calculate XP earned
    const xpMultiplier = window.xp_multiplier || 1;
    const xpEarned = Math.round(BASE_PULSE_XP * xpMultiplier);

    // Record participation
    const { error: insertError } = await supabaseAdmin
      .from('custom_window_participations')
      .insert({
        user_id: userId,
        custom_window_id: customWindowId,
        window_instance_id: windowInstanceId,
        pulse_id: pulseId || null,
        xp_earned: xpEarned,
        bonus_applied: true,
      });

    if (insertError) {
      console.error('Failed to record custom window participation:', insertError);
      // Continue anyway - the user should still get their bonus
    }

    // Update the pulse with custom_window_id if we have a pulse ID
    if (pulseId) {
      await supabaseAdmin
        .from('pulses')
        .update({ custom_window_id: customWindowId })
        .eq('id', pulseId);
    }

    return {
      xpMultiplier,
      xpEarned,
      luckyDropBoost: window.lucky_drop_boost || 1,
      windowName: window.name,
      windowIcon: window.icon,
    };
  } catch (error) {
    console.error('Error processing custom window participation:', error);
    return null;
  }
}
