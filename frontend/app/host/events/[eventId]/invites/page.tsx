'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  MetricTile,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

type Invite = {
  id: string;
  code: string;
  usedAt?: string | null;
  usedBy?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  expired: boolean;
};

type InviteStats = {
  total: number;
  redeemed: number;
  unused: number;
  expiredUnused: number;
  conversionRate: number;
};

function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function inviteStatus(invite: Invite): string {
  if (invite.usedAt) return `Used by ${invite.usedBy ?? 'someone'}`;
  if (invite.expired) {
    return 'Expired (unused)';
  }
  if (invite.expiresAt) {
    return `Unused · expires ${new Date(invite.expiresAt).toLocaleString()}`;
  }
  return 'Unused';
}

export default function HostInvitesPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = async () => {
    if (!eventId) return;
    try {
      const [list, statsRes] = await Promise.all([
        apiGetAuth(`/invites/event/${encodeURIComponent(eventId)}`),
        apiGetAuth(`/invites/event/${encodeURIComponent(eventId)}/stats`),
      ]);
      const loadedAt = Date.now();
      setInvites(
        (Array.isArray(list) ? list : []).map(
          (invite: Omit<Invite, 'expired'>) => ({
            ...invite,
            expired:
              !!invite.expiresAt &&
              new Date(invite.expiresAt).getTime() <= loadedAt,
          }),
        ),
      );
      setStats(statsRes as InviteStats);
      setUnauthorized(false);
      setError(null);
    } catch (e) {
      if (isUnauthorized(e)) {
        setUnauthorized(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load invites');
      }
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, authLoading, user]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const hours = expiresInHours.trim();
      const body =
        hours !== '' && !Number.isNaN(Number(hours)) && Number(hours) > 0
          ? { expiresInHours: Number(hours) }
          : {};
      await apiPostAuth(`/invites/generate/${encodeURIComponent(eventId)}`, body);
      await load();
    } catch (e) {
      if (isUnauthorized(e)) {
        setUnauthorized(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to generate invite');
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      setError('Could not copy code');
    }
  };

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Invites" />;
  }

  return (
    <PageShell className="space-y-8">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Guest access"
        title="Invites"
        description="Generate private codes and monitor how they move through the guest funnel."
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile label="Generated" value={stats.total} />
          <MetricTile label="Redeemed" value={stats.redeemed} />
          <MetricTile label="Unused" value={stats.unused} />
          <MetricTile
            label="Conversion"
            value={formatPercent(stats.conversionRate)}
          />
        </div>
      )}
      {stats && stats.expiredUnused > 0 && (
        <Alert tone="warning">
          {stats.expiredUnused} unused code(s) have expired.
        </Alert>
      )}

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField
          label="Expires in"
          hint="Hours; leave blank for no expiry."
          htmlFor="invite-expiry"
          className="sm:max-w-56"
        >
          <Input
            id="invite-expiry"
            type="number"
            min={1}
            placeholder="Never"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(e.target.value)}
          />
        </FormField>
        <Button onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate invite'}
        </Button>
      </Card>

      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="grid gap-3">
        {invites.map((invite) => (
          <Card
            key={invite.id}
            className="flex items-center justify-between gap-3 py-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-mono text-lg font-semibold tracking-[0.08em]">
                  {invite.code}
                </div>
                <Badge
                  tone={
                    invite.usedAt
                      ? 'success'
                      : invite.expired
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {invite.usedAt ? 'Redeemed' : invite.expired ? 'Expired' : 'Open'}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted">
                {inviteStatus(invite)}
              </div>
            </div>
            {!invite.usedAt && !invite.expired && (
              <Button
                onClick={() => copy(invite.code)}
                variant="secondary"
                size="sm"
              >
                Copy
              </Button>
            )}
          </Card>
        ))}
        {invites.length === 0 && (
          <EmptyState
            title="No invite codes yet"
            description="Generate a private code to begin inviting guests."
          />
        )}
      </div>
    </PageShell>
  );
}
