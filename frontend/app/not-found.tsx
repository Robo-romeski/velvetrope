import {
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

export default function NotFoundPage() {
  return (
    <PageShell size="narrow" className="space-y-7 py-16 sm:py-24">
      <PageHeader
        eyebrow="404 · epicsexual"
        title="This page left early"
        description="It may have moved, or the event is no longer available."
      />
      <Card>
        <ButtonLink href="/">View events</ButtonLink>
      </Card>
    </PageShell>
  );
}
