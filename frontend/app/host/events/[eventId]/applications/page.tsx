'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useParams } from 'next/navigation';

type Application = { id: string; eventId: string; applicantSub: string; status: string; answers?: string };
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function HostApplicationsPage() {
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
      const data: Paged<Application> = await apiGetAuth(`/applications/event/${eventId}?page=${page}&pageSize=${pageSize}&status=${status}`);
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, page, pageSize, status]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await apiPatchAuth(`/applications/${id}/decision`, { status });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Decision failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Applications - {eventId}</h1>
      <div className="flex items-center gap-3 text-sm">
        <span>Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
        <button disabled={page<=1} onClick={() => setPage((p)=>p-1)} className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
        <button disabled={page>=Math.max(1, Math.ceil(total / pageSize))} onClick={() => setPage((p)=>p+1)} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
        <select value={pageSize} onChange={(e)=>{setPage(1); setPageSize(parseInt(e.target.value,10));}} className="border rounded px-2 py-1">
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
        <span>{total} total</span>
        <div className="ml-4 flex items-center gap-2">
          <span>Status</span>
          <select value={status} onChange={(e)=>{setPage(1); setStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected');}} className="border rounded px-2 py-1">
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
          <div key={a.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{a.applicantSub}</div>
              <div className="text-xs text-gray-500">Status: {a.status}</div>
            </div>
            <div className="space-x-2">
              <button onClick={() => decide(a.id, 'approved')} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
              <button onClick={() => decide(a.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && <div className="text-sm text-gray-500">No applications yet.</div>}
      </div>
    </div>
  );
}


