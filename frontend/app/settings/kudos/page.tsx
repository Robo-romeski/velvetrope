'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type KudoRow = {
  id: string;
  kudoType: string;
  message: string | null;
  status: string;
  giver: { slug: string; displayName: string | null };
  recipient: { slug: string; displayName: string | null };
};

const TYPE_LABELS: Record<string, string> = {
  welcoming: 'Welcoming',
  knowledge_sharing: 'Knowledge sharing',
  respectful_communication: 'Respectful communication',
  event_contribution: 'Event contribution',
};

function label(type: string) {
  return TYPE_LABELS[type] ?? type.replaceAll('_', ' ');
}

export default function KudosSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<KudoRow[]>([]);
  const [given, setGiven] = useState<KudoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, g] = await Promise.all([
        apiGetAuth('/kudos/me/pending'),
        apiGetAuth('/kudos/me/given'),
      ]);
      setPending(Array.isArray(p) ? p : []);
      setGiven(Array.isArray(g) ? g : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load kudos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fsettings%2Fkudos');
      return;
    }
    void load();
  }, [authLoading, user, router]);

  const approve = async (id: string) => {
    await apiPatchAuth(`/kudos/${id}/approve`, {});
    await load();
  };

  const hide = async (id: string) => {
    await apiPatchAuth(`/kudos/${id}/hide`, {});
    await load();
  };

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/settings/profile">← Profile settings</TextLink>
      <PageHeader
        title="Kudos"
        description="Positive recognition you approve before it appears on your profile. No scores or leaderboards."
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold">Pending your approval</h2>
            {pending.length === 0 && (
              <p className="text-sm text-muted">Nothing waiting.</p>
            )}
            {pending.map((row) => (
              <Card key={row.id} className="space-y-3 p-4">
                <p className="font-medium">
                  {label(row.kudoType)} from{' '}
                  <Link href={`/members/${row.giver.slug}`} className="text-accent">
                    {row.giver.displayName ?? row.giver.slug}
                  </Link>
                </p>
                {row.message && <p className="text-sm text-muted">{row.message}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => approve(row.id)}>
                    Approve for profile
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => hide(row.id)}>
                    Decline / hide
                  </Button>
                </div>
              </Card>
            ))}
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">Kudos you gave</h2>
            {given.length === 0 && (
              <p className="text-sm text-muted">You have not sent kudos yet.</p>
            )}
            {given.map((row) => (
              <Card key={row.id} className="p-4 text-sm space-y-1">
                <p>
                  {label(row.kudoType)} →{' '}
                  <Link href={`/members/${row.recipient.slug}`} className="text-accent">
                    {row.recipient.displayName ?? row.recipient.slug}
                  </Link>
                </p>
                <p className="text-muted capitalize">Status: {row.status.replaceAll('_', ' ')}</p>
                {row.status === 'approved' && (
                  <Button type="button" variant="secondary" onClick={() => hide(row.id)}>
                    Hide from their profile
                  </Button>
                )}
              </Card>
            ))}
          </section>
        </>
      )}
    </PageShell>
  );
}
