import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Verifies admin authentication using Bearer token
 * Token should match ADMIN_SECRET environment variable
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!authHeader || !adminSecret) {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(adminSecret);

    // If lengths differ, comparison will fail but we still compare to prevent timing leak
    if (tokenBuffer.length !== secretBuffer.length) {
      // Compare with itself to maintain constant time
      crypto.timingSafeEqual(secretBuffer, secretBuffer);
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, secretBuffer);
  } catch {
    return false;
  }
}

/**
 * Extracts admin identifier from request for audit logging
 */
export function getAdminIdentifier(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Hash or truncate the token for audit logs
    const token = authHeader.split(' ')[1] || '';
    return `admin_${token.slice(0, 8)}`;
  }
  return 'unknown';
}

/**
 * Get client IP for audit logging
 */
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Unauthorized response helper
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
