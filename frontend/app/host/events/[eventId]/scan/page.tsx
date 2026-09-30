'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import { downloadCsv } from '@/lib/csv';
import QrCamera from '@/app/components/QrCamera';

type Ticket = {
  id: string;
  eventId: string;
  userSub: string;
  issuedAt: string;
  usedAt?: string | null;
};

type AttendanceFilter = 'all' | 'checked-in' | 'not-checked-in';
type PhotoReview = {
  token: string;
  url: string;
};

export default function HostScanPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [token, setToken] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoReview, setPhotoReview] = useState<PhotoReview | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await apiGetAuth(`/checkin/event/${encodeURIComponent(eventId)}`);
      setTickets(Array.isArray(data) ? data : []);
      setUnauthorized(false);
      setError(null);
    } catch (e) {
      if (isUnauthorized(e)) {
        setUnauthorized(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load attendance');
      }
    }
  }, [eventId]);

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [load, authLoading, user]);

  const verify = useCallback(
    async (value: string, photoConfirmed = false) => {
      const scanned = value.trim();
      if (!scanned) return;
      setLoading(true);
      setResult(null);
      try {
        const res = await apiPostAuth(
          `/checkin/verify/${encodeURIComponent(scanned)}`,
          { photoConfirmed },
        );
        setResult(`Checked in at ${res?.usedAt}`);
        setToken('');
        setPhotoReview(null);
        await load();
      } catch (e) {
        setResult(e instanceof Error ? e.message : 'Verify failed');
      } finally {
        setLoading(false);
      }
    },
    [load],
  );

  const prepareVerification = useCallback(
    async (value: string) => {
      const scanned = value.trim();
      if (!scanned) return;
      setLoading(true);
      setResult(null);
      setPhotoReview(null);
      try {
        const photo = await apiGetAuth(
          `/checkin/photo/ticket/${encodeURIComponent(scanned)}`,
        );
        if (photo?.required) {
          if (!photo.uploaded || !photo.url) {
            setResult('A required attendee photo has not been uploaded.');
            return;
          }
          setPhotoReview({ token: scanned, url: photo.url as string });
          setResult('Compare the attendee with the private reference photo.');
          return;
        }
        await verify(scanned);
      } catch (e) {
        setResult(e instanceof Error ? e.message : 'Could not prepare check-in');
      } finally {
        setLoading(false);
      }
    },
    [verify],
  );

  const onCode = useCallback(
    (value: string) => {
      setToken(value);
      void prepareVerification(value);
    },
    [prepareVerification],
  );

  const filtered = tickets.filter((ticket) => {
    if (filter === 'checked-in') return !!ticket.usedAt;
    if (filter === 'not-checked-in') return !ticket.usedAt;
    return true;
  });

  const exportAttendance = () => {
    const rows: string[][] = [
      ['userSub', 'issuedAt', 'checkedIn', 'usedAt'],
      ...tickets.map((ticket) => [
        ticket.userSub,
        ticket.issuedAt,
        ticket.usedAt ? 'yes' : 'no',
        ticket.usedAt ?? '',
      ]),
    ];
    downloadCsv(`attendance-${eventId}.csv`, rows);
  };

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Check-in" />;
  }

  const used = tickets.filter((ticket) => ticket.usedAt).length;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <HostEventNav eventId={eventId} />
      <h1 className="text-2xl font-semibold">Check-in</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {used}/{tickets.length} checked in
      </p>
      <QrCamera onCode={onCode} />
      <input
        className="w-full border rounded p-2 bg-transparent"
        placeholder="Paste scanned token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <button
        onClick={() => prepareVerification(token)}
        disabled={loading || !token.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      {result && <div className="text-sm">{result}</div>}
      {photoReview && (
        <div className="border rounded p-3 space-y-3">
          {/* Signed URL expires after five minutes and is only issued to the event host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoReview.url}
            alt="Private attendee reference"
            className="max-w-xs w-full rounded border"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void verify(photoReview.token, true)}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              Confirm photo and check in
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoReview(null);
                setResult('Check-in cancelled.');
              }}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
        <label className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AttendanceFilter)}
            className="border rounded px-2 py-1 bg-transparent"
          >
            <option value="all">All tickets</option>
            <option value="checked-in">Checked in</option>
            <option value="not-checked-in">Not checked in</option>
          </select>
        </label>
        <button
          type="button"
          onClick={exportAttendance}
          disabled={tickets.length === 0}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((ticket) => (
          <div
            key={ticket.id}
            className="border rounded p-3 text-sm flex items-center justify-between gap-3"
          >
            <div className="break-all">{ticket.userSub}</div>
            <div className="text-xs text-gray-500 whitespace-nowrap text-right">
              {ticket.usedAt ? (
                <>Checked in {new Date(ticket.usedAt).toLocaleString()}</>
              ) : (
                'Not checked in'
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-500">
            {tickets.length === 0 ? 'No tickets issued yet.' : 'No tickets match this filter.'}
          </div>
        )}
      </div>
    </div>
  );
}
