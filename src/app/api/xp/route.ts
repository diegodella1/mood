import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/xp
 *
 * Returns the session user's XP, level, progress to next level, and recent transactions.
 */
export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  try {
    // Get user XP data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('xp, xp_level, xp_multiplier, xp_multiplier_expires_at')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const xp = user.xp ?? 0;
    const level = user.xp_level ?? 1;

    // Calculate progress to next level
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    // Inverse: xp_for_level = (level - 1)^2 * 100
    const xpForCurrentLevel = (level - 1) ** 2 * 100;
    const xpForNextLevel = level ** 2 * 100;
    const xpInLevel = xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

    // Check active multiplier
    const hasActiveMultiplier =
      user.xp_multiplier > 1 &&
      user.xp_multiplier_expires_at &&
      new Date(user.xp_multiplier_expires_at) > new Date();

    // Get recent XP transactions
    const { data: transactions } = await supabaseAdmin
      .from('xp_transactions')
      .select('amount, source, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      xp,
      level,
      xp_for_next_level: xpForNextLevel,
      xp_in_level: xpInLevel,
      xp_needed: xpNeeded,
      progress_percent: progressPercent,
      multiplier: hasActiveMultiplier ? user.xp_multiplier : 1,
      multiplier_expires_at: hasActiveMultiplier ? user.xp_multiplier_expires_at : null,
      recent_transactions: transactions || [],
    });
  } catch (error) {
    console.error('XP fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch XP' }, { status: 500 });
  }
}
