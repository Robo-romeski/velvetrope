'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

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
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enter your email. When email delivery is configured, we will send reset instructions.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm space-y-1">
          <span>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-transparent"
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-700 dark:text-green-400">{message}</div>}
        {devToken && (
          <div className="text-xs space-y-2 border rounded p-3">
            <p className="text-gray-600 dark:text-gray-400">
              Dev mode: API returned a reset token (EXPOSE_PASSWORD_RESET_TOKEN).
            </p>
            <Link
              href={`/auth/reset-password?token=${encodeURIComponent(devToken)}`}
              className="text-blue-600 underline break-all"
            >
              Reset password
            </Link>
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <Link href="/auth/login" className="text-sm text-blue-600 underline">
        Back to login
      </Link>
    </div>
  );
}
