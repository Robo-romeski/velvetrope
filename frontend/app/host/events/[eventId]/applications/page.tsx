'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGetAuth, apiPatchAuth, apiPostAuth } from '@/lib/api';
import { useParams } from 'next/navigation';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import { parseApplicationAnswers } from '@/lib/parse-application-answers';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  Textarea,
} from '@/app/components/ui';

type Application = {
  id: string;
  eventId: string;
  applicantSub: string;
  status: 'pending' | 'waitlisted' | 'approved' | 'rejected';
  answers?: string;
  decisionReason?: string | null;
  decidedAt?: string | null;
  waitlistedAt?: string | null;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

function ApplicationAnswers({ answers }: { answers?: string | null }) {
  const parsed = parseApplicationAnswers(answers);
  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    return <div className="text-xs text-muted">No form answers</div>;
  }
  return (
    <dl className="mt-3 grid gap-3 rounded-xl bg-surface-subtle p-4 text-sm sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs text-muted">{key}</dt>
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
  const [status, setStatus] = useState<
    'all' | 'pending' | 'waitlisted' | 'approved' | 'rejected'
  >('all');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const decide = async (
    id: string,
    decision: 'approved' | 'waitlisted' | 'rejected',
  ) => {
    setBusyId(id);
    try {
      await apiPatchAuth(`/applications/${id}/decision`, {
        status: decision,
        reason: reasonById[id]?.trim() || undefined,
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusyId(null);
    }
  };

  const promote = async (id: string) => {
    setBusyId(id);
    try {
      await apiPostAuth(`/applications/${id}/promote`, {});
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Promotion failed');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="Applications" />;
  }

  return (
    <PageShell size="wide" className="space-y-8">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Guest review"
        title="Applications"
        description={`${total} application${total === 1 ? '' : 's'} across every status.`}
      />
      <Card className="flex flex-wrap items-center gap-3 py-4 text-sm">
        <span className="text-muted">
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <Button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          variant="secondary"
          size="sm"
        >
          Previous
        </Button>
        <Button
          disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
          onClick={() => setPage((p) => p + 1)}
          variant="secondary"
          size="sm"
        >
          Next
        </Button>
        <Select
          value={pageSize}
          onChange={(e) => {
            setPage(1);
            setPageSize(parseInt(e.target.value, 10));
          }}
          className="w-auto py-2"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span>Status</span>
          <Select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(
                e.target.value as
                  | 'all'
                  | 'pending'
                  | 'waitlisted'
                  | 'approved'
                  | 'rejected',
              );
            }}
            className="w-auto min-w-32 py-2"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </Card>
      {loading && <LoadingState label="Loading applications…" />}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="grid gap-4">
        {items.map((a, index) => (
          <Card key={a.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="break-all font-medium">{a.applicantSub}</div>
                  <Badge
                    tone={
                      a.status === 'approved'
                        ? 'success'
                        : a.status === 'waitlisted'
                          ? 'warning'
                          : a.status === 'rejected'
                            ? 'danger'
                            : 'accent'
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                {a.status === 'waitlisted' && status === 'waitlisted' && (
                  <div className="mt-1 text-xs text-muted">
                    Waitlist position {(page - 1) * pageSize + index + 1}
                  </div>
                )}
                {a.decisionReason && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted">Host note:</span>{' '}
                    {a.decisionReason}
                  </div>
                )}
                <ApplicationAnswers answers={a.answers} />
              </div>
              {a.status === 'pending' && (
                <div className="min-w-64 shrink-0 space-y-3">
                  <label className="block text-xs space-y-1">
                    <span>Optional note to attendee</span>
                    <Textarea
                      value={reasonById[a.id] ?? ''}
                      maxLength={1000}
                      rows={2}
                      onChange={(e) =>
                        setReasonById((current) => ({
                          ...current,
                          [a.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busyId === a.id}
                      onClick={() => decide(a.id, 'approved')}
                      size="sm"
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={busyId === a.id}
                      onClick={() => decide(a.id, 'waitlisted')}
                      variant="secondary"
                      size="sm"
                    >
                      Waitlist
                    </Button>
                    <Button
                      disabled={busyId === a.id}
                      onClick={() => decide(a.id, 'rejected')}
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-soft"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
              {a.status === 'waitlisted' && status === 'waitlisted' && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    disabled={busyId === a.id || index !== 0 || page !== 1}
                    onClick={() => promote(a.id)}
                    title={
                      index !== 0 || page !== 1
                        ? 'Promote the first attendee in FIFO order'
                        : undefined
                    }
                    size="sm"
                  >
                    Promote
                  </Button>
                  <Button
                    disabled={busyId === a.id}
                    onClick={() => decide(a.id, 'rejected')}
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft"
                  >
                    Reject
                  </Button>
                </div>
              )}
              {a.status === 'approved' && (
                <Button
                  disabled={busyId === a.id}
                  onClick={() => decide(a.id, 'rejected')}
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft"
                >
                  Revoke approval
                </Button>
              )}
            </div>
          </Card>
        ))}
        {items.length === 0 && !loading && (
          <EmptyState
            title="No applications yet"
            description="Applications will appear here as guests redeem invites."
          />
        )}
      </div>
    </PageShell>
  );
}
