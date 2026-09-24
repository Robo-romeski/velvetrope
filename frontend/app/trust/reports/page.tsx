'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Report = {
  id: string;
  subjectType: string;
  subjectId: string;
  category: string;
  status: string;
  details: string;
  createdAt: string;
};

export default function AdminReportsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.roles?.includes('admin');

  useEffect(() => {
    if (loading || !isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        const data = await apiGetAuth('/trust/reports');
        if (!mounted) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load reports');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loading, isAdmin]);

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      await apiPatchAuth(`/trust/reports/${id}/resolve`, {});
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolve failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6 text-sm">Loading…</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Trust reports</h1>
        <p className="text-sm">Admin access required.</p>
        <Link href="/" className="text-blue-600 underline text-sm">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Trust reports</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {items.length === 0 && <p className="text-sm text-gray-500">No reports yet.</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="border rounded p-3 text-sm space-y-2">
            <div className="flex flex-wrap gap-2 justify-between">
              <span>
                <strong>{r.category}</strong> · {r.subjectType} {r.subjectId}
              </span>
              <span className="text-gray-500">{r.status}</span>
            </div>
            <p className="whitespace-pre-wrap">{r.details}</p>
            {r.status === 'open' && (
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => resolve(r.id)}
                className="px-3 py-1 border rounded text-xs disabled:opacity-50"
              >
                Mark resolved
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
