'use client';

import {
  Button,
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell size="narrow" className="space-y-7 py-16 sm:py-24">
      <PageHeader
        eyebrow="epicsexual"
        title="Something went wrong"
        description="We could not load this page. Try again, or return to the event list."
      />
      <Card className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={reset}
        >
          Try again
        </Button>
        <ButtonLink href="/" variant="secondary">
          View events
        </ButtonLink>
      </Card>
    </PageShell>
  );
}
