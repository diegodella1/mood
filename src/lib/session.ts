import { NextRequest, NextResponse } from 'next/server';
import { hmacSha256Hex, timingSafeEqualString } from '@/lib/crypto-auth';

export const USER_SESSION_COOKIE = 'gp_session';
export const ADMIN_SESSION_COOKIE = 'gp_admin';

const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 400;
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.CRON_SECRET ||
    process.env.ADMIN_SECRET ||
    '';

  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is not configured or is too short');
  }

  return secret;
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function signUserSession(userId: string): string {
  const signature = hmacSha256Hex(getSessionSecret(), `user:${userId}`);
  return `${userId}.${signature}`;
}

export function verifyUserSession(token: string | undefined | null): string | null {
  if (!token) return null;
  const separator = token.indexOf('.');
  if (separator <= 0) return null;

  const userId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!userId || !signature) return null;

  const expected = hmacSha256Hex(getSessionSecret(), `user:${userId}`);
  if (!timingSafeEqualString(signature, expected)) {
    return null;
  }

  return userId;
}

export function signAdminSession(issuedAt = Date.now()): string {
  const payload = `admin.${issuedAt}`;
  const signature = hmacSha256Hex(getSessionSecret(), payload);
  return `${payload}.${signature}`;
}

export function verifyAdminSession(
  token: string | undefined | null,
  maxAgeMs = ADMIN_SESSION_MAX_AGE * 1000
): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;

  const issuedAt = Number(parts[1]);
  const signature = parts[2];
  if (!Number.isFinite(issuedAt) || !signature) return false;
  if (Date.now() - issuedAt > maxAgeMs || Date.now() < issuedAt) return false;

  const expected = hmacSha256Hex(getSessionSecret(), `admin.${issuedAt}`);
  return timingSafeEqualString(signature, expected);
}

export function getSessionUserId(request: NextRequest): string | null {
  return verifyUserSession(request.cookies.get(USER_SESSION_COOKIE)?.value);
}

export function hasAdminSession(request: NextRequest): boolean {
  return verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export type SessionResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export function requireUser(request: NextRequest): SessionResult {
  const userId = getSessionUserId(request);
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, userId };
}

export function applyUserSessionCookie(response: NextResponse, userId: string): NextResponse {
  response.cookies.set(USER_SESSION_COOKIE, signUserSession(userId), {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: USER_SESSION_MAX_AGE,
  });
  return response;
}

export function applyAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_SESSION_COOKIE, signAdminSession(), {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}

export function clearAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
}
