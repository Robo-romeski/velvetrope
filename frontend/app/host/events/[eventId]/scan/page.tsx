'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiPostAuth } from '@/lib/api';

export default function HostScanPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [token, setToken] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiPostAuth(`/checkin/verify/${encodeURIComponent(token)}`, {});
      setResult(`Checked in at ${res?.usedAt}`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Verify failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Scan Check-in - {eventId}</h1>
      <input
        className="w-full border rounded p-2"
        placeholder="Paste scanned token"
        value={token}
        onChange={(e)=>setToken(e.target.value)}
      />
      <button onClick={verify} disabled={loading || !token} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      {result && <div className="text-sm">{result}</div>}
    </div>
  );
}


