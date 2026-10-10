'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Section,
  Textarea,
} from '@/app/components/ui';

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
    <Section
      title="Trust reports"
      description="Confidential reports remain separate from public feedback and kudos."
    >
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      <div className="space-y-3">
        {items.map((report) => (
          <Card key={report.id} className="space-y-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                <strong>{report.category}</strong> · {report.subjectType}{' '}
                {report.subjectId}
              </span>
              <Badge tone={report.status === 'open' ? 'warning' : 'success'}>
                {report.status}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap">{report.details}</p>
            <p className="text-xs text-muted">
              Assigned: {report.assignedToAdminId ?? 'unassigned'} · Created{' '}
              {new Date(report.createdAt).toLocaleString()}
            </p>
            <FormField label="Private admin notes">
              <Textarea
                value={notes[report.id] ?? ''}
                maxLength={5000}
                rows={3}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [report.id]: event.target.value,
                  }))
                }
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyId === report.id}
                onClick={() =>
                  void review(report, {
                    assignedToAdminId: user?.id ?? null,
                  })
                }
              >
                Assign to me
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyId === report.id}
                onClick={() =>
                  void review(report, {
                    adminNotes: notes[report.id]?.trim() || null,
                  })
                }
              >
                Save notes
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busyId === report.id}
                onClick={() =>
                  void review(report, {
                    status: report.status === 'open' ? 'resolved' : 'open',
                  })
                }
              >
                {report.status === 'open' ? 'Resolve' : 'Reopen'}
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <EmptyState title="No reports yet" description="New concerns will appear here for review." />
        )}
      </div>
    </Section>
  );
}
