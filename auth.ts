import crypto from 'crypto';

export const PASSWORD_HASH_PREFIX = 'scrypt$';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('base64');
  const derived = crypto.scryptSync(password, salt, 64).toString('base64');
  return `${PASSWORD_HASH_PREFIX}${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (!stored.startsWith(PASSWORD_HASH_PREFIX)) {
    return stored === password;
  }

  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  if (!salt || !expectedHash) return false;

  const derived = crypto.scryptSync(password, salt, 64);
  const candidate = derived.toString('base64');
  const expected = Buffer.from(expectedHash, 'base64');
  const actual = Buffer.from(candidate, 'base64');

  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function generateRandomPassword(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
