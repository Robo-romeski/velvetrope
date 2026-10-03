'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import {
  Alert,
  Badge,
  LoadingState,
  MetricTile,
  PageHeader,
  PageShell,
  Section,
} from '@/app/components/ui';

type EventAnalytics = {
  event: {
    title: string;
    status: string;
    date: string;
    capacity: number;
    ticketPriceCents: number;
  };
  invites: {
    total: number;
    redeemed: number;
    unused: number;
    expiredUnused: number;
    conversionRate: number;
  };
  applications: {
    total: number;
    pending: number;
    waitlisted: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
  payments: {
    required: boolean;
    pending: number;
    paid: number;
    failed: number;
    grossRevenueCents: number;
  };
  checkin: {
    ticketsIssued: number;
    checkedIn: number;
    attendanceRate: number;
  };
  funnel: {
    inviteToApplicationRate: number;
    approvalRate: number;
    attendanceRate: number;
  };
};

function percentage(value: number): string {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

function money(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

export default function EventAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !eventId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGetAuth(
          `/analytics/event/${encodeURIComponent(eventId)}`,
        );
        if (!mounted) return;
        setAnalytics(data as EventAnalytics);
      } catch (e) {
        if (!mounted) return;
        if (isUnauthorized(e)) {
          setUnauthorized(true);
        } else {
          setError(
            e instanceof Error ? e.message : 'Could not load analytics',
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, eventId, user]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Event analytics" />;
  }

  return (
    <PageShell size="wide" className="space-y-8">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Performance"
        title={analytics?.event.title ?? 'Event analytics'}
        description={
          analytics
            ? new Date(analytics.event.date).toLocaleString()
            : 'Understand the path from invite to attendance.'
        }
        actions={
          analytics ? (
            <Badge
              tone={analytics.event.status === 'published' ? 'success' : 'neutral'}
            >
              {analytics.event.status}
            </Badge>
          ) : undefined
        }
      />

      {loading && <LoadingState label="Calculating event metrics…" />}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}

      {analytics && (
        <>
          <Section
            title="Guest funnel"
            description="Conversion from invite through arrival."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Invites" value={analytics.invites.total} />
              <MetricTile
                label="Applications"
                value={analytics.applications.total}
                detail={`${percentage(analytics.funnel.inviteToApplicationRate)} of invites`}
              />
              <MetricTile
                label="Approved"
                value={analytics.applications.approved}
                detail={`${percentage(analytics.funnel.approvalRate)} of applications`}
              />
              <MetricTile
                label="Checked in"
                value={analytics.checkin.checkedIn}
                detail={`${percentage(analytics.funnel.attendanceRate)} of issued tickets`}
              />
            </div>
          </Section>

          <Section title="Applications">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Pending" value={analytics.applications.pending} />
              <MetricTile
                label="Waitlisted"
                value={analytics.applications.waitlisted}
              />
              <MetricTile label="Approved" value={analytics.applications.approved} />
              <MetricTile label="Rejected" value={analytics.applications.rejected} />
            </div>
          </Section>

          <Section title="Attendance and revenue">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile
                label="Tickets issued"
                value={analytics.checkin.ticketsIssued}
              />
              <MetricTile
                label="Checked in"
                value={analytics.checkin.checkedIn}
              />
              <MetricTile
                label="Gross revenue"
                value={money(analytics.payments.grossRevenueCents)}
                detail={
                  analytics.payments.required
                    ? `${analytics.payments.paid} paid`
                    : 'Free event'
                }
              />
              <MetricTile
                label="Capacity"
                value={`${analytics.applications.approved}/${analytics.event.capacity}`}
              />
            </div>
          </Section>
        </>
      )}
    </PageShell>
  );
}
