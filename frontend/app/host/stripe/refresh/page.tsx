import { notFound } from 'next/navigation';
import { ButtonLink, Card, PageHeader, PageShell } from '@/app/components/ui';
import { paymentsEnabled } from '@/lib/payments-enabled';

export default function StripeRefreshPage() {
  if (!paymentsEnabled()) notFound();
  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Payments"
        title="Stripe onboarding"
        description="You can restart onboarding if something interrupted the setup."
      />
      <Card className="p-6">
        <ButtonLink href="/host/stripe">Return to payment settings</ButtonLink>
      </Card>
    </PageShell>
  );
}


