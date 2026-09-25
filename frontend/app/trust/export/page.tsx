'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function DataExportPage() {
  const { user, loading, logout } = useAuth();
  const [json, setJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

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

      <hr className="border-black/10 dark:border-white/15" />

      <h2 className="text-lg font-semibold">Delete account</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Permanently deletes your profile, applications, tickets, and payments. You cannot delete while
        you still host events — remove those first.
      </p>
      <label className="block text-sm space-y-1">
        <span>Confirm with your password</span>
        <input
          type="password"
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={deleting || !deletePassword}
        onClick={async () => {
          setDeleting(true);
          setDeleteMessage(null);
          setError(null);
          try {
            await apiPostAuth('/trust/delete-account', { password: deletePassword });
            await logout();
            window.location.href = '/';
          } catch (e) {
            setDeleteMessage(e instanceof Error ? e.message : 'Delete failed');
          } finally {
            setDeleting(false);
          }
        }}
        className="px-4 py-2 border border-red-600 text-red-700 dark:text-red-400 rounded disabled:opacity-50"
      >
        {deleting ? 'Deleting…' : 'Delete my account'}
      </button>
      {deleteMessage && <p className="text-sm text-red-600">{deleteMessage}</p>}
    </div>
  );
}
