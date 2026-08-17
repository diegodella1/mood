import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { identifierToUuid, verifyBearerToken } from '@/lib/crypto-auth';
import { getClientIp } from '@/lib/session';
import { verifyAdminAuth } from '@/lib/admin/auth';

// ============================================
// CRON AUTHENTICATION
// ============================================

/**
 * Validates cron secret from request headers
 * Use this at the start of every cron endpoint
 */
export function validateCronAuth(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < 32) {
    console.error('CRON_SECRET not configured or too short');
    return {
      valid: false,
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    };
  }

  if (!verifyBearerToken(request.headers.get('authorization'), cronSecret)) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { valid: true };
}

export function validateInternalAuth(request: NextRequest): { valid: boolean; error?: NextResponse } {
  return validateCronAuth(request);
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

/**
 * Validates admin cookie session or Bearer ADMIN_SECRET.
 */
export function validateAdminAuth(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || adminSecret.length < 32) {
    console.error('ADMIN_SECRET not configured or too short');
    return {
      valid: false,
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    };
  }

  if (!verifyAdminAuth(request)) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { valid: true };
}

// ============================================
// RATE LIMITING
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// Default rate limits by action type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  pulse: { maxRequests: 10, windowSeconds: 60 },
  reaction: { maxRequests: 30, windowSeconds: 60 },
  recovery_request: { maxRequests: 3, windowSeconds: 300 }, // 3 per 5 min
  recovery_verify: { maxRequests: 5, windowSeconds: 300 },  // 5 per 5 min
  email_update: { maxRequests: 3, windowSeconds: 300 },     // 3 per 5 min
  push_optin: { maxRequests: 5, windowSeconds: 60 },        // 5 per min
};

const FAIL_CLOSED_ACTIONS = new Set<keyof typeof RATE_LIMITS>([
  'recovery_request',
  'recovery_verify',
  'email_update',
]);

/**
 * Check if action is rate limited.
 * `identifier` may be a user UUID or any string (IP, email hash, etc).
 */
export async function checkRateLimit(
  identifier: string,
  actionType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[actionType];
  if (!config) {
    console.warn(`Unknown rate limit action type: ${actionType}`);
    return { allowed: true };
  }

  const userId = isValidUUID(identifier) ? identifier : identifierToUuid(identifier);

  try {
    const { data, error } = await supabaseAdmin.rpc('check_action_rate_limit', {
      p_user_id: userId,
      p_action_type: actionType,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      if (FAIL_CLOSED_ACTIONS.has(actionType)) {
        return { allowed: false, retryAfter: config.windowSeconds };
      }
      return { allowed: true };
    }

    return {
      allowed: data === true,
      retryAfter: data === false ? config.windowSeconds : undefined,
    };
  } catch (error) {
    console.error('Rate limit check exception:', error);
    if (FAIL_CLOSED_ACTIONS.has(actionType)) {
      return { allowed: false, retryAfter: config.windowSeconds };
    }
    return { allowed: true };
  }
}

export async function checkIpRateLimit(
  request: NextRequest,
  actionType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const ip = getClientIp(request);
  return checkRateLimit(`ip:${actionType}:${ip}`, actionType);
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(retryAfter: number = 60): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
}

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate pagination params with safe defaults
 */
export function parsePagination(
  request: NextRequest,
  maxLimit: number = 100,
  defaultLimit: number = 20
): PaginationParams {
  const url = request.nextUrl;
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');

  let page = parseInt(pageParam || '1', 10);
  let limit = parseInt(limitParam || String(defaultLimit), 10);

  // Sanitize values
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;

  // Enforce max limit to prevent DoS
  limit = Math.min(limit, maxLimit);

  // Enforce reasonable max page to prevent huge offsets
  const maxPage = 10000;
  page = Math.min(page, maxPage);

  return { page, limit };
}

// ============================================
// UUID VALIDATION
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

// ============================================
// ERROR RESPONSE HELPERS
// ============================================

export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
