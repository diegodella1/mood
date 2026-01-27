import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/api-utils';

const applyReferralSchema = z.object({
  userId: z.string().uuid(),
  referralCode: z.string().min(4).max(10),
});

// Apply a referral code to a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = applyReferralSchema.parse(body);

    // Process referral via database function
    const { data: result, error } = await supabaseAdmin.rpc('process_referral', {
      p_referral_code: data.referralCode.toUpperCase(),
      p_new_user_id: data.userId,
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
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: 'Invalid or missing userId' },
      { status: 400 }
    );
  }

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

    return NextResponse.json({
      referralCode: user.referral_code,
      referralCount: user.referral_count || 0,
      wasReferred: !!user.referred_by,
      displayName: user.display_name,
      recentReferrals: referrals?.length || 0,
    });
  } catch (error) {
    console.error('Referral info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
