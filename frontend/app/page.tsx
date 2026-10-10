'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { EventCtaLinks } from '@/app/components/EventCtaLinks';
import { useMyApplicationByEvent } from '@/lib/my-applications';
import {
  Alert,
  ButtonLink,
  EmptyState,
  LoadingState,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type PublicEvent = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  capacity: number;
};

type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  memberCount: number;
};

type LearnItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  contentType: string;
  tags: string[];
  publishedAt?: string | null;
};

const formatMonth = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short' });

const formatDay = (date: Date) =>
  date.toLocaleDateString(undefined, { day: '2-digit' });

export default function Home() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [learning, setLearning] = useState<LearnItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getStatus, loading: appsLoading, loggedIn } =
    useMyApplicationByEvent();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [eventResult, groupResult, learnResult] = await Promise.allSettled([
        apiGet('/events'),
        apiGet('/groups'),
        apiGet('/learn'),
      ]);
      if (!mounted) return;
      if (eventResult.status === 'fulfilled') {
        setEvents(Array.isArray(eventResult.value) ? eventResult.value : []);
      } else {
        setError('Gatherings are temporarily unavailable.');
      }
      if (groupResult.status === 'fulfilled') {
        setGroups(Array.isArray(groupResult.value) ? groupResult.value : []);
      }
      if (learnResult.status === 'fulfilled') {
        setLearning(Array.isArray(learnResult.value) ? learnResult.value : []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const featured = events[0];
  const remainingEvents = events.slice(1);

  return (
    <PageShell size="wide" className="space-y-16 sm:space-y-24">
      <section id="about" className="grid gap-8 border-b border-border pb-12 lg:grid-cols-[1.45fr_0.55fr] lg:gap-16 lg:pb-16">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
            The community journal · Autumn 2026
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.5rem]">
            More honest ways to gather, learn, and relate.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
            epicsexual is an independent community for adults exploring or
            practicing ethical non-monogamy. Read practical guidance, join
            topic-led conversation, and apply to private gatherings held with
            clear expectations.
          </p>
        </div>
        <div className="flex flex-col justify-between border-t-2 border-highlight pt-5 lg:mt-12">
          <p className="font-display text-xl leading-7">
            Not a dating feed. A quieter place to build language, confidence,
            and real community.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/auth/register">Join the community</ButtonLink>
            <TextLink href="/trust/code-of-conduct">Read our standards</TextLink>
          </div>
        </div>
      </section>

      <section id="gatherings" className="scroll-mt-28">
        <div className="mb-7 flex items-end justify-between gap-6 border-b border-border pb-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
              Gatherings
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Invitations to be present
            </h2>
          </div>
          <TextLink href="/auth/register?next=%2Fhost%2Fevents&host=1">
            Host a gathering
          </TextLink>
        </div>

        {loading && <LoadingState label="Opening the journal…" />}
        {error && (
          <Alert tone="danger" role="alert">
            {error} Check your connection and refresh the page.
          </Alert>
        )}
        {!loading && !error && !featured && (
          <EmptyState
            title="No gatherings are open today"
            description="Hosts publish new invitations here when applications open."
          />
        )}
        {featured && (
          <article className="grid overflow-hidden border border-border bg-surface lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative min-h-72 border-b border-border lg:min-h-[31rem] lg:border-b-0 lg:border-r">
              <Image
                src="/epicsexual-editorial-gathering.jpg"
                alt="An intimate salon prepared with an empty circle of chairs, a warm lamp, and invitations"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              <span className="absolute bottom-0 left-0 bg-background px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">
                An illustration of the rooms we hold
              </span>
            </div>
            <div className="flex flex-col justify-between p-6 sm:p-10">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
                  Featured invitation
                </p>
                <div className="mt-6 flex items-start gap-5 border-y border-border py-5">
                  <div className="min-w-16 text-center">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      {formatMonth(new Date(featured.date))}
                    </div>
                    <div className="font-display text-5xl leading-none">
                      {formatDay(new Date(featured.date))}
                    </div>
                  </div>
                  <div className="border-l border-border pl-5">
                    <h3 className="font-display text-3xl font-semibold leading-tight">
                      {featured.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {new Date(featured.date).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      · {featured.capacity} places · Application required
                    </p>
                  </div>
                </div>
                {featured.description && (
                  <p className="mt-6 max-w-xl text-base leading-7 text-muted">
                    {featured.description}
                  </p>
                )}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {!appsLoading && (
                  <EventCtaLinks
                    eventId={featured.id}
                    applicationStatus={getStatus(featured.id)}
                    loggedIn={loggedIn}
                  />
                )}
                <TextLink href={`/events/${featured.id}`}>Full invitation</TextLink>
              </div>
            </div>
          </article>
        )}

        {remainingEvents.length > 0 && (
          <div className="border-b border-border">
            {remainingEvents.map((event) => {
              const date = new Date(event.date);
              return (
                <article
                  key={event.id}
                  className="grid gap-5 border-t border-border py-7 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex items-baseline gap-2 sm:block">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      {formatMonth(date)}
                    </span>
                    <span className="font-display text-3xl leading-none sm:block">
                      {formatDay(date)}
                    </span>
                  </div>
                  <div>
                    <Link
                      href={`/events/${event.id}`}
                      className="font-display text-2xl font-semibold hover:text-accent"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {date.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      · {event.capacity} places
                    </p>
                  </div>
                  {!appsLoading && (
                    <EventCtaLinks
                      eventId={event.id}
                      applicationStatus={getStatus(event.id)}
                      loggedIn={loggedIn}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-surface-subtle px-5 py-10 sm:px-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[0.58fr_1.42fr]">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
              Conversation
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              Start with the subject, not the profile.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Public topic previews show what a group is for. Sign in to enter
              the room, read posts, or take part.
            </p>
            <TextLink href="/community" className="mt-6 inline-block">
              Browse all conversations
            </TextLink>
          </div>
          <div className="border-t border-foreground/30">
            {groups.slice(0, 3).map((group, index) => {
              const path = `/community/groups/${group.slug}`;
              const href = loggedIn
                ? path
                : `/auth/login?next=${encodeURIComponent(path)}`;
              return (
                <article
                  key={group.id}
                  className="grid gap-3 border-b border-foreground/30 py-5 sm:grid-cols-[2rem_1fr_auto]"
                >
                  <span className="font-display text-lg text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                        {group.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      {group.memberCount}{' '}
                      {group.memberCount === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <Link href={href} className="self-start text-sm font-semibold text-accent underline-offset-4 hover:underline">
                    {loggedIn ? 'Enter topic' : 'Preview and join'}
                  </Link>
                </article>
              );
            })}
            {!loading && groups.length === 0 && (
              <p className="border-b border-foreground/30 py-6 text-sm text-muted">
                No public topics have been published yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
              Learning
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Notes for doing this with more care
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">
              Published guides and courses from community educators. Catalog
              details are public; full lessons may require an account or
              purchase.
            </p>
            <TextLink href="/learn" className="mt-6 inline-block">
              Open the learning library
            </TextLink>
          </div>
          <div className="border-t-2 border-highlight">
            {learning.slice(0, 4).map((item) => (
              <article
                key={item.id}
                className="grid gap-3 border-b border-border py-5 sm:grid-cols-[7rem_1fr_auto] sm:items-start"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {item.contentType}
                </div>
                <div>
                  <Link
                    href={`/learn/${item.slug}`}
                    className="font-display text-xl font-semibold hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                      {item.summary}
                    </p>
                  )}
                  {item.tags.length > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      {item.tags.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>
                {item.publishedAt && (
                  <time className="text-xs text-muted" dateTime={item.publishedAt}>
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                )}
              </article>
            ))}
            {!loading && learning.length === 0 && (
              <p className="border-b border-border py-6 text-sm text-muted">
                No learning pieces have been published yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-y border-border py-10 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
            How access works
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold">
            Public context first. Private participation by design.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            You can review gathering invitations, topic summaries, learning
            titles, and our conduct standards before joining. Applications,
            group posts, tickets, identity checks, and member details stay
            behind the appropriate account and permission controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {loggedIn ? (
            <ButtonLink href="/applications">My applications</ButtonLink>
          ) : (
            <ButtonLink href="/auth/register">Join epicsexual</ButtonLink>
          )}
          <ButtonLink href="/trust/code-of-conduct" variant="secondary">
            Code of conduct
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
