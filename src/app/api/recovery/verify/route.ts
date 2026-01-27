import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-utils';

const verifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
  currentUserId: z.string().uuid().optional(), // Current anonymous user to merge
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = verifySchema.parse(body);

    // Rate limit by code attempt (prevents brute force)
    const rateLimitId = data.currentUserId || `code:${data.code.slice(0, 3)}`;
    const rateLimit = await checkRateLimit(rateLimitId, 'recovery_verify');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // Verify the code using database function
    const { data: recoveredUserId, error: verifyError } = await supabaseAdmin.rpc(
      'verify_recovery_code',
      { p_code: data.code }
    );

    if (verifyError) {
      console.error('Code verification error:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify code' },
        { status: 500 }
      );
    }

    if (!recoveredUserId) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // If there's a current anonymous user, we could merge their data
    // For now, we just return the recovered user ID
    // The client will replace their localStorage userId with this one

    // Get the recovered user's data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, streak_days, max_streak_ever, aura, email')
      .eq('id', recoveredUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark email as verified (they received the code)
    await supabaseAdmin
      .from('users')
      .update({ email_verified: true })
      .eq('id', recoveredUserId);

    // Mask email for response
    let maskedEmail = null;
    if (user.email) {
      const [local, domain] = user.email.split('@');
      maskedEmail = local.slice(0, 2) + '***@' + domain;
    }

    return NextResponse.json({
      success: true,
      userId: recoveredUserId,
      user: {
        streakDays: user.streak_days,
        maxStreakEver: user.max_streak_ever,
        aura: user.aura,
        email: maskedEmail,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    console.error('Recovery verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
