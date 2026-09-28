'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import { EventPageNav } from '@/app/components/EventPageNav';
import QRCode from 'react-qr-code';
import {
  deleteOfflineTicket,
  getOfflineTicket,
  saveOfflineTicket,
} from '@/lib/offline-ticket';

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
      try {
        const ev = await apiGet(`/events/${encodeURIComponent(eventId)}`);
        resolvedTitle = ev?.title ?? null;
        resolvedEventDate = ev?.date ?? null;
        setTitle(resolvedTitle);
        setEventDate(resolvedEventDate);
        if (ev?.status && ev.status !== 'published') return;
      } catch {
        // Ticket fetch still tries; event title is optional.
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
        if (message.includes('403')) {
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
      setError(
        'Checkout URL was not returned. Ask the host to confirm Stripe is configured, or retry in test mode.',
      );
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
    return (
      <div className="max-w-xl mx-auto p-6 space-y-3">
        <EventPageNav eventId={eventId} title={title} />
        <h1 className="text-2xl font-semibold">{title ?? 'Your ticket'}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Log in to show your check-in QR.
        </p>
        <div className="flex gap-3">
          <Link href="/auth/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
            Login
          </Link>
          <Link href="/auth/register" className="inline-block px-4 py-2 border rounded">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <EventPageNav eventId={eventId} title={title} />
      <h1 className="text-2xl font-semibold">{title ?? 'Your ticket'}</h1>
      {eventDate && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(eventDate).toLocaleString()}
        </p>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Show this QR at the door. Hosts can also paste the token if the camera cannot read it.
      </p>
      {(!isOnline || usingOfflineCopy) && token && (
        <div className="text-sm border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded p-3">
          Offline copy — host verification still requires their device to be online.
        </div>
      )}
      {loading && <div>Loading…</div>}
      {paymentRequired && !token && (
        <div className="text-sm space-y-3 border rounded p-4">
          <p>
            This event requires a paid ticket (
            {(paymentAmountCents / 100).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            })}
            ) before your check-in QR is issued.
          </p>
          <button
            type="button"
            onClick={startCheckout}
            disabled={paying}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {paying ? 'Redirecting…' : 'Pay with Stripe'}
          </button>
        </div>
      )}
      {error && (
        <div className="text-sm space-y-2">
          <div className="text-red-600">{error}</div>
          {!paymentRequired && (
            <>
              <p className="text-gray-600 dark:text-gray-400">
                Tickets are available after the host approves your application.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/events/${eventId}/apply`} className="text-blue-600 underline">
                  Apply
                </Link>
                <Link href="/applications" className="text-blue-600 underline">
                  My applications
                </Link>
              </div>
            </>
          )}
        </div>
      )}
      {photoStatus?.required && (
        <div className="border rounded p-4 text-sm space-y-3">
          <h2 className="font-semibold">Check-in reference photo</h2>
          {!photoStatus.configured ? (
            <p className="text-amber-700 dark:text-amber-400">
              The host enabled photo check-in, but private photo storage is not
              configured. Contact the host before the event.
            </p>
          ) : photoStatus.uploaded ? (
            <p className="text-green-700 dark:text-green-400">
              Photo uploaded. The host will compare it visually at check-in.
            </p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400">
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
              <p className="text-xs text-gray-500">
                JPEG, PNG, or WebP; maximum 5 MB.
              </p>
            </>
          )}
          {photoUploading && <p>Uploading…</p>}
        </div>
      )}
      {token && (
        <div className="space-y-3">
          <div id="ticket-qr-wrap" className="p-4 bg-white rounded shadow inline-block">
            <QRCode value={token} size={200} />
          </div>
          <div className="text-sm break-all font-mono">{token}</div>
          <button onClick={download} className="px-4 py-2 border rounded text-sm">
            Download QR
          </button>
          {availableOffline && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>Available offline on this device until one day after the event.</div>
              <button
                type="button"
                onClick={async () => {
                  await deleteOfflineTicket(eventId);
                  setAvailableOffline(false);
                }}
                className="text-red-600 underline"
              >
                Remove offline copy
              </button>
            </div>
          )}
          <Link href="/applications" className="block text-sm text-blue-600 underline">
            My applications
          </Link>
        </div>
      )}
    </div>
  );
}
