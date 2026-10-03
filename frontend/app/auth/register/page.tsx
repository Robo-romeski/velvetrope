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

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => safeNext(searchParams?.get('next') ?? null), [searchParams]);
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState(searchParams?.get('host') === '1');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, host }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiError(data, 'Could not create account'));
        return;
      }
      await refresh();
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow={host ? 'Host membership' : 'Member access'}
        title="Create your account"
        description={
          host
            ? 'Set up your host profile and start creating considered gatherings.'
            : 'Apply to gatherings, keep tickets close, and stay connected.'
        }
      />
      <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Name" htmlFor="register-name">
            <Input
              id="register-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor="register-email">
            <Input
              id="register-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField
            label="Password"
            htmlFor="register-password"
            hint="Use at least eight characters."
          >
            <Input
              id="register-password"
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-sm">
            <input
              type="checkbox"
              checked={host}
              onChange={(e) => setHost(e.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              <span className="block font-medium">I host events</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">
                Adds host tools for publishing events and managing guests.
              </span>
            </span>
          </label>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
          Already have an account?{' '}
          <TextLink href={`/auth/login?next=${encodeURIComponent(next)}`}>
            Log in
          </TextLink>
        </p>
      </Card>
    </PageShell>
  );
}
