'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

type MineItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  contentType: string;
};

export default function MyLearnContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Flearn%2Fmine');
      return;
    }
    (async () => {
      try {
        const data = (await apiGetAuth('/learn/mine')) as MineItem[];
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader
        title="My learning content"
        actions={<ButtonLink href="/learn/new">New draft</ButtonLink>}
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState title="No drafts yet" description="Create your first guide or course." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex justify-between gap-3">
              <div>
                <Link href={`/learn/${item.slug}/edit`} className="font-semibold text-accent">
                  {item.title}
                </Link>
                <div className="mt-1 flex gap-2 text-xs text-muted">
                  <Badge>{item.status}</Badge>
                  <span>{item.contentType}</span>
                </div>
              </div>
              <Link href={`/learn/${item.slug}`} className="text-sm">
                Preview
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
