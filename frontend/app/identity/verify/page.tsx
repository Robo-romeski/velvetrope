'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

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
    return <PageShell size="narrow"><LoadingState /></PageShell>;
  }
  if (!user) {
    return (
      <PageShell size="narrow" className="space-y-6">
        <PageHeader
          eyebrow="Identity"
          title="Identity verification"
          description="Log in before starting Persona verification."
        />
        <ButtonLink href="/auth/login">Log in</ButtonLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Identity"
        title="Identity verification"
        description="Persona verifies your identity. epicsexual stores only the inquiry ID and decision status—not your identity documents."
      />
      {status && (
        <Card className="space-y-3 p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold">Verification status</span>
            <Badge
              tone={status.status === 'approved' ? 'success' : 'neutral'}
            >
              {status.status.replaceAll('_', ' ')}
            </Badge>
          </div>
          {status.verifiedAt && (
            <p className="text-xs text-muted">
              Verified {new Date(status.verifiedAt).toLocaleString()}
            </p>
          )}
          {!status.configured && (
            <Alert tone="warning">
              Persona is not configured on this deployment.
            </Alert>
          )}
        </Card>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {status?.status !== 'approved' && status?.status !== 'needs_review' && (
          <Button
            type="button"
            onClick={start}
            disabled={loading || status?.configured === false}
          >
            {loading
              ? 'Starting…'
              : status?.status === 'pending'
                ? 'Resume verification'
                : 'Start verification'}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadStatus()}
        >
          Refresh status
        </Button>
      </div>
      {message && <Alert tone="info" role="status">{message}</Alert>}
      <TextLink href="/applications">My applications</TextLink>
    </PageShell>
  );
}
