'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
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
import { safePostAuthPath } from '@/lib/post-auth-redirect';

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(
    () => safePostAuthPath(searchParams?.get('next')),
    [searchParams],
  );
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiError(data, 'Login failed'));
        return;
      }
      await refresh();
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Welcome back"
        title="Log in to epicsexual"
        description="Continue to the community feed, messages, gatherings, and your applications."
      />
      <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <div className="flex justify-end">
            <TextLink href="/auth/forgot-password" className="text-sm">
              Forgot password?
            </TextLink>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
          No account?{' '}
          <TextLink
            href={`/auth/register?next=${encodeURIComponent(next)}`}
          >
            Create one
          </TextLink>
        </p>
      </Card>
    </PageShell>
  );
}
