'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { EventCtaLinks } from '@/app/components/EventCtaLinks';
import { useMyApplicationByEvent } from '@/lib/my-applications';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  LoadingState,
  PageShell,
  Section,
  TextLink,
} from '@/app/components/ui';

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
  const { getStatus, loading: appsLoading, loggedIn } = useMyApplicationByEvent();

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
    <PageShell size="wide" className="space-y-10 sm:space-y-12">
      <section className="grid overflow-hidden rounded-card border border-border bg-surface-subtle lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.8fr)]">
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Curated gatherings
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
            Find the room where you belong.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Thoughtful, invite-led events built around trust, shared
            expectations, and memorable company.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink href="#upcoming-events">Browse events</ButtonLink>
            <ButtonLink
              href="/auth/register?next=%2Fhost%2Fevents&host=1"
              variant="secondary"
            >
              Host a gathering
            </ButtonLink>
            {loggedIn && (
              <TextLink href="/applications" className="sm:ml-2">
                My applications
              </TextLink>
            )}
          </div>
        </div>
        <aside className="border-t border-border bg-surface p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            The VelvetKey standard
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-[-0.025em]">
            Intentional rooms. Clear expectations. Discreet arrival.
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Every gathering is host-reviewed and supported by secure, private
            access from application to check-in.
          </p>
          <dl className="mt-7 grid grid-cols-2 gap-5 border-t border-border pt-5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Applications
              </dt>
              <dd className="mt-1 text-sm font-medium">Host reviewed</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Entry
              </dt>
              <dd className="mt-1 text-sm font-medium">Secure ticket</dd>
            </div>
          </dl>
        </aside>
      </section>
      <dl
        id="how-it-works"
        className="grid scroll-mt-28 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            01
          </div>
          <dt className="mt-3 text-sm font-semibold">Invite-led</dt>
          <dd className="mt-1 text-sm leading-6 text-muted">
            Private codes keep each gathering intentional.
          </dd>
        </div>
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            02
          </div>
          <dt className="mt-3 text-sm font-semibold">Host-reviewed</dt>
          <dd className="mt-1 text-sm leading-6 text-muted">
            Applications help hosts build the right room.
          </dd>
        </div>
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            03
          </div>
          <dt className="mt-3 text-sm font-semibold">Ready at the door</dt>
          <dd className="mt-1 text-sm leading-6 text-muted">
            Secure tickets make arrival simple and discreet.
          </dd>
        </div>
      </dl>
      {loading && <LoadingState label="Finding upcoming events…" />}
      {error && (
        <Alert tone="danger" title="Events are temporarily unavailable" role="alert">
          <p>
            Check your connection and refresh the page.
          </p>
        </Alert>
      )}
      <div id="upcoming-events" className="scroll-mt-28">
        <Section
          title="A considered selection."
          description="Gatherings currently accepting applications."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => {
              const date = new Date(event.date);
              return (
                <Card
                  key={event.id}
                  className="group flex min-h-64 flex-col justify-between gap-6 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-xl bg-surface-subtle px-3 py-2 text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                          {date.toLocaleDateString(undefined, {
                            month: 'short',
                          })}
                        </div>
                        <div className="text-xl font-semibold">
                          {date.toLocaleDateString(undefined, {
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="text-right text-xs leading-5 text-muted">
                        {date.toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        <br />
                        {event.capacity} places
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <TextLink
                          href={`/events/${event.id}`}
                          className="text-xl font-semibold tracking-[-0.025em] text-foreground !no-underline"
                        >
                          {event.title}
                        </TextLink>
                        <Badge tone="accent">
                          {event.status === 'published'
                            ? 'Applications open'
                            : event.status}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {!appsLoading && (
                    <EventCtaLinks
                      eventId={event.id}
                      applicationStatus={getStatus(event.id)}
                      loggedIn={loggedIn}
                    />
                  )}
                </Card>
              );
            })}
          </div>
          {!loading && !error && events.length === 0 && (
            <EmptyState
              title="No published events yet"
              description="New gatherings will appear here as soon as hosts open them."
            />
          )}
        </Section>
      </div>
    </PageShell>
  );
}
