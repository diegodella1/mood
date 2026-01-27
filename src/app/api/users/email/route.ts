import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse, isValidUUID } from '@/lib/api-utils';

const emailSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

// Save email for recovery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = emailSchema.parse(body);

    // Rate limit check
    const rateLimit = await checkRateLimit(data.userId, 'email_update');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // Check if email is already used by another user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .neq('id', data.userId)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Update user with email
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email: data.email.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.userId);

    if (error) {
      console.error('Email save error:', error);
      return NextResponse.json(
        { error: 'Failed to save email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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

// Get user's email status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ error: 'Invalid or missing userId' }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ email: null });
  }

  // Return masked email for privacy
  const email = user.email;
  if (!email) {
    return NextResponse.json({ email: null });
  }

  const [local, domain] = email.split('@');
  const masked = local.slice(0, 2) + '***@' + domain;

  return NextResponse.json({ email: masked, hasEmail: true });
}
