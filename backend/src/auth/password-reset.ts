import { createHash, randomBytes } from 'crypto';

const RESET_TTL_MS = 60 * 60 * 1000;

export function createPasswordResetToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    hash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  };
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export function shouldExposePasswordResetToken(): boolean {
  return process.env.EXPOSE_PASSWORD_RESET_TOKEN === 'true';
}
