'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';

type StripeStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeConfigured?: boolean;
};

export default function HostStripeOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StripeStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await apiGetAuth('/stripe/status');
        if (!mounted) return;
        setStatus(s);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load Stripe status');
      }
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

  const readyForPaidEvents =
    status?.connected &&
    (status.chargesEnabled !== false || status.stripeConfigured === false);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Stripe Connect</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Connect Stripe to accept ticket payments for priced events. Free events work without this.
      </p>
      {status?.stripeConfigured === false && (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-3">
          Stripe API keys are not configured on the server. Onboarding links are simulated locally;
          set <code className="text-xs">STRIPE_SECRET_KEY</code> in production to enable live Connect.
        </p>
      )}
      <div className="text-sm space-y-1">
        <div>
          Status:{' '}
          <strong>{status?.connected ? 'Connected' : 'Not connected'}</strong>
          {status?.accountId ? ` (${status.accountId})` : ''}
        </div>
        {status?.connected && status.stripeConfigured !== false && (
          <>
            <div>Charges: {status.chargesEnabled ? 'enabled' : 'pending'}</div>
            <div>Payouts: {status.payoutsEnabled ? 'enabled' : 'pending'}</div>
          </>
        )}
        {readyForPaidEvents && (
          <div className="text-green-700 dark:text-green-400">
            You can set a ticket price on event edit.
          </div>
        )}
      </div>
      <button
        onClick={startOnboarding}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : status?.connected ? 'Update Stripe account' : 'Connect Stripe'}
      </button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
