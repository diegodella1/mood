import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Get user's secret achievements
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const includeHints = request.nextUrl.searchParams.get('hints') === 'true';

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  try {
    // Get earned achievements
    const { data: earned, error: earnedError } = await supabaseAdmin
      .from('user_secret_achievements')
      .select(`
        achievement_id,
        earned_at,
        context,
        achievement:secret_achievements (
          id,
          name,
          description,
          icon,
          rarity,
          shield_reward
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (earnedError) {
      console.error('Achievements error:', earnedError);
      return NextResponse.json({ error: 'Failed to get achievements' }, { status: 500 });
    }

    interface AchievementData {
      name?: string;
      description?: string;
      icon?: string;
      rarity?: string;
      shield_reward?: number;
    }

    const response: { earned: unknown[]; hints?: unknown[] } = {
      earned: earned?.map((e) => {
        const achievement = e.achievement as AchievementData | null;
        return {
          id: e.achievement_id,
          name: achievement?.name,
          description: achievement?.description,
          icon: achievement?.icon,
          rarity: achievement?.rarity,
          shieldReward: achievement?.shield_reward,
          earnedAt: e.earned_at,
        };
      }) || [],
    };

    // Optionally include hints for unearned achievements
    if (includeHints) {
      const earnedIds = earned?.map((e) => e.achievement_id) || [];

      const { data: unearned } = await supabaseAdmin
        .from('secret_achievements')
        .select('id, hint, rarity, icon')
        .not('id', 'in', `(${earnedIds.length > 0 ? earnedIds.map((id) => `'${id}'`).join(',') : "''"})`)
        .eq('is_secret', true);

      response.hints = unearned?.map((u) => ({
        id: u.id,
        hint: u.hint,
        rarity: u.rarity,
        icon: '❓', // Hidden icon
      })) || [];
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Achievements error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
