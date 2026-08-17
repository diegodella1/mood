import { NextRequest } from 'next/server';
import { verifyBearerToken } from '@/lib/crypto-auth';
import { getClientIp, hasAdminSession } from '@/lib/session';

/**
 * Verifies admin authentication via HttpOnly cookie (preferred)
 * or Bearer ADMIN_SECRET (scripts / legacy).
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  if (hasAdminSession(request)) {
    return true;
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || adminSecret.length < 32) {
    return false;
  }

  return verifyBearerToken(request.headers.get('authorization'), adminSecret);
}

export function getAdminIdentifier(request: NextRequest): string {
  if (hasAdminSession(request)) {
    return 'admin_session';
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1] || '';
    return `admin_${token.slice(0, 8)}`;
  }
  return 'unknown';
}

export function getClientIP(request: NextRequest): string {
  return getClientIp(request);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
