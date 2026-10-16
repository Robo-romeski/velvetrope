import Link from 'next/link';
import {
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

function resolveContactEmail(): string {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
    'admin@epicsexual.com'
  );
}

export default function ContactPage() {
  const email = resolveContactEmail();

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Platform"
        title="Contact"
        description="Questions about epicsexual, partnerships, or access issues — reach the team directly. For safety concerns about a member or event, use Report a concern instead."
      />
      <Card className="space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">
            Email
          </p>
          <p className="mt-2">
            <TextLink href={`mailto:${email}`}>{email}</TextLink>
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            We read every message. Response times vary; urgent safety issues
            should not wait on email — use{' '}
            <Link href="/trust/report" className="font-semibold underline">
              Report a concern
            </Link>{' '}
            (login required) or local emergency services when someone is at risk.
          </p>
        </div>
        <div className="border-t border-border pt-5">
          <p className="text-sm leading-6 text-muted">
            Logged-in members can also message hosts from event pages or use{' '}
            <Link href="/messages" className="font-semibold underline">
              Messages
            </Link>{' '}
            for community conversations — that is separate from platform support.
          </p>
        </div>
      </Card>
      <ButtonLink href="/" variant="secondary">
        Back to home
      </ButtonLink>
    </PageShell>
  );
}
