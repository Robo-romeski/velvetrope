'use client';

import { FormEvent, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    setDevToken(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiError(data, 'Request failed'));
        return;
      }
      setMessage(
        typeof data.message === 'string'
          ? data.message
          : 'If an account exists for that email, instructions have been sent.',
      );
      if (typeof data.resetToken === 'string') {
        setDevToken(data.resetToken);
      }
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Account recovery"
        title="Reset your password"
        description="Enter your email and we will send reset instructions if an account exists."
      />
      <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Email" htmlFor="recovery-email">
            <Input
              id="recovery-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          {message && <Alert tone="success">{message}</Alert>}
          {devToken && (
            <Alert tone="info" title="Development reset link">
              <p className="mb-2">
              Dev mode: API returned a reset token (EXPOSE_PASSWORD_RESET_TOKEN).
              </p>
              <TextLink
                href={`/auth/reset-password?token=${encodeURIComponent(devToken)}`}
                className="break-all"
              >
                Reset password
              </TextLink>
            </Alert>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
        <div className="mt-6 border-t border-border pt-5 text-center text-sm">
          <TextLink href="/auth/login">Back to login</TextLink>
        </div>
      </Card>
    </PageShell>
  );
}
