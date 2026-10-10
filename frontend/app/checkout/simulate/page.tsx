'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

type SimulatedSession = {
  simulated: true;
  sessionId: string;
  kind: 'event_ticket' | 'course_access';
  title: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  status: 'pending' | 'paid';
};

export default function SimulatedCheckoutPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading checkout…" />}>
      <SimulatedCheckoutContent />
    </Suspense>
  );
}

function SimulatedCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = useMemo(
    () => (searchParams?.get('session_id') ?? '').trim(),
    [searchParams],
  );
  const [session, setSession] = useState<SimulatedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError('Missing checkout session.');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = (await apiGetAuth(
          `/payments/simulated-checkout/${encodeURIComponent(sessionId)}`,
        )) as SimulatedSession;
        if (!mounted) return;
        setSession(data);
        if (data.status === 'paid') {
          router.replace(data.successUrl);
        }
      } catch (e) {
        if (!mounted) return;
        if (isUnauthorized(e)) {
          setUnauthorized(true);
          return;
        }
        setError(e instanceof Error ? e.message : 'Could not load checkout');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, router]);

  const pay = async () => {
    if (!sessionId) return;
    setPaying(true);
    setError(null);
    try {
      const result = (await apiPostAuth(
        `/payments/simulated-checkout/${encodeURIComponent(sessionId)}/complete`,
        {},
      )) as { successUrl: string };
      window.location.href = result.successUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment could not be completed');
      setPaying(false);
    }
  };

  const amountLabel =
    session &&
    (session.amountCents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: session.currency.toUpperCase(),
    });

  if (unauthorized) {
    const next = `/checkout/simulate?session_id=${encodeURIComponent(sessionId)}`;
    return (
      <PageShell size="narrow" className="space-y-7">
        <PageHeader
          eyebrow="Checkout"
          title="Log in to continue"
          description="This checkout session belongs to your epicsexual account."
        />
        <Card className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/auth/login?next=${encodeURIComponent(next)}`}>
            Log in
          </ButtonLink>
          <ButtonLink
            href={`/auth/register?next=${encodeURIComponent(next)}`}
            variant="secondary"
          >
            Sign up
          </ButtonLink>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="epicsexual checkout"
        title="Complete payment"
        description="Simulated checkout — same order and entitlement flow as live Stripe. No card is charged."
      />
      <Alert tone="warning" title="Simulation mode">
        Stripe is not configured on this server. Use the test card below, then pay to
        issue tickets or course access exactly as production will after Stripe is enabled.
      </Alert>
      {loading && <LoadingState label="Loading checkout…" />}
      {error && !loading && (
        <Alert tone="danger" title="Checkout unavailable">
          {error}
        </Alert>
      )}
      {session && !loading && (
        <Card className="space-y-6 p-6 sm:p-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {session.kind === 'event_ticket' ? 'Event ticket' : 'Course access'}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{session.title}</h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{amountLabel}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-dashed border-muted/40 bg-muted/5 p-4 text-sm">
            <p className="font-medium">Test card (simulation)</p>
            <p className="text-muted">
              4242 4242 4242 4242 · any future expiry · any CVC
            </p>
            <p className="text-muted">
              Card fields are not sent anywhere in simulation mode; they mirror the Stripe
              Checkout experience.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={pay} disabled={paying}>
              {paying ? 'Processing…' : `Pay ${amountLabel ?? ''}`}
            </Button>
            <ButtonLink href={session.cancelUrl} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
