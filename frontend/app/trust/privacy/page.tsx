import Link from 'next/link';
import {
  Alert,
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

export default function PrivacyPage() {
  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow={`Version ${process.env.NEXT_PUBLIC_TERMS_VERSION ?? '2026-10-30'}`}
        title="Privacy policy"
        description="How epicsexual handles account data, profiles, and gathering information."
      />
      <Alert tone="warning">
        <strong>Draft placeholder.</strong> Final privacy policy text must be
        supplied by the platform operator before a public pilot.
      </Alert>
      <Card className="p-6 sm:p-8">
        <div className="vk-prose space-y-4 text-sm leading-7 text-muted">
          <p>
            We collect account email, profile fields you choose to share, and
            data needed to run gatherings (applications, tickets, feedback).
            Profile visibility is controlled in{' '}
            <TextLink href="/settings/privacy">privacy settings</TextLink>;
            your <strong>display name</strong> is what most members see in the
            community, separate from the name on your account.
          </p>
          <p>
            Exact gathering addresses are shown only to hosts and approved
            attendees. Public invitations may show a general area label only.
          </p>
          <p>
            You may export or delete your account from{' '}
            <TextLink href="/trust/export">trust &amp; data tools</TextLink>.
            Report concerns via{' '}
            <Link href="/trust/report" className="text-accent">
              report a concern
            </Link>
            .
          </p>
        </div>
      </Card>
      <ButtonLink href="/auth/register" variant="secondary">
        Back to sign up
      </ButtonLink>
    </PageShell>
  );
}
