import { CURRENT_TERMS_VERSION } from '../src/auth/signup-requirements';

/** Valid body for POST /auth/register in e2e tests. */
export function registerPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const email =
    typeof overrides.email === 'string'
      ? overrides.email
      : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  return {
    email,
    password: 'password1',
    confirmedAdult: true,
    acceptedTermsVersion: CURRENT_TERMS_VERSION,
    host: false,
    ...overrides,
  };
}
