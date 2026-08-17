import { describe, expect, it } from 'vitest';
import { randomAlphanumeric, timingSafeEqualString, verifyBearerToken } from '@/lib/crypto-auth';
import { generateVerificationCode, hashVerificationCode, maskEmail } from '@/lib/recovery';
import { isValidCityId, normalizeCityId, searchCities } from '@/lib/cities-geo';

describe('crypto-auth', () => {
  it('compares secrets in constant time', () => {
    expect(timingSafeEqualString('secret', 'secret')).toBe(true);
    expect(timingSafeEqualString('secret', 'other')).toBe(false);
    expect(timingSafeEqualString('short', 'longer-value')).toBe(false);
  });

  it('validates bearer tokens', () => {
    const secret = 'c'.repeat(32);
    expect(verifyBearerToken(`Bearer ${secret}`, secret)).toBe(true);
    expect(verifyBearerToken('Bearer wrong', secret)).toBe(false);
    expect(verifyBearerToken(null, secret)).toBe(false);
    expect(verifyBearerToken(`Bearer ${secret}`, 'short')).toBe(false);
  });

  it('generates alphanumeric codes of the requested length', () => {
    const code = randomAlphanumeric(8);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });
});

describe('recovery helpers', () => {
  it('hashes codes case-insensitively', () => {
    const code = generateVerificationCode();
    expect(hashVerificationCode(code)).toBe(hashVerificationCode(code.toLowerCase()));
    expect(hashVerificationCode(code)).not.toBe(hashVerificationCode('AAAAAAAA'));
  });

  it('masks emails', () => {
    expect(maskEmail('hello@example.com')).toBe('he***@example.com');
  });
});

describe('city catalog', () => {
  it('accepts known slugs and display names', () => {
    expect(isValidCityId('buenos-aires')).toBe(true);
    expect(normalizeCityId('Buenos Aires')).toBe('buenos-aires');
    expect(normalizeCityId('not-a-city')).toBeNull();
  });

  it('searches cities by name', () => {
    const results = searchCities('madrid');
    expect(results.some((city) => city.cityId === 'madrid')).toBe(true);
  });
});
