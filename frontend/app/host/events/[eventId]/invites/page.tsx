'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';

type Invite = {
  id: string;
  code: string;
  usedAt?: string | null;
  usedBy?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
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
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
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
      setInvites(Array.isArray(list) ? list : []);
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
      <div className="max-w-xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || unauthorized) {
    return <HostLoginPrompt title="Invites" />;
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <HostEventNav eventId={eventId} />
      <h1 className="text-2xl font-semibold">Invites</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Generated</div>
            <div className="text-lg font-semibold">{stats.total}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Redeemed</div>
            <div className="text-lg font-semibold">{stats.redeemed}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Unused</div>
            <div className="text-lg font-semibold">{stats.unused}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Conversion</div>
            <div className="text-lg font-semibold">{formatPercent(stats.conversionRate)}</div>
          </div>
        </div>
      )}
      {stats && stats.expiredUnused > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {stats.expiredUnused} unused code(s) have expired.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm space-y-1">
          <span className="block text-gray-600 dark:text-gray-400">Expires in (hours, optional)</span>
          <input
            type="number"
            min={1}
            placeholder="Never"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(e.target.value)}
            className="border rounded px-3 py-2 w-32 bg-transparent"
          />
        </label>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate invite'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="border rounded p-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono font-semibold">{invite.code}</div>
              <div className="text-xs text-gray-500">{inviteStatus(invite)}</div>
            </div>
            {!invite.usedAt &&
              !(invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) && (
                <button onClick={() => copy(invite.code)} className="text-sm text-blue-600 underline">
                  Copy
                </button>
              )}
          </div>
        ))}
        {invites.length === 0 && <div className="text-sm text-gray-500">No invite codes yet.</div>}
      </div>
    </div>
  );
}
