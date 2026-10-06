'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetAuth } from '@/lib/api';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

export default function SimulatedStripeConnectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiGetAuth('/stripe/onboarding');
      router.push('/host/stripe/return');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup');
      setLoading(false);
    }
  };

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Stripe Connect"
        title="Simulated payout setup"
        description="Connect a payout account so priced events and paid courses can be sold. Real Stripe onboarding replaces this when API keys are configured."
      />
      <Alert tone="warning" title="Simulation only">
        No data is sent to Stripe. Completing this step marks your host account as ready for
        simulated ticket and course checkout.
      </Alert>
      {error && (
        <Alert tone="danger" title="Setup failed">
          {error}
        </Alert>
      )}
      <Card className="space-y-5 p-6">
        <ul className="list-inside list-disc space-y-2 text-sm text-muted">
          <li>Accept card payments for event tickets</li>
          <li>Receive payouts for paid learning content</li>
          <li>Switch to live Stripe Connect by adding server keys later</li>
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={finish} disabled={loading}>
            {loading ? 'Saving…' : 'Complete simulated setup'}
          </Button>
          <ButtonLink href="/host/stripe" variant="secondary">
            Back
          </ButtonLink>
        </div>
      </Card>
    </PageShell>
  );
}
