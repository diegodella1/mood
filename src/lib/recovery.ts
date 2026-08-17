import { randomAlphanumeric, sha256Hex } from '@/lib/crypto-auth';

export const RECOVERY_CODE_LENGTH = 8;
export const RECOVERY_CODE_TTL_MS = 15 * 60 * 1000;
export const EMAIL_VERIFY_CODE_LENGTH = 8;
export const EMAIL_VERIFY_TTL_MS = 15 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;

export function generateVerificationCode(length = RECOVERY_CODE_LENGTH): string {
  return randomAlphanumeric(length);
}

export function hashVerificationCode(code: string): string {
  return sha256Hex(code.trim().toUpperCase());
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
