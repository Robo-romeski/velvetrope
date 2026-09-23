export const AUTH_ISSUER = 'velvetkey';
export const AUTH_AUDIENCE = 'velvetkey-api';
export const AUTH_TOKEN_TTL = '7d';
export const DEV_AUTH_SECRET = 'dev-auth-secret-change-me-32-chars!!';

export function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set to at least 32 characters');
  }
  return DEV_AUTH_SECRET;
}
