'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useParams } from 'next/navigation';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import { parseApplicationAnswers } from '@/lib/parse-application-answers';

type Application = {
  id: string;
  eventId: string;
  applicantSub: string;
  status: string;
  answers?: string;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

function ApplicationAnswers({ answers }: { answers?: string | null }) {
  const parsed = parseApplicationAnswers(answers);
  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    return <div className="text-xs text-gray-500">No form answers</div>;
  }
  return (
    <dl className="text-sm space-y-1 mt-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-gray-600 dark:text-gray-400">{key}</dt>
          <dd className="font-medium break-words">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HostApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Paged<Application> = await apiGetAuth(
        `/applications/event/${eventId}?page=${page}&pageSize=${pageSize}&status=${status}`,
      );
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId || authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, page, pageSize, status, authLoading, user]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await apiPatchAuth(`/applications/${id}/decision`, { status: decision });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Decision failed');
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="Applications" />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <HostEventNav eventId={eventId} />
      <h1 className="text-2xl font-semibold">Applications</h1>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <button
          disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
          onClick={() => setPage((p) => p + 1)}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
        <select
          value={pageSize}
          onChange={(e) => {
            setPage(1);
            setPageSize(parseInt(e.target.value, 10));
          }}
          className="border rounded px-2 py-1 bg-transparent"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
        <span>{total} total</span>
        <div className="flex items-center gap-2">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected');
            }}
            className="border rounded px-2 py-1 bg-transparent"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {loading && <div className="text-sm">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="border rounded p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium break-all">{a.applicantSub}</div>
                <div className="text-xs text-gray-500 capitalize">Status: {a.status}</div>
                <ApplicationAnswers answers={a.answers} />
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => decide(a.id, 'approved')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(a.id, 'rejected')}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-sm text-gray-500">No applications yet.</div>
        )}
      </div>
    </div>
  );
}
