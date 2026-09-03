'use client';

import { useState } from 'react';
import { apiGet, apiPostAuth } from '@/lib/api';

export default function RedeemInvitePage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiGet(`/invites/validate/${encodeURIComponent(code)}`);
      if (res?.valid) setStatus(`Valid for event ${res.eventId}${res.used ? ' (already used)' : ''}`);
      else setStatus('Invalid code');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const redeem = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiPostAuth(`/invites/redeem/${encodeURIComponent(code)}`, {});
      setStatus(`Redeemed by ${res?.usedBy}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Redeem failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Redeem Invite</h1>
      <input
        className="w-full border rounded p-2"
        placeholder="Enter invite code"
        value={code}
        onChange={(e)=>setCode(e.target.value.toUpperCase())}
      />
      <div className="space-x-2">
        <button onClick={validate} disabled={loading || !code} className="px-3 py-2 border rounded disabled:opacity-50">Validate</button>
        <button onClick={redeem} disabled={loading || !code} className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50">Redeem</button>
      </div>
      {status && <div className="text-sm">{status}</div>}
    </div>
  );
}


