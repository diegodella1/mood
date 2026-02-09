import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateCronAuth } from '@/lib/api-utils';

// Cron job to cleanup old rate limit records and other maintenance tasks
// Runs hourly

export async function GET(request: NextRequest) {
  // Validate cron authentication (timing-safe)
  const auth = validateCronAuth(request);
  if (!auth.valid) return auth.error;

  try {
    const results: Record<string, unknown> = {};

    // 1. Cleanup rate limits older than 1 hour
    const { error: rateLimitError } = await supabaseAdmin.rpc('cleanup_rate_limits');
    results.rateLimits = rateLimitError ? { error: rateLimitError.message } : { success: true };

    // 2. Grant shields to users who earned them (every 7 days of streak)
    // This is now handled by trigger, but we keep a backup cron
    const { error: shieldsError } = await supabaseAdmin.rpc('grant_streak_shields');
    results.shields = shieldsError ? { error: shieldsError.message } : { success: true };

    // 3. Reset daily notification counter at midnight UTC + generate daily challenges
    const currentHour = new Date().getUTCHours();
    if (currentHour === 0) {
      const { error: resetError } = await supabaseAdmin
        .from('users')
        .update({ notifications_today: 0 })
        .gt('notifications_today', 0);
      results.notificationReset = resetError
        ? { error: resetError.message }
        : { success: true };

      // Generate daily challenges for today
      const { data: challengeCount, error: challengeError } = await supabaseAdmin
        .rpc('generate_daily_challenges');
      results.dailyChallenges = challengeError
        ? { error: challengeError.message }
        : { generated: challengeCount ?? 0 };
    }

    // 4. Cleanup old streak history (older than 30 days and not rescued)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: historyError, count } = await supabaseAdmin
      .from('streak_history')
      .delete({ count: 'exact' })
      .eq('rescued', false)
      .lt('lost_at', thirtyDaysAgo.toISOString());

    results.streakHistory = historyError
      ? { error: historyError.message }
      : { deleted: count || 0 };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: String(error) },
      { status: 500 }
    );
  }
}
