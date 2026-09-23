'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPostAuth, isUnauthorized } from '@/lib/api';
import QRCode from 'react-qr-code';

export default function EventTicketPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [title, setTitle] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!eventId) return;
    (async () => {
      setLoading(true);
      try {
        try {
          const ev = await apiGet(`/events/${encodeURIComponent(eventId)}`);
          if (!mounted) return;
          setTitle(ev?.title ?? null);
          if (ev?.status && ev.status !== 'published') return;
        } catch {
          // Ticket fetch still tries; event title is optional.
        }

        const res = await apiPostAuth(`/checkin/mine/${encodeURIComponent(eventId)}`, {});
        if (!mounted) return;
        setToken(res?.token ?? null);
      } catch (e) {
        if (!mounted) return;
        if (isUnauthorized(e)) {
          setUnauthorized(true);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load ticket');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

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
      <h1 className="text-2xl font-semibold">{title ?? 'Your ticket'}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Show this QR at the door. Hosts can also paste the token if the camera cannot read it.
      </p>
      {loading && <div>Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {token && (
        <div className="space-y-3">
          <div id="ticket-qr-wrap" className="p-4 bg-white rounded shadow inline-block">
            <QRCode value={token} size={200} />
          </div>
          <div className="text-sm break-all font-mono">{token}</div>
          <button onClick={download} className="px-4 py-2 border rounded text-sm">
            Download QR
          </button>
        </div>
      )}
    </div>
  );
}
