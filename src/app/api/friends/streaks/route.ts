import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  try {
    // Get all friend streaks for this user
    const { data: streaks, error } = await supabaseAdmin
      .from('friend_streaks')
      .select(`
        id,
        user_a_id,
        user_b_id,
        streak_days,
        max_streak_ever,
        last_user_a_pulse,
        last_user_b_pulse,
        streak_started_at
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .gt('streak_days', 0)
      .order('streak_days', { ascending: false });

    if (error) {
      console.error('Streaks error:', error);
      return NextResponse.json({ error: 'Failed to get streaks' }, { status: 500 });
    }

    // Get friend user details
    const friendIds = streaks?.map((s) =>
      s.user_a_id === userId ? s.user_b_id : s.user_a_id
    ) || [];

    const { data: friends } = await supabaseAdmin
      .from('users')
      .select('id, display_name, aura')
      .in('id', friendIds);

    const friendMap = new Map(friends?.map((f) => [f.id, f]) || []);

    const today = new Date().toISOString().split('T')[0];

    return NextResponse.json({
      streaks: streaks?.map((s) => {
        const friendId = s.user_a_id === userId ? s.user_b_id : s.user_a_id;
        const friend = friendMap.get(friendId);
        const userPulsedToday = s.user_a_id === userId
          ? s.last_user_a_pulse === today
          : s.last_user_b_pulse === today;
        const friendPulsedToday = s.user_a_id === userId
          ? s.last_user_b_pulse === today
          : s.last_user_a_pulse === today;

        return {
          id: s.id,
          friendId,
          friendName: friend?.display_name || 'Anonymous',
          friendAura: friend?.aura,
          streakDays: s.streak_days,
          maxStreak: s.max_streak_ever,
          startedAt: s.streak_started_at,
          userPulsedToday,
          friendPulsedToday,
          // Streak at risk if neither has pulsed today
          atRisk: !userPulsedToday || !friendPulsedToday,
        };
      }) || [],
    });
  } catch (error) {
    console.error('Streaks error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
