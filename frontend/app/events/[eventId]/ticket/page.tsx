'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPostAuth } from '@/lib/api';
import QRCode from 'react-qr-code';

export default function EventTicketPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!eventId) return;
    (async () => {
      setLoading(true);
      try {
        try {
          const ev = await apiGet(`/events/${encodeURIComponent(eventId)}`);
          if (!mounted) return;
          if (ev?.status !== 'published') return;
        } catch {}

        const res = await apiPostAuth(`/checkin/issue/${encodeURIComponent(eventId)}`, { userSub: 'user|demo' });
        if (!mounted) return;
        setToken(res?.token ?? null);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load ticket');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Your Ticket - {eventId}</h1>
      {loading && <div>Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {token && (
        <div className="p-4 bg-white rounded shadow inline-block">
          <QRCode value={token} size={200} />
          <div className="text-sm mt-2 break-all">{token}</div>
        </div>
      )}
    </div>
  );
}


