'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventCtaLinks } from '@/app/components/EventCtaLinks';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type MyApplication = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  status: 'pending' | 'waitlisted' | 'approved' | 'rejected';
  createdAt: string;
  decisionReason?: string | null;
  decidedAt?: string | null;
  waitlistPosition?: number | null;
};

function statusLabel(status: MyApplication['status']) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'waitlisted':
      return 'Waitlisted';
    default:
      return 'Pending review';
  }
}

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGetAuth('/applications/mine');
        if (!mounted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load applications');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <HostLoginPrompt
        title="My applications"
        message="Log in to see your event applications."
      />
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Your events"
        title="My applications"
        description="Track every application, host decision, and ticket from one place."
      />
      {loading && <LoadingState label="Loading applications…" />}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="grid gap-4">
        {items.map((app) => (
          <Card key={app.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <TextLink
                  href={`/events/${app.eventId}`}
                  className="text-lg font-semibold text-foreground no-underline"
                >
                  {app.eventTitle}
                </TextLink>
                <div className="mt-1 text-xs text-muted">
                  Applied {new Date(app.createdAt).toLocaleString()}
                </div>
              </div>
              <Badge
                tone={
                  app.status === 'approved'
                    ? 'success'
                    : app.status === 'waitlisted'
                      ? 'warning'
                      : app.status === 'rejected'
                        ? 'danger'
                        : 'accent'
                }
              >
                {statusLabel(app.status)}
              </Badge>
            </div>
            {app.status === 'waitlisted' && app.waitlistPosition && (
              <div className="text-sm text-muted">
                Waitlist position #{app.waitlistPosition}
              </div>
            )}
            {app.decisionReason && (
              <div className="rounded-xl bg-surface-subtle px-4 py-3 text-sm">
                <span className="font-medium">Host note:</span>{' '}
                {app.decisionReason}
              </div>
            )}
            <EventCtaLinks
              eventId={app.eventId}
              applicationStatus={app.status}
              loggedIn
            />
          </Card>
        ))}
        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="No applications yet"
            description="Explore upcoming gatherings and apply when one feels right."
            action={<TextLink href="/">Browse events</TextLink>}
          />
        )}
      </div>
    </PageShell>
  );
}
