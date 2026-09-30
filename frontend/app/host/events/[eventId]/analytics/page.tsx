'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';

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

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="border rounded p-3 space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {detail && (
        <div className="text-xs text-gray-500">{detail}</div>
      )}
    </div>
  );
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
    return <div className="max-w-4xl mx-auto p-6 text-sm">Loading…</div>;
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Event analytics" />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <HostEventNav eventId={eventId} />
      <div>
        <h1 className="text-2xl font-semibold">
          {analytics?.event.title ?? 'Event analytics'}
        </h1>
        {analytics && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(analytics.event.date).toLocaleString()} ·{' '}
            {analytics.event.status}
          </p>
        )}
      </div>

      {loading && <div className="text-sm">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {analytics && (
        <>
          <section className="space-y-2">
            <h2 className="font-semibold">Funnel</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric label="Invites" value={analytics.invites.total} />
              <Metric
                label="Applications"
                value={analytics.applications.total}
                detail={`${percentage(analytics.funnel.inviteToApplicationRate)} of invites`}
              />
              <Metric
                label="Approved"
                value={analytics.applications.approved}
                detail={`${percentage(analytics.funnel.approvalRate)} of applications`}
              />
              <Metric
                label="Checked in"
                value={analytics.checkin.checkedIn}
                detail={`${percentage(analytics.funnel.attendanceRate)} of issued tickets`}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Applications</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric label="Pending" value={analytics.applications.pending} />
              <Metric
                label="Waitlisted"
                value={analytics.applications.waitlisted}
              />
              <Metric label="Approved" value={analytics.applications.approved} />
              <Metric label="Rejected" value={analytics.applications.rejected} />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Attendance and revenue</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric
                label="Tickets issued"
                value={analytics.checkin.ticketsIssued}
              />
              <Metric
                label="Checked in"
                value={analytics.checkin.checkedIn}
              />
              <Metric
                label="Gross revenue"
                value={money(analytics.payments.grossRevenueCents)}
                detail={
                  analytics.payments.required
                    ? `${analytics.payments.paid} paid`
                    : 'Free event'
                }
              />
              <Metric
                label="Capacity"
                value={`${analytics.applications.approved}/${analytics.event.capacity}`}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
