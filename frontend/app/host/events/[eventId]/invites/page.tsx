'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { useAuth } from '@/lib/auth';

type Invite = {
  id: string;
  code: string;
  usedAt?: string | null;
  usedBy?: string | null;
};

export default function HostInvitesPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = async () => {
    if (!eventId) return;
    try {
      const data = await apiGetAuth(`/invites/event/${encodeURIComponent(eventId)}`);
      setInvites(Array.isArray(data) ? data : []);
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
      await apiPostAuth(`/invites/generate/${encodeURIComponent(eventId)}`, {});
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
      <h1 className="text-2xl font-semibold">Invites</h1>
      <button
        onClick={generate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate invite'}
      </button>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="border rounded p-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono font-semibold">{invite.code}</div>
              <div className="text-xs text-gray-500">
                {invite.usedAt ? `Used by ${invite.usedBy}` : 'Unused'}
              </div>
            </div>
            {!invite.usedAt && (
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
