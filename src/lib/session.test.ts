import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  signUserSession,
  verifyUserSession,
  signAdminSession,
  verifyAdminSession,
} from '@/lib/session';

describe('user session tokens', () => {
  const previous = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'a'.repeat(32);
  });

  afterEach(() => {
    process.env.SESSION_SECRET = previous;
  });

  it('round-trips a user id', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const token = signUserSession(userId);
    expect(verifyUserSession(token)).toBe(userId);
  });

  it('rejects tampered tokens', () => {
    const token = signUserSession('11111111-1111-4111-8111-111111111111');
    expect(verifyUserSession(token.replace(/.$/, '0'))).toBeNull();
    expect(verifyUserSession('not-a-token')).toBeNull();
    expect(verifyUserSession(null)).toBeNull();
  });
});

describe('admin session tokens', () => {
  const previous = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'b'.repeat(32);
  });

  afterEach(() => {
    process.env.SESSION_SECRET = previous;
  });

  it('accepts a fresh admin session', () => {
    expect(verifyAdminSession(signAdminSession())).toBe(true);
  });

  it('rejects expired admin sessions', () => {
    const token = signAdminSession(Date.now() - 9 * 60 * 60 * 1000);
    expect(verifyAdminSession(token)).toBe(false);
  });
});
