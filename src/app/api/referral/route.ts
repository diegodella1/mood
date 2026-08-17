import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

const applyReferralSchema = z.object({
  userId: z.string().uuid().optional(),
  referralCode: z.string().min(4).max(10),
});

// Apply a referral code to a user
export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const body = await request.json();
    const data = applyReferralSchema.parse(body);

    // Process referral via database function
    const { data: result, error } = await supabaseAdmin.rpc('process_referral', {
      p_referral_code: data.referralCode.toUpperCase(),
      p_new_user_id: userId,
    });

    if (error) {
      console.error('Referral process error:', error);
      return NextResponse.json(
        { error: 'Failed to process referral' },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Invalid referral code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Referral applied! You both received 1 shield.',
      reward: 'shield',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's referral info
export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  try {
    // Get user's referral code and stats
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('referral_code, referral_count, referred_by, display_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get recent referrals made by this user
    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select('created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get referral tiers
    const { data: tiers } = await supabaseAdmin
      .from('referral_tiers')
      .select('*')
      .order('tier', { ascending: true });

    const referralCount = user.referral_count || 0;

    // Calculate current tier and next tier
    const allTiers = tiers || [];
    const currentTier = allTiers.filter((t) => referralCount >= t.referrals_required).pop() || null;
    const nextTier = allTiers.find((t) => referralCount < t.referrals_required) || null;

    return NextResponse.json({
      referralCode: user.referral_code,
      referralCount,
      wasReferred: !!user.referred_by,
      displayName: user.display_name,
      recentReferrals: referrals?.length || 0,
      // Tier system
      currentTier: currentTier ? {
        tier: currentTier.tier,
        title: currentTier.title,
        reward_type: currentTier.reward_type,
      } : null,
      nextTier: nextTier ? {
        tier: nextTier.tier,
        title: nextTier.title,
        description: nextTier.description,
        referrals_required: nextTier.referrals_required,
        referrals_remaining: nextTier.referrals_required - referralCount,
        reward_type: nextTier.reward_type,
        reward_value: nextTier.reward_value,
      } : null,
      tiers: allTiers.map((t) => ({
        tier: t.tier,
        title: t.title,
        referrals_required: t.referrals_required,
        reward_type: t.reward_type,
        unlocked: referralCount >= t.referrals_required,
      })),
    });
  } catch (error) {
    console.error('Referral info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
