'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm space-y-1">
          <span>Reset token</span>
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-transparent font-mono text-xs"
          />
        </label>
        <label className="block text-sm space-y-1">
          <span>New password</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-transparent"
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-700 dark:text-green-400">{message}</div>}
        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
      <Link href="/auth/login" className="text-sm text-blue-600 underline">
        Back to login
      </Link>
    </div>
  );
}
