'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { EventCtaLinks } from '@/app/components/EventCtaLinks';
import { EventPageNav } from '@/app/components/EventPageNav';
import { useMyApplicationByEvent } from '@/lib/my-applications';
import {
  Alert,
  ButtonLink,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

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
  const [eventStarted, setEventStarted] = useState(false);
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
        setEventStarted(
          !!data?.date && new Date(data.date).getTime() <= Date.now(),
        );
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
    <PageShell className="space-y-7">
      <EventPageNav eventId={eventId} title={event?.title} />
      {loading && <LoadingState label="Opening event…" />}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      {event && (
        <Card className="space-y-7 p-6 sm:p-8">
          <PageHeader
            eyebrow="Private gathering"
            title={event.title}
            description={event.description}
          />
          <div className="grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Date and time
              </div>
              <div className="mt-1 font-medium">
                {new Date(event.date).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Capacity
              </div>
              <div className="mt-1 font-medium">{event.capacity} guests</div>
            </div>
          </div>
          {event.status !== 'published' && (
            <Alert tone="warning">
              This event is not open for applications ({event.status}).
            </Alert>
          )}
          {!appsLoading && (
            <div className="space-y-4">
              <EventCtaLinks
                eventId={eventId}
                applicationStatus={applicationStatus}
                loggedIn={loggedIn}
              />
              {applicationStatus === 'approved' && (
                <div className="flex flex-wrap gap-2">
                  <ButtonLink
                    href={`/events/${eventId}/chat`}
                    variant="secondary"
                    size="sm"
                  >
                    Event chat
                  </ButtonLink>
                  {eventStarted && (
                    <ButtonLink
                      href={`/events/${eventId}/feedback`}
                      variant="secondary"
                      size="sm"
                    >
                      Leave feedback
                    </ButtonLink>
                  )}
                </div>
              )}
            </div>
          )}
          {loggedIn && (
            <p className="text-xs text-muted">
              Need your status?{' '}
              <TextLink href="/applications">
                My applications
              </TextLink>
            </p>
          )}
        </Card>
      )}
    </PageShell>
  );
}
