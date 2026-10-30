import Link from 'next/link';
import {
  Alert,
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

export default function TermsPage() {
  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow={`Version ${process.env.NEXT_PUBLIC_TERMS_VERSION ?? '2026-10-30'}`}
        title="Terms of service"
        description="The agreement between you and epicsexual for using this community platform."
      />
      <Alert tone="warning">
        <strong>Draft placeholder.</strong> Final terms must be supplied by the
        platform operator before a public pilot. Do not treat this page as legal
        advice.
      </Alert>
      <Card className="p-6 sm:p-8">
        <div className="vk-prose space-y-4 text-sm leading-7 text-muted">
          <p>
            epicsexual is an adults-only community for learning, conversation,
            and private gatherings related to ethical non-monogamy and related
            topics. By creating an account you confirm that you are at least 18
            years old and agree to follow our{' '}
            <TextLink href="/trust/code-of-conduct">code of conduct</TextLink>.
          </p>
          <p>
            Hosts are responsible for their gatherings, guest selection, and
            compliance with applicable laws. The platform provides tools for
            invitations, applications, and check-in; it does not guarantee
            attendee compatibility or venue safety.
          </p>
          <p>
            Contact{' '}
            <Link href="/contact" className="text-accent">
              platform support
            </Link>{' '}
            for questions about these terms.
          </p>
        </div>
      </Card>
      <ButtonLink href="/auth/register" variant="secondary">
        Back to sign up
      </ButtonLink>
    </PageShell>
  );
}
