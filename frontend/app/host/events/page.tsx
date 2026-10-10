'use client';

import { useEffect, useState } from 'react';
import { apiDeleteAuth, apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  LoadingState,
  MetricTile,
  PageHeader,
  PageShell,
  Select,
  TextLink,
} from '@/app/components/ui';

type HostEvent = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled';
  isDiscoveryVisible: boolean;
  approvedCount: number;
  pendingCount: number;
};

type HostSummary = {
  events: number;
  publishedEvents: number;
  applications: number;
  approved: number;
  waitlisted: number;
  grossRevenueCents: number;
  ticketsIssued: number;
  checkedIn: number;
};

export default function HostEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | HostEvent['status']>('all');
  const [summary, setSummary] = useState<HostSummary | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const [eventsData, summaryData] = await Promise.all([
        apiGetAuth('/events/mine'),
        apiGetAuth('/analytics/host/summary'),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setSummary(summaryData as HostSummary);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Load failed';
      if (isUnauthorized(e)) {
        setUnauthorized(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEvents([]);
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, user]);

  const setStatus = async (id: string, action: 'publish' | 'cancel') => {
    if (action === 'cancel' && !window.confirm('Cancel this event?')) return;
    try {
      await apiPostAuth(`/events/${id}/${action}`, {});
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await apiDeleteAuth(`/events/${id}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const visible = events.filter(
    (event) => statusFilter === 'all' || event.status === statusFilter,
  );

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Host dashboard" />;
  }

  return (
    <PageShell size="wide" className="space-y-7">
      <section className="rounded-card border border-border bg-surface-subtle p-6 sm:p-8">
        <PageHeader
          eyebrow="Host workspace"
          title="Your events"
          description="Create memorable gatherings and manage every guest touchpoint."
          actions={
            <ButtonLink href="/host/events/new">
              New event
            </ButtonLink>
          }
        />
        {summary && (
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile label="Events" value={summary.events} />
            <MetricTile label="Applications" value={summary.applications} />
            <MetricTile label="Waitlisted" value={summary.waitlisted} />
            <MetricTile
              label="Gross revenue"
              value={(summary.grossRevenueCents / 100).toLocaleString(
                undefined,
                {
                  style: 'currency',
                  currency: 'USD',
                },
              )}
            />
          </div>
        )}
      </section>
      {loading && <LoadingState label="Loading host workspace…" />}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            Event portfolio
          </h2>
          <p className="mt-1 text-sm text-muted">
            Manage status, guests, invitations, and check-in.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Status</span>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="min-w-36 py-2"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((event) => (
          <Card key={event.id} className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em]">
                  {event.title}
                </h3>
                <div className="mt-1 text-xs text-muted">
                  {new Date(event.date).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {!event.isDiscoveryVisible && (
                  <Badge tone="neutral">Hidden from discovery</Badge>
                )}
                <Badge
                  tone={
                    event.status === 'published'
                      ? 'success'
                      : event.status === 'cancelled'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {event.status}
                </Badge>
              </div>
            </div>
            {event.description && (
              <p className="line-clamp-2 text-sm leading-6 text-muted">
                {event.description}
              </p>
            )}
            <div className="flex gap-6 border-y border-border py-4 text-sm">
              <div>
                <div className="text-xs text-muted">Approved</div>
                <div className="mt-1 font-semibold">
                  {event.approvedCount}/{event.capacity}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Pending</div>
                <div className="mt-1 font-semibold">{event.pendingCount}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
              <ButtonLink
                href={`/host/events/${event.id}/applications`}
                size="sm"
              >
                Manage guests
              </ButtonLink>
              <TextLink href={`/host/events/${event.id}/edit`}>Edit</TextLink>
              <TextLink href={`/host/events/${event.id}/invites`}>
                Invites
              </TextLink>
              <TextLink href={`/host/events/${event.id}/scan`}>
                Check-in
              </TextLink>
              <TextLink href={`/host/events/${event.id}/analytics`}>
                Analytics
              </TextLink>
              <TextLink href={`/host/events/${event.id}/form`}>Form</TextLink>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {event.status === 'draft' && (
                <Button
                  onClick={() => setStatus(event.id, 'publish')}
                  variant="secondary"
                  size="sm"
                >
                  Publish
                </Button>
              )}
              {event.status !== 'cancelled' && (
                <Button
                  onClick={() => setStatus(event.id, 'cancel')}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => remove(event.id)}
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft"
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {!loading && visible.length === 0 && (
          <div className="lg:col-span-2">
            <EmptyState
              title="No events here yet"
              description="Create your first event or change the status filter."
              action={
                <ButtonLink href="/host/events/new" size="sm">
                  Create event
                </ButtonLink>
              }
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
