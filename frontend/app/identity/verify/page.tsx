'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type IdentityStatus =
  | 'not_started'
  | 'pending'
  | 'needs_review'
  | 'approved'
  | 'failed'
  | 'expired';

type StatusResponse = {
  configured: boolean;
  status: IdentityStatus;
  verifiedAt: string | null;
};

export default function IdentityVerificationPage() {
  const { user, loading: authLoading } = useAuth();
  const clientRef = useRef<{ destroy: () => void } | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const data = await apiGetAuth('/identity/status');
    setStatus(data as StatusResponse);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadStatus().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : 'Could not load status',
      ),
    );
    return () => clientRef.current?.destroy();
  }, [authLoading, loadStatus, user]);

  const start = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const session = await apiPostAuth('/identity/session', {});
      if (session.status === 'approved') {
        await loadStatus();
        return;
      }
      if (!session.inquiryId || !session.sessionToken) {
        setMessage(
          session.status === 'needs_review'
            ? 'Your verification is under manual review.'
            : 'Persona session is not available.',
        );
        return;
      }
      const Persona = (await import('persona')).default;
      const client = new Persona.Client({
        inquiryId: session.inquiryId as string,
        sessionToken: session.sessionToken as string,
        environmentId: session.environmentId as string,
        onReady: () => client.open(),
        onComplete: () => {
          setMessage(
            'Verification submitted. Status updates after Persona review.',
          );
          void loadStatus();
        },
        onCancel: () => setMessage('Verification paused. You can resume later.'),
        onError: () => setMessage('Persona could not load. Please retry.'),
      });
      clientRef.current = client;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not start verification',
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="max-w-xl mx-auto p-6 text-sm">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Identity verification</h1>
        <p className="text-sm">Log in before starting Persona verification.</p>
        <Link href="/auth/login" className="text-blue-600 underline">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Identity verification</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Persona verifies your identity. VelvetKey stores only the inquiry ID
        and decision status—not your identity documents.
      </p>
      {status && (
        <div className="border rounded p-4 text-sm space-y-1">
          <p>
            Status:{' '}
            <strong className="capitalize">
              {status.status.replaceAll('_', ' ')}
            </strong>
          </p>
          {status.verifiedAt && (
            <p className="text-xs text-gray-500">
              Verified {new Date(status.verifiedAt).toLocaleString()}
            </p>
          )}
          {!status.configured && (
            <p className="text-amber-700 dark:text-amber-400">
              Persona is not configured on this deployment.
            </p>
          )}
        </div>
      )}
      {status?.status !== 'approved' && status?.status !== 'needs_review' && (
        <button
          type="button"
          onClick={start}
          disabled={loading || status?.configured === false}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading
            ? 'Starting…'
            : status?.status === 'pending'
              ? 'Resume verification'
              : 'Start verification'}
        </button>
      )}
      <button
        type="button"
        onClick={() => void loadStatus()}
        className="block text-sm underline"
      >
        Refresh status
      </button>
      {message && <p className="text-sm">{message}</p>}
      <Link href="/applications" className="text-sm text-blue-600 underline">
        My applications
      </Link>
    </div>
  );
}
