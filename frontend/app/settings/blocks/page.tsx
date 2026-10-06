'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiDeleteAuth, apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type BlockRow = {
  userId: string;
  slug: string;
  displayName: string | null;
};

export default function BlocksSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const data = (await apiGetAuth('/members/me/blocks')) as BlockRow[];
    setBlocks(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fsettings%2Fblocks');
      return;
    }
    (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load blocks');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  const unblock = async (userId: string) => {
    await apiDeleteAuth(`/members/${userId}/block`);
    await load();
  };

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/settings/profile">← Profile settings</TextLink>
      <PageHeader title="Blocked members" description="Blocked people cannot follow you or join groups you own." />
      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? (
        <LoadingState />
      ) : blocks.length === 0 ? (
        <EmptyState title="No blocks" description="Block someone from their public profile." />
      ) : (
        <ul className="space-y-2">
          {blocks.map((row) => (
            <Card key={row.userId} className="p-4 flex justify-between items-center gap-3">
              <Link href={`/members/${row.slug}`} className="font-medium">
                {row.displayName ?? row.slug}
              </Link>
              <Button type="button" variant="secondary" size="sm" onClick={() => void unblock(row.userId)}>
                Unblock
              </Button>
            </Card>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
