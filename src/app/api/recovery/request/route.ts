import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkIpRateLimit, checkRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { generateVerificationCode, hashVerificationCode, RECOVERY_CODE_TTL_MS } from '@/lib/recovery';
import { sendVerificationEmail } from '@/lib/email';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkIpRateLimit(request, 'recovery_request');
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    const body = await request.json();
    const data = requestSchema.parse(body);
    const email = data.email.toLowerCase();

    const emailLimit = await checkRateLimit(`email:${email}`, 'recovery_request');
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfter);
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email)
      .eq('email_verified', true)
      .maybeSingle();

    if (userError || !user) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ success: true });
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);

    await supabaseAdmin
      .from('recovery_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null);

    const { error: insertError } = await supabaseAdmin.from('recovery_codes').insert({
      user_id: user.id,
      code: codeHash,
      expires_at: new Date(Date.now() + RECOVERY_CODE_TTL_MS).toISOString(),
    });

    if (insertError) {
      console.error('Code generation error:', insertError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    await sendVerificationEmail(email, code, 'recovery');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    console.error('Recovery request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
