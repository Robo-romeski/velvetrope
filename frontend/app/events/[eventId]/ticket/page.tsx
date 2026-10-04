'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  apiGet,
  apiGetAuth,
  apiPostAuth,
  getApiStatus,
  isUnauthorized,
} from '@/lib/api';
import { EventPageNav } from '@/app/components/EventPageNav';
import QRCode from 'react-qr-code';
import {
  deleteOfflineTicket,
  getOfflineTicket,
  saveOfflineTicket,
} from '@/lib/offline-ticket';
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

type PhotoStatus = {
  required: boolean;
  configured: boolean;
  uploaded: boolean;
  verifiedAt: string | null;
  expiresAt: string | null;
};

export default function EventTicketPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [title, setTitle] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [availableOffline, setAvailableOffline] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [identityRequired, setIdentityRequired] = useState(false);
  const [identityConfigured, setIdentityConfigured] = useState(true);
  const [identityStatus, setIdentityStatus] = useState('not_started');

  const loadTicket = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    const cached = await getOfflineTicket(eventId).catch(() => null);
    if (cached) setAvailableOffline(true);
    if (typeof navigator !== 'undefined' && !navigator.onLine && cached) {
      setTitle(cached.eventTitle);
      setEventDate(cached.eventDate);
      setToken(cached.token);
      setUsingOfflineCopy(true);
      setLoading(false);
      return;
    }
    try {
      let resolvedTitle = cached?.eventTitle ?? null;
      let resolvedEventDate = cached?.eventDate ?? null;
      let requiresIdentity = false;
      try {
        const ev = await apiGet(`/events/${encodeURIComponent(eventId)}`);
        resolvedTitle = ev?.title ?? null;
        resolvedEventDate = ev?.date ?? null;
        setTitle(resolvedTitle);
        setEventDate(resolvedEventDate);
        requiresIdentity = ev?.requireIdentityVerification === true;
        if (ev?.status && ev.status !== 'published') return;
      } catch {
        // Ticket fetch still tries; event title is optional.
      }

      if (requiresIdentity) {
        const identity = await apiGetAuth('/identity/status');
        setIdentityConfigured(identity.configured !== false);
        setIdentityStatus(identity.status ?? 'not_started');
        if (identity.status !== 'approved') {
          setIdentityRequired(true);
          setToken(null);
          return;
        }
      }
      setIdentityRequired(false);

      if (typeof window !== 'undefined') {
        const returnUrl = new URL(window.location.href);
        const sessionId = returnUrl.searchParams.get('session_id');
        if (returnUrl.searchParams.get('paid') === '1' && sessionId) {
          await apiPostAuth(
            `/stripe/checkout/${encodeURIComponent(eventId)}/confirm`,
            { sessionId },
          );
          returnUrl.searchParams.delete('paid');
          returnUrl.searchParams.delete('session_id');
          window.history.replaceState(null, '', returnUrl);
        }
      }

      const payment = await apiGetAuth(
        `/stripe/payment/${encodeURIComponent(eventId)}`,
      ).catch(() => null);
      if (payment?.required && payment.status !== 'paid') {
        setPaymentRequired(true);
        setPaymentAmountCents(Number(payment.amountCents) || 0);
        setToken(null);
        return;
      }
      setPaymentRequired(false);

      const res = await apiPostAuth(`/checkin/mine/${encodeURIComponent(eventId)}`, {});
      const nextToken = res?.token ?? null;
      setToken(nextToken);
      setUsingOfflineCopy(false);
      const photo = await apiGetAuth(
        `/checkin/photo/mine/${encodeURIComponent(eventId)}`,
      ).catch(() => null);
      if (photo) setPhotoStatus(photo as PhotoStatus);
      if (nextToken) {
        await saveOfflineTicket({
          eventId,
          eventTitle: resolvedTitle,
          eventDate: resolvedEventDate,
          token: nextToken,
        });
        setAvailableOffline(true);
      }
    } catch (e) {
      if (cached) {
        setTitle(cached.eventTitle);
        setEventDate(cached.eventDate);
        setToken(cached.token);
        setUsingOfflineCopy(true);
        setPaymentRequired(false);
        setError(null);
        return;
      }
      if (isUnauthorized(e)) {
        setUnauthorized(true);
      } else {
        const message = e instanceof Error ? e.message : 'Failed to load ticket';
        if (getApiStatus(e) === 403) {
          setPaymentRequired(true);
          setError('Complete ticket payment before your QR is issued.');
        } else {
          setError(message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!eventId) return;
    (async () => {
      await loadTicket();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const startCheckout = async () => {
    setPaying(true);
    setError(null);
    try {
      const checkout = await apiPostAuth(
        `/stripe/checkout/${encodeURIComponent(eventId)}`,
        {},
      );
      if (checkout?.url) {
        window.location.href = checkout.url as string;
        return;
      }
      if (checkout?.sessionId) {
        await apiPostAuth(
          `/stripe/checkout/${encodeURIComponent(eventId)}/confirm`,
          { sessionId: checkout.sessionId },
        );
        await loadTicket();
        return;
      }
      setError('Checkout could not be started. Please try again.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setPaying(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    setError(null);
    try {
      const upload = await apiPostAuth(
        `/checkin/photo/mine/${encodeURIComponent(eventId)}/upload`,
        {
          contentType: file.type,
          sizeBytes: file.size,
        },
      );
      const response = await fetch(upload.uploadUrl as string, {
        method: 'PUT',
        headers: upload.headers as Record<string, string>,
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Photo upload failed: ${response.status}`);
      }
      await apiPostAuth(
        `/checkin/photo/mine/${encodeURIComponent(eventId)}/complete`,
        { photoId: upload.photoId },
      );
      const photo = await apiGetAuth(
        `/checkin/photo/mine/${encodeURIComponent(eventId)}`,
      );
      setPhotoStatus(photo as PhotoStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const download = () => {
    const svg = document.querySelector('#ticket-qr-wrap svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'velvetkey-ticket.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (unauthorized) {
    const next = `/events/${encodeURIComponent(eventId)}/ticket`;
    return (
      <PageShell size="narrow" className="space-y-7">
        <EventPageNav eventId={eventId} title={title} />
        <PageHeader
          eyebrow="Your ticket"
          title={title ?? 'Your ticket'}
          description="Log in to show your check-in QR."
        />
        <Card className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={`/auth/login?next=${encodeURIComponent(next)}`}
          >
            Log in
          </ButtonLink>
          <ButtonLink
            href={`/auth/register?next=${encodeURIComponent(next)}`}
            variant="secondary"
          >
            Sign up
          </ButtonLink>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <EventPageNav eventId={eventId} title={title} />
      <PageHeader
        eyebrow="Your ticket"
        title={title ?? 'Your ticket'}
        description={
          eventDate
            ? `${new Date(eventDate).toLocaleString()} · Show this QR at the door.`
            : 'Show this QR at the door.'
        }
      />
      {(!isOnline || usingOfflineCopy) && token && (
        <Alert tone="warning" title="Offline copy">
          Offline copy — host verification still requires their device to be online.
        </Alert>
      )}
      {loading && <LoadingState label="Preparing your ticket…" />}
      {paymentRequired && !token && (
        <Card className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Payment required
          </div>
          <p>
            This event requires a paid ticket (
            {(paymentAmountCents / 100).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            })}
            ) before your check-in QR is issued.
          </p>
          <Button
            type="button"
            onClick={startCheckout}
            disabled={paying}
          >
            {paying ? 'Redirecting…' : 'Pay with Stripe'}
          </Button>
        </Card>
      )}
      {identityRequired && !token && (
        <Card className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Identity verification
          </div>
          <p>
            This event requires approved Persona identity verification before
            your QR ticket can be issued.
          </p>
          <p className="text-sm capitalize text-muted">
            Current status: {identityStatus.replaceAll('_', ' ')}
          </p>
          {identityConfigured ? (
            <ButtonLink href="/identity/verify">
              Verify identity
            </ButtonLink>
          ) : (
            <Alert tone="warning">
              Persona is not configured on this deployment. Contact the host.
            </Alert>
          )}
        </Card>
      )}
      {error && (
        <Alert tone="danger" title={error} role="alert">
          {!paymentRequired && (
            <div className="space-y-2">
              <p>
                Tickets are available after the host approves your application.
              </p>
              <div className="flex flex-wrap gap-3">
                <TextLink href={`/events/${eventId}/apply`}>
                  Apply
                </TextLink>
                <TextLink href="/applications">
                  My applications
                </TextLink>
              </div>
            </div>
          )}
        </Alert>
      )}
      {photoStatus?.required && (
        <Card className="space-y-4 text-sm">
          <h2 className="text-lg font-semibold">Check-in reference photo</h2>
          {!photoStatus.configured ? (
            <Alert tone="warning">
              The host enabled photo check-in, but private photo storage is not
              configured. Contact the host before the event.
            </Alert>
          ) : photoStatus.uploaded ? (
            <Alert tone="success">
              Photo uploaded. The host will compare it visually at check-in.
            </Alert>
          ) : (
            <>
              <p className="text-muted">
                Upload a clear photo of yourself. It is private, available only
                to the event host, and deleted seven days after the event.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                disabled={photoUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
              />
              <p className="text-xs text-muted">
                JPEG, PNG, or WebP; maximum 5 MB.
              </p>
            </>
          )}
          {photoUploading && <p>Uploading…</p>}
        </Card>
      )}
      {token && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col items-center gap-5 p-6 text-center sm:p-8">
            <div
              id="ticket-qr-wrap"
              className="inline-block rounded-2xl bg-white p-5 shadow-sm"
            >
              <QRCode value={token} size={200} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Entry token
              </div>
              <div className="mt-2 break-all font-mono text-xs">{token}</div>
            </div>
            <Button onClick={download} variant="secondary">
              Download QR
            </Button>
          </div>
          {availableOffline && (
            <div className="space-y-2 border-t border-border bg-surface-subtle px-5 py-4 text-xs text-muted">
              <div>
                Available offline on this device until one day after the event.
              </div>
              <button
                type="button"
                onClick={async () => {
                  await deleteOfflineTicket(eventId);
                  setAvailableOffline(false);
                }}
                className="font-medium text-danger underline underline-offset-4"
              >
                Remove offline copy
              </button>
            </div>
          )}
        </Card>
      )}
      {token && <TextLink href="/applications">My applications</TextLink>}
    </PageShell>
  );
}
