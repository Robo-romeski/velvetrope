'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiDeleteAuth, apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { useAuth } from '@/lib/auth';

type HostEvent = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled';
  approvedCount: number;
  pendingCount: number;
};

export default function HostEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | HostEvent['status']>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const data = await apiGetAuth('/events/mine');
      setEvents(Array.isArray(data) ? data : []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Host dashboard" />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your events</h1>
        <Link href="/host/events/new" className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
          New event
        </Link>
      </div>
      {loading && <div className="text-sm">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex items-center gap-2 text-sm">
        <span>Status</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="border rounded px-2 py-1 bg-transparent"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="space-y-3">
        {visible.map((event) => (
          <div key={event.id} className="border rounded p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{event.title}</div>
              <span className="text-xs uppercase tracking-wide text-gray-500">{event.status}</span>
            </div>
            {event.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{event.description}</div>
            )}
            <div className="text-xs text-gray-500">
              {new Date(event.date).toLocaleString()} · {event.approvedCount}/{event.capacity} approved
              {event.pendingCount ? ` · ${event.pendingCount} pending` : ''}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {event.status === 'draft' && (
                <button onClick={() => setStatus(event.id, 'publish')} className="text-blue-600 underline">
                  Publish
                </button>
              )}
              {event.status !== 'cancelled' && (
                <button onClick={() => setStatus(event.id, 'cancel')} className="text-blue-600 underline">
                  Cancel
                </button>
              )}
              <Link className="text-blue-600 underline" href={`/host/events/${event.id}/edit`}>
                Edit
              </Link>
              <button onClick={() => remove(event.id)} className="text-red-600 underline">
                Delete
              </button>
              <Link className="text-blue-600 underline" href={`/host/events/${event.id}/form`}>
                Form
              </Link>
              <Link className="text-blue-600 underline" href={`/host/events/${event.id}/invites`}>
                Invites
              </Link>
              <Link className="text-blue-600 underline" href={`/host/events/${event.id}/applications`}>
                Applications
              </Link>
              <Link className="text-blue-600 underline" href={`/host/events/${event.id}/scan`}>
                Check-in
              </Link>
            </div>
          </div>
        ))}
        {!loading && visible.length === 0 && (
          <div className="text-sm text-gray-500">No events yet. Create one to get started.</div>
        )}
      </div>
    </div>
  );
}
