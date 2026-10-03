'use client';

import { usePathname } from 'next/navigation';
import {
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

export default function HostLoginPrompt({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  const pathname = usePathname();
  const next = pathname?.startsWith('/') ? pathname : '/';
  const isHostPage = next.startsWith('/host/');
  const loginHref = `/auth/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/auth/register?next=${encodeURIComponent(next)}${
    isHostPage ? '&host=1' : ''
  }`;

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader
        eyebrow={isHostPage ? 'Host access' : 'Member access'}
        title={title}
        description={
          message ??
          (isHostPage
            ? 'Log in with a host account to continue.'
            : 'Log in to continue.')
        }
      />
      <Card className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={loginHref}>Log in</ButtonLink>
        <ButtonLink href={registerHref} variant="secondary">
          Sign up
        </ButtonLink>
      </Card>
    </PageShell>
  );
}
