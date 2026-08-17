import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyBearerToken } from '@/lib/crypto-auth';
import { applyAdminSessionCookie, clearAdminSessionCookie, hasAdminSession } from '@/lib/session';

const loginSchema = z.object({
  secret: z.string().min(32),
});

export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || adminSecret.length < 32) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    if (!verifyBearerToken(`Bearer ${data.secret}`, adminSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    return applyAdminSessionCookie(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  return clearAdminSessionCookie(response);
}
