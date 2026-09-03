'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import Link from 'next/link';

export default function StripeReturnPage() {
  const [status, setStatus] = useState<{ connected: boolean; accountId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await apiGetAuth('/stripe/status');
        if (!mounted) return;
        setStatus(s);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Stripe Onboarding Return</h1>
      {loading ? (
        <div className="text-sm text-gray-600">Checking status…</div>
      ) : (
        <div className="text-sm">
          Status: {status?.connected ? 'Connected' : 'Not connected'}
          {status?.accountId ? ` (acct: ${status.accountId})` : ''}
        </div>
      )}
      <Link className="text-blue-600 underline" href="/host/stripe">
        Back to Stripe settings
      </Link>
    </div>
  );
}
