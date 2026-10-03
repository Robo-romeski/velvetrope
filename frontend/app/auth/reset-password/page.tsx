'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = useMemo(
    () => searchParams?.get('token') ?? '',
    [searchParams],
  );
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiError(data, 'Reset failed'));
        return;
      }
      setMessage(
        typeof data.message === 'string' ? data.message : 'Password updated.',
      );
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch {
      setError('Reset failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Account recovery"
        title="Choose a new password"
        description="Use a password with at least eight characters."
      />
      <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField
            label="Reset token"
            htmlFor="reset-token"
            hint="This is filled automatically when you follow a reset link."
          >
            <Input
              id="reset-token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-xs"
            />
          </FormField>
          <FormField label="New password" htmlFor="new-password">
            <Input
              id="new-password"
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          {message && <Alert tone="success">{message}</Alert>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Update password'}
          </Button>
        </form>
        <div className="mt-6 border-t border-border pt-5 text-center text-sm">
          <TextLink href="/auth/login">Back to login</TextLink>
        </div>
      </Card>
    </PageShell>
  );
}
