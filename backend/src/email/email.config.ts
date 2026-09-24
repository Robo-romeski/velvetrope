export function resolveResendApiKey(): string | undefined {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || undefined;
}

export function resolveEmailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  return 'VelvetKey <onboarding@resend.dev>';
}

export function resolveAppBaseUrl(): string {
  const base =
    process.env.APP_BASE_URL?.trim() || 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

/** When true, emails are stored in-memory (and logged) instead of calling Resend. */
export function shouldCaptureEmail(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  return !resolveResendApiKey();
}
