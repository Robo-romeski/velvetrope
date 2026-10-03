'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import { downloadCsv } from '@/lib/csv';
import QrCamera from '@/app/components/QrCamera';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  MetricTile,
  PageHeader,
  PageShell,
  Select,
} from '@/app/components/ui';

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
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Check-in" />;
  }

  const used = tickets.filter((ticket) => ticket.usedAt).length;

  return (
    <PageShell className="space-y-8">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Door operations"
        title="Guest check-in"
        description="Scan a guest QR or paste the entry token. Each ticket can be checked in once."
        actions={
          <MetricTile
            label="Attendance"
            value={`${used}/${tickets.length}`}
            className="min-w-40"
          />
        }
      />
      <Card className="space-y-5 p-6 sm:p-8">
        <QrCamera onCode={onCode} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Paste scanned token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-sm"
          />
          <Button
            onClick={() => prepareVerification(token)}
            disabled={loading || !token.trim()}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
        </div>
        {result && (
          <Alert
            tone={result.startsWith('Checked in') ? 'success' : 'info'}
            role="status"
          >
            {result}
          </Alert>
        )}
      </Card>
      {photoReview && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Confirm attendee photo</h2>
          {/* Signed URL expires after five minutes and is only issued to the event host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoReview.url}
            alt="Private attendee reference"
            className="w-full max-w-sm rounded-2xl border border-border"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={loading}
              onClick={() => void verify(photoReview.token, true)}
            >
              Confirm photo and check in
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPhotoReview(null);
                setResult('Check-in cancelled.');
              }}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Show</span>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AttendanceFilter)}
            className="w-auto py-2"
          >
            <option value="all">All tickets</option>
            <option value="checked-in">Checked in</option>
            <option value="not-checked-in">Not checked in</option>
          </Select>
        </label>
        <Button
          type="button"
          onClick={exportAttendance}
          disabled={tickets.length === 0}
          variant="secondary"
          size="sm"
        >
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3">
        {filtered.map((ticket) => (
          <Card
            key={ticket.id}
            className="flex items-center justify-between gap-3 py-4 text-sm"
          >
            <div className="break-all">{ticket.userSub}</div>
            <div className="shrink-0 text-right">
              <Badge tone={ticket.usedAt ? 'success' : 'neutral'}>
                {ticket.usedAt ? 'Checked in' : 'Not checked in'}
              </Badge>
              {ticket.usedAt && (
                <div className="mt-1 text-xs text-muted">
                  {new Date(ticket.usedAt).toLocaleString()}
                </div>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <EmptyState
            title={
              tickets.length === 0
                ? 'No tickets issued yet'
                : 'No tickets match this filter'
            }
          />
        )}
      </div>
    </PageShell>
  );
}
