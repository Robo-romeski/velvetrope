'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import {
  Alert,
  LoadingState,
  MetricTile,
  Section,
} from '@/app/components/ui';

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
    <Section
      title="Platform overview"
      description="Current operational counts across accounts, events, and reports."
    >
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      {!summary && !error && <LoadingState />}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Users', summary.users],
            ['Suspended', summary.suspendedUsers],
            ['Events', summary.events],
            ['Cancelled', summary.cancelledEvents],
            ['Open reports', summary.openReports],
          ].map(([label, value]) => (
            <MetricTile key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </Section>
  );
}
