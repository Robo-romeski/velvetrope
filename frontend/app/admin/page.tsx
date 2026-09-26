'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';

type AdminSummary = {
  users: number;
  suspendedUsers: number;
  events: number;
  cancelledEvents: number;
  openReports: number;
};

export default function AdminOverviewPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGetAuth('/admin/summary');
        if (mounted) setSummary(data as AdminSummary);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Could not load summary');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin overview</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!summary && !error && <p className="text-sm">Loading…</p>}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Users', summary.users],
            ['Suspended', summary.suspendedUsers],
            ['Events', summary.events],
            ['Cancelled', summary.cancelledEvents],
            ['Open reports', summary.openReports],
          ].map(([label, value]) => (
            <div key={label} className="border rounded p-3">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
