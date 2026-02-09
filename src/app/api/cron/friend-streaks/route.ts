import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToUsers } from '@/lib/onesignal/server';
import { validateCronAuth } from '@/lib/api-utils';

/**
 * Cron job to reset broken friend streaks
 * Should run daily at midnight UTC
 *
 * Schedule: 0 0 * * * (daily at midnight)
 */
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authResult = validateCronAuth(request);
  if (!authResult.valid) return authResult.error;

  try {
    // Reset friend streaks where both users didn't pulse yesterday
    const { data: resetCount, error } = await supabaseAdmin.rpc('reset_broken_friend_streaks');

    if (error) {
      console.error('Friend streaks reset error:', error);
      return NextResponse.json(
        { error: 'Failed to reset streaks' },
        { status: 500 }
      );
    }

    // Also send notifications for at-risk streaks
    const atRiskNotifications = await notifyAtRiskStreaks();

    return NextResponse.json({
      success: true,
      streaksReset: resetCount || 0,
      atRiskNotificationsSent: atRiskNotifications,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron friend-streaks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send notifications for friend streaks that are at risk
 * (One user pulsed but the other hasn't yet today)
 */
async function notifyAtRiskStreaks(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: allAtRisk } = await supabaseAdmin
      .from('friend_streaks')
      .select('*')
      .gt('streak_days', 2);

    if (!allAtRisk || allAtRisk.length === 0) return 0;

    const toNotify: { userId: string; friendName: string; streakDays: number; streakId: string }[] = [];

    for (const streak of allAtRisk) {
      const aPulsedToday = streak.last_user_a_pulse === today;
      const bPulsedToday = streak.last_user_b_pulse === today;

      // XOR - exactly one pulsed
      if (aPulsedToday !== bPulsedToday) {
        // Notify the one who hasn't pulsed
        const userToNotify = aPulsedToday ? streak.user_b_id : streak.user_a_id;
        const userWhoPulsed = aPulsedToday ? streak.user_a_id : streak.user_b_id;

        // Get friend's name
        const { data: friend } = await supabaseAdmin
          .from('users')
          .select('display_name')
          .eq('id', userWhoPulsed)
          .single();

        toNotify.push({
          userId: userToNotify,
          friendName: friend?.display_name || 'Your friend',
          streakDays: streak.streak_days,
          streakId: streak.id,
        });
      }
    }

    // Send notifications using include_aliases (external_id)
    let sentCount = 0;
    for (const notification of toNotify) {
      // Check that user has push enabled
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('push_opt_in')
        .eq('id', notification.userId)
        .single();

      if (!user?.push_opt_in) continue;

      try {
        const result = await sendNotificationToUsers(
          {
            title: 'Streak at Risk!',
            message: `Your ${notification.streakDays}-day streak with ${notification.friendName} is at risk! Pulse now to save it 🔥`,
            url: '/',
            data: {
              type: 'streak_at_risk',
              streakDays: notification.streakDays,
            },
            ttl: 14400,
            web_push_topic: `friend-streak-${notification.streakId}`,
            idempotency_key: `streak-risk-${notification.streakId}-${new Date().toISOString().split('T')[0]}`,
          },
          [notification.userId]
        );

        if (result.success) sentCount++;
      } catch {
        // Silent fail for individual notifications
      }
    }

    return sentCount;
  } catch (error) {
    console.error('At-risk notifications error:', error);
    return 0;
  }
}
