'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  MetricTile,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

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
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Host payments"
        title="Stripe Connect"
        description="Connect Stripe to accept ticket payments for priced events. Free events work without this."
        actions={
          status ? (
            <Badge tone={readyForPaidEvents ? 'success' : 'warning'}>
              {readyForPaidEvents ? 'Ready for paid events' : 'Setup required'}
            </Badge>
          ) : undefined
        }
      />
      {status?.stripeConfigured === false && (
        <Alert tone="warning" title="Payments run in simulation mode">
          Checkout and Connect follow the same URLs and fulfillment paths as live Stripe, but no
          money moves until you set <code className="text-xs">STRIPE_SECRET_KEY</code> on the
          server.
        </Alert>
      )}
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            label="Account"
            value={status?.connected ? 'Connected' : 'Not connected'}
            detail={status?.accountId}
          />
          <MetricTile
            label="Charges"
            value={status?.chargesEnabled ? 'Enabled' : 'Pending'}
          />
          <MetricTile
            label="Payouts"
            value={status?.payoutsEnabled ? 'Enabled' : 'Pending'}
          />
        </div>
        {status?.connected && status.stripeConfigured !== false && (
          <p className="text-sm leading-6 text-muted">
            Stripe securely manages payment details, payouts, and account
            verification. VelvetKey never stores card information.
          </p>
        )}
        {readyForPaidEvents && (
          <Alert tone="success">
            You can set a ticket price on event edit.
          </Alert>
        )}
        <Button onClick={startOnboarding} disabled={loading}>
          {loading
            ? 'Redirecting…'
            : status?.connected
              ? 'Update Stripe account'
              : 'Connect Stripe'}
        </Button>
      </Card>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </PageShell>
  );
}
