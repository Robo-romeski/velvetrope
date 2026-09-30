'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Report = {
  id: string;
  subjectType: string;
  subjectId: string;
  category: string;
  status: 'open' | 'resolved';
  details: string;
  assignedToAdminId?: string | null;
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
};

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Report[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGetAuth('/trust/reports');
      const reports = (Array.isArray(data) ? data : []) as Report[];
      setItems(reports);
      setNotes(
        Object.fromEntries(
          reports.map((report) => [report.id, report.adminNotes ?? '']),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (
    report: Report,
    body: {
      assignedToAdminId?: string | null;
      adminNotes?: string | null;
      status?: 'open' | 'resolved';
    },
  ) => {
    setBusyId(report.id);
    setError(null);
    try {
      await apiPatchAuth(`/trust/reports/${report.id}/review`, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Trust reports</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((report) => (
          <div key={report.id} className="border rounded p-3 text-sm space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                <strong>{report.category}</strong> · {report.subjectType}{' '}
                {report.subjectId}
              </span>
              <span>{report.status}</span>
            </div>
            <p className="whitespace-pre-wrap">{report.details}</p>
            <p className="text-xs text-gray-500">
              Assigned: {report.assignedToAdminId ?? 'unassigned'} · Created{' '}
              {new Date(report.createdAt).toLocaleString()}
            </p>
            <label className="block space-y-1">
              <span className="text-xs">Private admin notes</span>
              <textarea
                value={notes[report.id] ?? ''}
                maxLength={5000}
                rows={3}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [report.id]: event.target.value,
                  }))
                }
                className="w-full border rounded px-2 py-1 bg-transparent"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === report.id}
                onClick={() =>
                  void review(report, {
                    assignedToAdminId: user?.id ?? null,
                  })
                }
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Assign to me
              </button>
              <button
                type="button"
                disabled={busyId === report.id}
                onClick={() =>
                  void review(report, {
                    adminNotes: notes[report.id]?.trim() || null,
                  })
                }
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Save notes
              </button>
              <button
                type="button"
                disabled={busyId === report.id}
                onClick={() =>
                  void review(report, {
                    status: report.status === 'open' ? 'resolved' : 'open',
                  })
                }
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                {report.status === 'open' ? 'Resolve' : 'Reopen'}
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No reports yet.</p>
        )}
      </div>
    </div>
  );
}
