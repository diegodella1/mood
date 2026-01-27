import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 1 minute

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const type = request.nextUrl.searchParams.get('type') || 'cities'; // 'cities' | 'streaks' | 'user'

  try {
    if (type === 'user' && userId && isValidUUID(userId)) {
      // Get user's personal rank
      const { data: rankData, error: rankError } = await supabaseAdmin.rpc(
        'get_user_city_rank',
        { p_user_id: userId }
      );

      if (rankError) {
        console.error('User rank error:', rankError);
        return NextResponse.json({ error: 'Failed to get rank' }, { status: 500 });
      }

      // Get user's battles
      const { data: battles } = await supabaseAdmin.rpc(
        'get_user_battles',
        { p_user_id: userId }
      );

      return NextResponse.json({
        rank: rankData,
        battles: battles || [],
      });
    }

    if (type === 'cities') {
      // Get city leaderboard
      const { data: cities, error: citiesError } = await supabaseAdmin.rpc(
        'get_city_leaderboard',
        { p_limit: 20 }
      );

      if (citiesError) {
        console.error('City leaderboard error:', citiesError);
        return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
      }

      return NextResponse.json({ cities: cities || [] });
    }

    if (type === 'streaks') {
      // Get top streaks globally
      const { data: topStreaks, error: streaksError } = await supabaseAdmin
        .from('users')
        .select('id, display_name, streak_days, aura, city_id')
        .gt('streak_days', 0)
        .order('streak_days', { ascending: false })
        .limit(50);

      if (streaksError) {
        console.error('Streaks leaderboard error:', streaksError);
        return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
      }

      // Anonymize - only show display_name if set, otherwise "Anonymous"
      const anonymized = (topStreaks || []).map((u, index) => ({
        rank: index + 1,
        displayName: u.display_name || 'Anonymous',
        streakDays: u.streak_days,
        aura: u.aura,
        cityId: u.city_id,
        isAnonymous: !u.display_name,
      }));

      return NextResponse.json({ streaks: anonymized });
    }

    // Get global stats
    const { data: globalStats } = await supabaseAdmin.rpc('get_global_pulse_stats');

    return NextResponse.json({
      global: globalStats || {
        total_users: 0,
        total_pulses: 0,
        active_today: 0,
        top_streak: 0,
        diamond_users: 0,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
