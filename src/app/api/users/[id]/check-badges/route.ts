import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { BADGE_DEFINITIONS, checkBadgeEligibility, type UserStats } from '@/lib/badges';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  try {
    // Validate userId is a UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get stats efficiently using database function (fixes N+1 query)
    const { data: statsResult, error: statsError } = await supabaseAdmin.rpc(
      'get_user_badge_stats',
      { p_user_id: userId }
    );

    if (statsError) {
      console.error('Stats fetch error:', statsError);
      return NextResponse.json({ newBadges: [], error: 'Failed to fetch stats' });
    }

    // Get already earned badges
    const { data: earnedBadges, error: badgesError } = await supabaseAdmin
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (badgesError) {
      console.error('Badges fetch error:', badgesError);
      return NextResponse.json({ newBadges: [], error: 'Failed to fetch badges' });
    }

    const earnedBadgeIds = (earnedBadges || []).map((b) => b.badge_id);

    // Stats from database function (single row result)
    const dbStats = Array.isArray(statsResult) ? statsResult[0] : statsResult;

    if (!dbStats) {
      return NextResponse.json({ newBadges: [], error: 'User not found' });
    }

    // Get custom window participation count
    const { count: customWindowCount } = await supabaseAdmin
      .from('custom_window_participations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const stats: UserStats = {
      currentStreak: dbStats.current_streak || 0,
      totalPulses: Number(dbStats.total_pulses) || 0,
      perfectDays: Number(dbStats.perfect_days) || 0,
      reactionsReceived: Number(dbStats.reactions_received) || 0,
      reactionsGiven: Number(dbStats.reactions_given) || 0,
      uniqueMoods: Number(dbStats.unique_moods) || 0,
      morningPulses: Number(dbStats.morning_pulses) || 0,
      nightPulses: Number(dbStats.night_pulses) || 0,
      // Now using tracked fields from users table
      moodMatches: Number(dbStats.mood_matches) || 0,
      battlesParticipated: Number(dbStats.battles_participated) || 0,
      battlesWon: Number(dbStats.battles_won) || 0,
      customWindowParticipations: customWindowCount || 0,
    };

    // Check for new badges
    const newBadges = checkBadgeEligibility(stats, earnedBadgeIds);

    // Award new badges
    if (newBadges.length > 0) {
      const badgeInserts = newBadges.map((badge) => ({
        user_id: userId,
        badge_id: badge.id,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('user_badges')
        .insert(badgeInserts)
        .select();

      if (insertError) {
        // Ignore duplicate errors (badge already awarded)
        if (!insertError.message?.includes('duplicate')) {
          console.error('Badge insert error:', insertError);
        }
      }
    }

    return NextResponse.json({
      newBadges: newBadges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        rarity: b.rarity,
        secretUntilEarned: b.secretUntilEarned,
      })),
      stats,
    });
  } catch (error) {
    console.error('Badge check error:', error);
    return NextResponse.json({ newBadges: [], error: 'Check failed' });
  }
}
