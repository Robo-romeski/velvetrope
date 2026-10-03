'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import {
  Alert,
  ButtonLink,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

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
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Host payments"
        title="Stripe account status"
        description="We are checking the latest connection status from Stripe."
      />
      <Card className="space-y-5">
      {loading ? (
          <LoadingState label="Checking Stripe status…" />
      ) : (
          <Alert
            tone={status?.connected ? 'success' : 'warning'}
            title={status?.connected ? 'Stripe connected' : 'Setup incomplete'}
          >
            {status?.accountId
              ? `Account ${status.accountId}`
              : 'Return to payment settings to continue onboarding.'}
          </Alert>
      )}
        <ButtonLink href="/host/stripe" variant="secondary">
          Back to payment settings
        </ButtonLink>
      </Card>
    </PageShell>
  );
}
