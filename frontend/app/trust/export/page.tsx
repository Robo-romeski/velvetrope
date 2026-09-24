'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function DataExportPage() {
  const { user, loading } = useAuth();
  const [json, setJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const download = async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await apiGetAuth('/trust/export');
      const text = JSON.stringify(data, null, 2);
      setJson(text);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'velvetkey-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return <div className="max-w-xl mx-auto p-6 text-sm">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Download my data</h1>
        <p className="text-sm">Log in to export your account data.</p>
        <Link href="/auth/login" className="text-blue-600 underline text-sm">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Download my data</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        JSON export of your profile and application history (passwords are never included).
      </p>
      <button
        type="button"
        onClick={download}
        disabled={fetching}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {fetching ? 'Preparing…' : 'Download JSON'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {json && (
        <pre className="text-xs overflow-auto max-h-64 border rounded p-2 bg-black/[0.02] dark:bg-white/[0.04]">
          {json}
        </pre>
      )}
    </div>
  );
}
