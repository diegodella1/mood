import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateCronAuth } from '@/lib/api-utils';

/**
 * Cron job to cleanup stale social data
 * - Stale active sessions (older than 1 hour)
 * - Old friend activity (older than 7 days)
 * - Expired lucky drops
 *
 * Schedule: 0 * * * * (hourly)
 */
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authResult = validateCronAuth(request);
  if (!authResult.valid) return authResult.error;

  try {
    const results = {
      staleSessions: 0,
      oldActivity: 0,
      expiredDrops: 0,
    };

    // Clean stale sessions
    const { data: sessionsDeleted } = await supabaseAdmin.rpc('cleanup_stale_sessions');
    results.staleSessions = sessionsDeleted || 0;

    // Clean old activity
    const { data: activityDeleted } = await supabaseAdmin.rpc('cleanup_old_activity');
    results.oldActivity = activityDeleted || 0;

    // Clean expired unclaimed drops
    const { error: dropsError } = await supabaseAdmin
      .from('lucky_drops')
      .delete()
      .eq('claimed', false)
      .lt('expires_at', new Date().toISOString());

    if (!dropsError) {
      // Can't get count from delete, estimate based on query
      const { count } = await supabaseAdmin
        .from('lucky_drops')
        .select('*', { count: 'exact', head: true })
        .eq('claimed', false)
        .lt('expires_at', new Date().toISOString());
      results.expiredDrops = count || 0;
    }

    return NextResponse.json({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron cleanup-social error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
