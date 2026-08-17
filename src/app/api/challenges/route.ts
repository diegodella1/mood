import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/challenges
 *
 * Returns today's daily challenges with the session user's progress.
 * If the user doesn't have challenge records yet, creates them.
 */
export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's challenges
    const { data: challenges } = await supabaseAdmin
      .from('daily_challenges')
      .select('*')
      .eq('challenge_date', today);

    if (!challenges || challenges.length === 0) {
      // Try to generate them
      await supabaseAdmin.rpc('generate_daily_challenges');
      const { data: newChallenges } = await supabaseAdmin
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', today);

      if (!newChallenges || newChallenges.length === 0) {
        return NextResponse.json({ challenges: [] });
      }

      // Use newly generated challenges
      return await buildResponse(newChallenges, userId);
    }

    return await buildResponse(challenges, userId);
  } catch (error) {
    console.error('Challenges error:', error);
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
}

async function buildResponse(
  challenges: Array<{
    id: string;
    challenge_type: string;
    title: string;
    description: string;
    icon: string;
    xp_reward: number;
    condition: Record<string, unknown>;
    difficulty: string;
  }>,
  userId: string,
) {
  // Get or create user challenge records
  const challengeIds = challenges.map((c) => c.id);

  const { data: userChallenges } = await supabaseAdmin
    .from('user_challenges')
    .select('*')
    .eq('user_id', userId)
    .in('challenge_id', challengeIds);

  const existingMap = new Map((userChallenges || []).map((uc) => [uc.challenge_id, uc]));

  // Create missing records
  const missing = challenges.filter((c) => !existingMap.has(c.id));
  if (missing.length > 0) {
    const inserts = missing.map((c) => ({
      user_id: userId,
      challenge_id: c.id,
      progress: 0,
      target: (c.condition as { target?: number }).target ?? 1,
    }));

    const { data: inserted } = await supabaseAdmin
      .from('user_challenges')
      .insert(inserts)
      .select();

    for (const uc of inserted || []) {
      existingMap.set(uc.challenge_id, uc);
    }
  }

  // Build response
  const result = challenges.map((c) => {
    const uc = existingMap.get(c.id);
    return {
      id: c.id,
      type: c.challenge_type,
      title: c.title,
      description: c.description,
      icon: c.icon,
      xp_reward: c.xp_reward,
      difficulty: c.difficulty,
      progress: uc?.progress ?? 0,
      target: uc?.target ?? 1,
      completed: uc?.completed ?? false,
      xp_claimed: uc?.xp_claimed ?? false,
    };
  });

  return NextResponse.json({ challenges: result });
}

/**
 * POST /api/challenges
 *
 * Claim XP for a completed challenge.
 * Body: { challengeId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const body = await request.json();
    const { challengeId } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'challengeId required' },
        { status: 400 },
      );
    }

    // Get the user challenge
    const { data: uc } = await supabaseAdmin
      .from('user_challenges')
      .select('*, daily_challenges(*)')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .single();

    if (!uc) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (!uc.completed) {
      return NextResponse.json({ error: 'Challenge not completed yet' }, { status: 400 });
    }

    if (uc.xp_claimed) {
      return NextResponse.json({ error: 'XP already claimed' }, { status: 409 });
    }

    const xpReward = uc.daily_challenges?.xp_reward ?? 25;

    // Award XP
    const { data: xpResult } = await supabaseAdmin.rpc('award_xp', {
      p_user_id: userId,
      p_amount: xpReward,
      p_source: 'challenge',
      p_metadata: { challenge_id: challengeId, challenge_type: uc.daily_challenges?.challenge_type },
    });

    // Mark as claimed
    await supabaseAdmin
      .from('user_challenges')
      .update({ xp_claimed: true })
      .eq('id', uc.id);

    const result = Array.isArray(xpResult) ? xpResult[0] : xpResult;

    return NextResponse.json({
      success: true,
      xp_awarded: xpReward,
      new_xp: result?.new_xp,
      new_level: result?.new_level,
      leveled_up: result?.leveled_up,
    });
  } catch (error) {
    console.error('Challenge claim error:', error);
    return NextResponse.json({ error: 'Failed to claim challenge' }, { status: 500 });
  }
}
