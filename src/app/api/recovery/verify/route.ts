import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkIpRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { applyUserSessionCookie } from '@/lib/session';
import { hashVerificationCode, maskEmail, MAX_VERIFY_ATTEMPTS } from '@/lib/recovery';

const verifySchema = z.object({
  code: z.string().min(6).max(12),
});

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkIpRateLimit(request, 'recovery_verify');
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    const body = await request.json();
    const data = verifySchema.parse(body);
    const codeHash = hashVerificationCode(data.code);

    const { data: row, error: lookupError } = await supabaseAdmin
      .from('recovery_codes')
      .select('id, user_id, expires_at, used_at')
      .eq('code', codeHash)
      .is('used_at', null)
      .maybeSingle();

    if (lookupError) {
      console.error('Code verification error:', lookupError);
      return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }

    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const { data: attempts } = await supabaseAdmin
      .from('recovery_codes')
      .select('id')
      .eq('user_id', row.user_id)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if ((attempts?.length || 0) > MAX_VERIFY_ATTEMPTS + 3) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }

    await supabaseAdmin
      .from('recovery_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id);

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, streak_days, max_streak_ever, aura, email')
      .eq('id', row.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      userId: user.id,
      user: {
        streakDays: user.streak_days,
        maxStreakEver: user.max_streak_ever,
        aura: user.aura,
        email: user.email ? maskEmail(user.email) : null,
      },
    });

    return applyUserSessionCookie(response, user.id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    console.error('Recovery verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
