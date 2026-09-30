'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetAuth, apiPostAuth } from '@/lib/api';

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Events</h1>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search event title"
          className="border rounded px-3 py-2 bg-transparent flex-1 min-w-52"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="border rounded px-3 py-2 bg-transparent"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((event) => (
          <div key={event.id} className="border rounded p-3 text-sm space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="text-xs text-gray-500">
                  Host {event.hostId} · {new Date(event.date).toLocaleString()}
                </div>
              </div>
              <span className="capitalize">{event.status}</span>
            </div>
            <div className="text-xs text-gray-500">
              Capacity {event.capacity} ·{' '}
              {(event.ticketPriceCents / 100).toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
              })}
            </div>
            {event.status !== 'cancelled' && (
              <button
                type="button"
                disabled={busyId === event.id}
                onClick={() => void cancel(event)}
                className="px-2 py-1 border border-red-600 text-red-700 dark:text-red-400 rounded disabled:opacity-50"
              >
                Cancel event
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No events found.</p>
        )}
      </div>
    </div>
  );
}
