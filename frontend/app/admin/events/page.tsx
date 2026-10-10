'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Section,
  Select,
} from '@/app/components/ui';

type AdminEvent = {
  id: string;
  hostId: string;
  title: string;
  date: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled';
  ticketPriceCents: number;
};

type EventPage = {
  items: AdminEvent[];
  total: number;
};

export default function AdminEventsPage() {
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = (await apiGetAuth(
        `/admin/events?pageSize=100&query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`,
      )) as EventPage;
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load events');
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (event: AdminEvent) => {
    const reason = window.prompt('Reason for administrative cancellation');
    if (!reason?.trim()) return;
    setBusyId(event.id);
    try {
      await apiPostAuth(`/admin/events/${event.id}/cancel`, {
        reason: reason.trim(),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancellation failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Section
      title="Events"
      description="Review published, draft, and cancelled gatherings."
    >
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search event title"
          className="min-w-52 flex-1"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="sm:max-w-52"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      <div className="space-y-3">
        {items.map((event) => (
          <Card key={event.id} className="space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-display text-xl font-semibold">{event.title}</div>
                <div className="mt-1 text-xs text-muted">
                  Host {event.hostId} · {new Date(event.date).toLocaleString()}
                </div>
              </div>
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
            <div className="text-xs text-muted">
              Capacity {event.capacity} ·{' '}
              {(event.ticketPriceCents / 100).toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
              })}
            </div>
            {event.status !== 'cancelled' && (
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busyId === event.id}
                onClick={() => void cancel(event)}
              >
                Cancel event
              </Button>
            )}
          </Card>
        ))}
        {items.length === 0 && (
          <EmptyState title="No events found" description="Adjust the search or status filter." />
        )}
      </div>
    </Section>
  );
}
