import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/share/card?type=<weekly|daily|streak|badge>
 *
 * Returns JSON data for generating a shareable mood card.
 * The frontend renders this as a visual card for Instagram/Twitter sharing.
 */
export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const { searchParams } = new URL(request.url);
  const cardType = searchParams.get('type') || 'weekly';

  try {
    // Get user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, display_name, streak_days, aura, city_id, referral_code, xp, xp_level')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get city name
    let cityName: string | null = null;
    if (user.city_id) {
      const { data: city } = await supabaseAdmin
        .from('cities')
        .select('name')
        .eq('id', user.city_id)
        .single();
      cityName = city?.name ?? null;
    }

    let cardData: Record<string, unknown> = {
      type: cardType,
      displayName: user.display_name,
      streakDays: user.streak_days,
      aura: user.aura,
      cityName,
      referralCode: user.referral_code,
      level: user.xp_level ?? 1,
    };

    switch (cardType) {
      case 'weekly': {
        // Get user's pulses from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: pulses } = await supabaseAdmin
          .from('pulses')
          .select('mood, window_id, created_at')
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        // Group moods by day
        const moodsByDay: Record<string, string[]> = {};
        for (const p of pulses || []) {
          const day = new Date(p.created_at).toISOString().split('T')[0];
          if (!moodsByDay[day]) moodsByDay[day] = [];
          moodsByDay[day].push(p.mood);
        }

        // Find dominant mood
        const allMoods = (pulses || []).map((p) => p.mood);
        const moodFreq: Record<string, number> = {};
        for (const m of allMoods) {
          moodFreq[m] = (moodFreq[m] || 0) + 1;
        }
        const dominantMood = Object.entries(moodFreq)
          .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

        cardData = {
          ...cardData,
          moodsByDay,
          dominantMood,
          totalPulses: allMoods.length,
          daysActive: Object.keys(moodsByDay).length,
          headline: dominantMood
            ? `My week in moods: ${dominantMood}`
            : 'My week on Global Pulse',
        };
        break;
      }

      case 'daily': {
        // Get today's pulses
        const today = new Date().toISOString().split('T')[0];

        const { data: pulses } = await supabaseAdmin
          .from('pulses')
          .select('mood, window_id, created_at')
          .eq('user_id', userId)
          .gte('created_at', `${today}T00:00:00Z`)
          .order('created_at', { ascending: true });

        const moods = (pulses || []).map((p) => ({
          mood: p.mood,
          window: p.window_id,
          time: p.created_at,
        }));

        cardData = {
          ...cardData,
          moods,
          totalPulses: moods.length,
          headline: moods.length > 0
            ? `Today I'm feeling: ${moods.map((m) => m.mood).join(' → ')}`
            : 'Join me on Global Pulse',
        };
        break;
      }

      case 'streak': {
        cardData = {
          ...cardData,
          headline: user.streak_days >= 100
            ? `💎 CENTURION — ${user.streak_days} days`
            : user.streak_days >= 30
            ? `⚡ ${user.streak_days} day streak`
            : user.streak_days >= 7
            ? `🔥 ${user.streak_days} day streak`
            : `${user.streak_days} day streak`,
        };
        break;
      }

      case 'badge': {
        const badgeId = searchParams.get('badgeId');
        if (badgeId) {
          const { data: badge } = await supabaseAdmin
            .from('user_badges')
            .select('*, badges(*)')
            .eq('user_id', userId)
            .eq('badge_id', badgeId)
            .single();

          if (badge?.badges) {
            cardData = {
              ...cardData,
              badge: {
                id: badge.badge_id,
                name: badge.badges.name,
                icon: badge.badges.icon,
                description: badge.badges.description,
              },
              headline: `🏆 Unlocked: ${badge.badges.name}`,
            };
          }
        }
        break;
      }
    }

    // Track share card generation
    supabaseAdmin.from('share_events').insert({
      user_id: userId,
      share_type: 'card',
      card_type: cardType,
      card_data: cardData,
    }).then(({ error }) => {
      if (error) console.error('Share event tracking error:', error);
    });

    return NextResponse.json({ card: cardData });
  } catch (error) {
    console.error('Share card error:', error);
    return NextResponse.json({ error: 'Failed to generate card' }, { status: 500 });
  }
}
