'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type PublicEvent = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  capacity: number;
  status: string;
};

export default function Home() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet('/events');
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load events');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upcoming events</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Invite-only gatherings. Apply with a code, then bring your ticket.
        </p>
      </div>
      {loading && <div className="text-sm">Loading…</div>}
      {error && (
        <div className="text-sm text-red-600">
          {error}. Is the API running on localhost:3010?
        </div>
      )}
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="border rounded p-4 space-y-2">
            <div className="font-medium">{event.title}</div>
            {event.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{event.description}</div>
            )}
            <div className="text-xs text-gray-500">
              {new Date(event.date).toLocaleString()} · capacity {event.capacity}
            </div>
            <div className="flex gap-3 text-sm">
              <Link className="text-blue-600 underline" href={`/events/${event.id}/apply`}>
                Apply
              </Link>
              <Link className="text-blue-600 underline" href={`/events/${event.id}/ticket`}>
                Ticket
              </Link>
            </div>
          </div>
        ))}
        {!loading && !error && events.length === 0 && (
          <div className="text-sm text-gray-500">No published events yet.</div>
        )}
      </div>
    </div>
  );
}
