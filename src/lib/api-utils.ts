import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

// ============================================
// CRON AUTHENTICATION
// ============================================

/**
 * Validates cron secret from request headers
 * Use this at the start of every cron endpoint
 */
export function validateCronAuth(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < 32) {
    console.error('CRON_SECRET not configured or too short');
    return {
      valid: false,
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);

  // Use constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(cronSecret);

  if (tokenBuffer.length !== secretBuffer.length) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!crypto.timingSafeEqual(tokenBuffer, secretBuffer)) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { valid: true };
}

// ============================================
// ADMIN AUTHENTICATION (Fixed timing attack)
// ============================================

/**
 * Validates admin secret with constant-time comparison
 */
export function validateAdminAuth(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || adminSecret.length < 32) {
    console.error('ADMIN_SECRET not configured or too short');
    return {
      valid: false,
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);

  // Use constant-time comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(adminSecret);

    if (tokenBuffer.length !== secretBuffer.length) {
      return {
        valid: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    if (!crypto.timingSafeEqual(tokenBuffer, secretBuffer)) {
      return {
        valid: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
  } catch {
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

/**
 * Check if action is rate limited
 * Returns true if allowed, false if rate limited
 */
export async function checkRateLimit(
  userId: string,
  actionType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[actionType];
  if (!config) {
    console.warn(`Unknown rate limit action type: ${actionType}`);
    return { allowed: true };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('check_action_rate_limit', {
      p_user_id: userId,
      p_action_type: actionType,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow the request if rate limiting is broken
      return { allowed: true };
    }

    return {
      allowed: data === true,
      retryAfter: data === false ? config.windowSeconds : undefined,
    };
  } catch (error) {
    console.error('Rate limit check exception:', error);
    return { allowed: true };
  }
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
