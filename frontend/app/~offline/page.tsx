import {
  Alert,
  ButtonLink,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

export default function OfflinePage() {
  return (
    <PageShell size="narrow" className="space-y-7 py-16 sm:py-24">
      <PageHeader
        eyebrow="Connection paused"
        title="You are offline"
        description="Your saved tickets are still close at hand."
      />
      <Alert tone="warning">
        Previously opened attendee tickets remain available from their event
        ticket URL. Host check-in, payments, applications, and account changes
        require a connection.
      </Alert>
      <ButtonLink href="/" variant="secondary">
        Try home again
      </ButtonLink>
    </PageShell>
  );
}
