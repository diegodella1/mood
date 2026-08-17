import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkIpRateLimit, checkRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { requireUser } from '@/lib/session';
import { hashVerificationCode, maskEmail, MAX_VERIFY_ATTEMPTS } from '@/lib/recovery';

const verifySchema = z.object({
  code: z.string().min(6).max(12),
});

export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;

    const ipLimit = await checkIpRateLimit(request, 'recovery_verify');
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    const userLimit = await checkRateLimit(session.userId, 'recovery_verify');
    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfter);
    }

    const body = await request.json();
    const data = verifySchema.parse(body);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, pending_email, email_verify_hash, email_verify_expires_at, email_verify_attempts')
      .eq('id', session.userId)
      .single();

    if (error || !user?.pending_email || !user.email_verify_hash) {
      return NextResponse.json({ error: 'No pending email verification' }, { status: 400 });
    }

    const attempts = user.email_verify_attempts ?? 0;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    const expired = !user.email_verify_expires_at || new Date(user.email_verify_expires_at).getTime() < Date.now();
    if (expired) {
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }

    if (hashVerificationCode(data.code) !== user.email_verify_hash) {
      await supabaseAdmin
        .from('users')
        .update({ email_verify_attempts: attempts + 1 })
        .eq('id', session.userId);
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const { data: taken } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', user.pending_email)
      .neq('id', session.userId)
      .maybeSingle();

    if (taken) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    await supabaseAdmin
      .from('users')
      .update({
        email: user.pending_email,
        email_verified: true,
        pending_email: null,
        email_verify_hash: null,
        email_verify_expires_at: null,
        email_verify_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId);

    return NextResponse.json({
      success: true,
      email: maskEmail(user.pending_email),
      verified: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }
    console.error('Email verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
