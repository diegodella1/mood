import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkIpRateLimit, checkRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { requireUser } from '@/lib/session';
import { sendVerificationEmail } from '@/lib/email';
import {
  EMAIL_VERIFY_TTL_MS,
  generateVerificationCode,
  hashVerificationCode,
  maskEmail,
} from '@/lib/recovery';

const emailSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;

    const ipLimit = await checkIpRateLimit(request, 'email_update');
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    const userLimit = await checkRateLimit(session.userId, 'email_update');
    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfter);
    }

    const body = await request.json();
    const data = emailSchema.parse(body);
    const email = data.email.toLowerCase();

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', session.userId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    const code = generateVerificationCode();
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        pending_email: email,
        email_verify_hash: hashVerificationCode(code),
        email_verify_expires_at: new Date(Date.now() + EMAIL_VERIFY_TTL_MS).toISOString(),
        email_verify_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId);

    if (error) {
      console.error('Email save error:', error);
      return NextResponse.json(
        { error: 'Failed to start email verification' },
        { status: 500 }
      );
    }

    await sendVerificationEmail(email, code, 'verify');

    return NextResponse.json({
      success: true,
      pending: true,
      email: maskEmail(email),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.error('Email save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('email, email_verified, pending_email')
    .eq('id', session.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ email: null, hasEmail: false, verified: false });
  }

  if (user.email && user.email_verified) {
    return NextResponse.json({
      email: maskEmail(user.email),
      hasEmail: true,
      verified: true,
    });
  }

  if (user.pending_email) {
    return NextResponse.json({
      email: maskEmail(user.pending_email),
      hasEmail: false,
      verified: false,
      pending: true,
    });
  }

  return NextResponse.json({ email: null, hasEmail: false, verified: false });
}
