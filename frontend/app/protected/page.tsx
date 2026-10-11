'use client';

import { useAuth } from '@/lib/auth';
import {
  Alert,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

export default function ProtectedPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Private area"
          title="Protected"
          description="Log in to view this diagnostic page."
        />
        <Alert tone="info">
          This page is available only to authenticated members.
        </Alert>
        <TextLink href="/auth/login?next=%2Fprotected">Log in</TextLink>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Private area"
        title="Protected"
        description={`Signed in as ${user.email}.`}
      />
      <Card>
        <pre className="w-full overflow-auto border border-border bg-surface-subtle p-3 text-xs">
          {JSON.stringify(user, null, 2)}
        </pre>
      </Card>
    </PageShell>
  );
}
