'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { EventCtaLinks } from '@/app/components/EventCtaLinks';
import { EventPageNav } from '@/app/components/EventPageNav';
import { useMyApplicationByEvent } from '@/lib/my-applications';

type EventDetail = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  capacity: number;
  status: string;
};

export default function EventDetailPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getStatus, loading: appsLoading, loggedIn } = useMyApplicationByEvent();

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(`/events/${encodeURIComponent(eventId)}`);
        if (!mounted) return;
        setEvent(data as EventDetail);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Event not found');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const applicationStatus = getStatus(eventId);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <EventPageNav eventId={eventId} title={event?.title} />
      {loading && <div className="text-sm">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {event && (
        <>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
          )}
          <div className="text-xs text-gray-500">
            {new Date(event.date).toLocaleString()} · capacity {event.capacity}
          </div>
          {event.status !== 'published' && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This event is not open for applications ({event.status}).
            </p>
          )}
          {!appsLoading && (
            <EventCtaLinks
              eventId={eventId}
              applicationStatus={applicationStatus}
              loggedIn={loggedIn}
            />
          )}
          {loggedIn && (
            <p className="text-xs text-gray-500">
              Need your status?{' '}
              <Link href="/applications" className="underline">
                My applications
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
