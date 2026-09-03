'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';

export default function HostStripeOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ connected: boolean; accountId?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await apiGetAuth('/stripe/status');
        if (!mounted) return;
        setStatus(s);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetAuth('/stripe/onboarding');
      if (data?.url) {
        window.location.href = data.url as string;
      } else {
        setError('No onboarding URL returned');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Stripe Connect Onboarding</h1>
      <p className="text-sm text-gray-600">Connect your payout account via Stripe.</p>
      <div className="text-sm">
        Status: {status?.connected ? 'Connected' : 'Not connected'}
        {status?.accountId ? ` (acct: ${status.accountId})` : ''}
      </div>
      <button
        onClick={startOnboarding}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Start Onboarding'}
      </button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
