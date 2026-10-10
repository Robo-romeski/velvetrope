'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

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
    return (
      <PageShell size="wide">
        <LoadingState />
      </PageShell>
    );
  }

  if (!user || !isAdmin) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Trust and safety"
          title="Trust reports"
          description="Admin access is required to review confidential reports."
        />
        <TextLink href="/">Return home</TextLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader
        eyebrow="Trust and safety"
        title="Trust reports"
        description="Confidential reports requiring administrative review."
      />
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      {items.length === 0 && (
        <EmptyState
          title="No reports yet"
          description="New concerns will appear here for review."
        />
      )}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id}>
            <Card className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 justify-between">
                <span>
                  <strong>{r.category}</strong> · {r.subjectType} {r.subjectId}
                </span>
                <Badge tone={r.status === 'open' ? 'warning' : 'success'}>
                  {r.status}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap">{r.details}</p>
              {r.status === 'open' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => resolve(r.id)}
                >
                  Mark resolved
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
