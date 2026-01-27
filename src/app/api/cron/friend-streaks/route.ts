import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
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

    // Find streaks where only one user has pulsed today
    const { data: atRiskStreaks, error } = await supabaseAdmin
      .from('friend_streaks')
      .select(`
        id,
        user_a_id,
        user_b_id,
        streak_days,
        last_user_a_pulse,
        last_user_b_pulse
      `)
      .gt('streak_days', 2) // Only notify for meaningful streaks
      .or(`last_user_a_pulse.eq.${today},last_user_b_pulse.eq.${today}`)
      .not('last_user_a_pulse', 'eq', today)
      .not('last_user_b_pulse', 'eq', today);

    // Actually we need XOR logic - one pulsed, other didn't
    // Let's do this differently
    const { data: allAtRisk } = await supabaseAdmin
      .from('friend_streaks')
      .select('*')
      .gt('streak_days', 2);

    if (!allAtRisk || allAtRisk.length === 0) return 0;

    const toNotify: { userId: string; friendName: string; streakDays: number }[] = [];

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
        });
      }
    }

    // Send notifications
    let sentCount = 0;
    for (const notification of toNotify) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('onesignal_player_id, push_opt_in')
        .eq('id', notification.userId)
        .single();

      if (user?.push_opt_in && user?.onesignal_player_id) {
        const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
        const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (oneSignalAppId && oneSignalApiKey) {
          try {
            await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${oneSignalApiKey}`,
              },
              body: JSON.stringify({
                app_id: oneSignalAppId,
                include_player_ids: [user.onesignal_player_id],
                contents: {
                  en: `Your ${notification.streakDays}-day streak with ${notification.friendName} is at risk! Pulse now to save it 🔥`,
                  es: `Tu racha de ${notification.streakDays} días con ${notification.friendName} está en riesgo! Pulsea ahora 🔥`,
                },
                headings: {
                  en: 'Streak at Risk!',
                  es: '¡Racha en Riesgo!',
                },
                data: {
                  type: 'streak_at_risk',
                  streakDays: notification.streakDays,
                },
                ttl: 14400, // 4 hours
              }),
            });
            sentCount++;
          } catch {
            // Silent fail for individual notifications
          }
        }
      }
    }

    return sentCount;
  } catch (error) {
    console.error('At-risk notifications error:', error);
    return 0;
  }
}
