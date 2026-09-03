'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiPostAuth } from '@/lib/api';

export default function HostInvitesPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPostAuth(`/invites/generate/${encodeURIComponent(eventId)}`, {});
      setCode(res?.code ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Invites - {eventId}</h1>
      <button onClick={generate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Generating…' : 'Generate Invite'}
      </button>
      {code && (
        <div className="text-sm">New code: <span className="font-mono font-semibold">{code}</span></div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}


