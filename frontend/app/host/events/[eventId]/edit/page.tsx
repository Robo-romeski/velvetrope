'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatchAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditHostEventPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [ticketPriceUsd, setTicketPriceUsd] = useState('0');
  const [requirePhotoCheckin, setRequirePhotoCheckin] = useState(false);
  const [requireIdentityVerification, setRequireIdentityVerification] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || authLoading || !user) return;
    let mounted = true;
    (async () => {
      try {
        const event = await apiGet(`/events/${encodeURIComponent(eventId)}`);
        if (!mounted) return;
        setTitle(event.title ?? '');
        setDescription(event.description ?? '');
        setDate(toLocalInput(event.date));
        setCapacity(event.capacity ?? 20);
        const cents = Number(event.ticketPriceCents ?? 0);
        setTicketPriceUsd(Number.isFinite(cents) ? (cents / 100).toFixed(2) : '0');
        setRequirePhotoCheckin(event.requirePhotoCheckin === true);
        setRequireIdentityVerification(
          event.requireIdentityVerification === true,
        );
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load event');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId, authLoading, user]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="Edit event" />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPatchAuth(`/events/${encodeURIComponent(eventId)}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        capacity: Number(capacity),
        ticketPriceCents: Math.max(
          0,
          Math.round(Number.parseFloat(ticketPriceUsd || '0') * 100),
        ),
        requirePhotoCheckin,
        requireIdentityVerification,
      });
      router.push('/host/events');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed';
      if (isUnauthorized(e)) {
        setError('Log in as a host to edit events.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell className="space-y-7">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Event settings"
        title="Edit event"
        description="Keep the guest-facing details, ticket settings, and check-in requirements current."
      />
      {loading && <LoadingState label="Loading event settings…" />}
      {!loading && error && !title && (
        <Alert tone="danger" role="alert">
          <p>{error}</p>
          <TextLink href="/host/events" className="mt-2 inline-block">
            Back to events
          </TextLink>
        </Alert>
      )}
      {!loading && !(!title && error) && (
        <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <label className="block text-sm space-y-1">
            <span>Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="vk-field"
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="vk-field"
              rows={3}
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Date</span>
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="vk-field"
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Capacity</span>
            <input
              required
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="vk-field"
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Ticket price (USD)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={ticketPriceUsd}
              onChange={(e) => setTicketPriceUsd(e.target.value)}
              className="vk-field"
            />
            <span className="text-xs text-muted">0 = free. Requires Stripe Connect for paid tickets.</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-sm">
            <input
              type="checkbox"
              checked={requirePhotoCheckin}
              onChange={(event) => setRequirePhotoCheckin(event.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              Require an attendee reference photo at check-in
              <span className="block text-xs text-muted">
                Hosts manually compare the attendee to a private photo. Photos
                expire seven days after the event.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-sm">
            <input
              type="checkbox"
              checked={requireIdentityVerification}
              onChange={(event) =>
                setRequireIdentityVerification(event.target.checked)
              }
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              Require Persona identity verification before ticket issuance
              <span className="block text-xs text-muted">
                Attendees may apply first, but must be approved by Persona
                before receiving their QR ticket.
              </span>
            </span>
          </label>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <ButtonLink href="/host/events" variant="secondary">
              Cancel
            </ButtonLink>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
        </Card>
      )}
    </PageShell>
  );
}
