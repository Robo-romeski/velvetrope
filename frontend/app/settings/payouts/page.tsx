'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  LoadingState,
  MetricTile,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type StripeStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeConfigured?: boolean;
};

export default function PayoutSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const isHost = user?.roles?.includes('host') === true;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fsettings%2Fpayouts');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const s = (await apiGetAuth('/stripe/status')) as StripeStatus;
        if (mounted) setStatus(s);
      } catch (e) {
        if (!mounted) return;
        if (isUnauthorized(e)) {
          router.replace('/auth/login?next=%2Fsettings%2Fpayouts');
        } else {
          setError(e instanceof Error ? e.message : 'Could not load payout status');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, user, router]);

  const startOnboarding = async () => {
    setOnboarding(true);
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
      setOnboarding(false);
    }
  };

  if (authLoading || loading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  const stripeLive = status?.stripeConfigured !== false;
  const ready =
    status?.connected &&
    (status.chargesEnabled !== false || status.stripeConfigured === false);

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/settings/profile">← Profile settings</TextLink>
      <PageHeader
        title="Payouts"
        description="Connect a payout account to sell priced gatherings and paid learning content."
        actions={
          status ? (
            <Badge tone={ready ? 'success' : 'warning'}>
              {ready ? 'Ready to sell' : 'Setup required'}
            </Badge>
          ) : undefined
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {!isHost && (
        <Alert tone="info">
          Host a gathering to unlock Stripe Connect for ticket sales. Educators
          still need payout setup for paid courses — enable educator mode under{' '}
          <Link href="/learn/new" className="underline">
            Learn → Create
          </Link>
          .
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricTile
          label="Stripe"
          value={stripeLive ? (status?.connected ? 'Connected' : 'Not connected') : 'Simulation'}
        />
        <MetricTile
          label="Charges"
          value={
            status?.chargesEnabled === true
              ? 'Enabled'
              : status?.stripeConfigured === false
                ? 'Simulated'
                : 'Pending'
          }
        />
      </div>
      <Card className="space-y-4 p-6">
        {status?.stripeConfigured === false ? (
          <p className="text-sm text-muted">
            Production Stripe keys are not configured on the server. Paid flows
            use simulated checkout until{' '}
            <code className="text-xs">STRIPE_SECRET_KEY</code> is set (see{' '}
            <code className="text-xs">deploy/lightsail/LAUNCH.md</code>).
          </p>
        ) : (
          <p className="text-sm text-muted">
            Complete Stripe Connect onboarding to receive ticket and course
            payouts. Free events and free learning do not require this.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => void startOnboarding()}
            disabled={onboarding}
          >
            {onboarding ? 'Opening Stripe…' : 'Manage payout account'}
          </Button>
          <Link
            href="/host/stripe"
            className="inline-flex items-center text-sm font-semibold text-accent"
          >
            Host payment details →
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
