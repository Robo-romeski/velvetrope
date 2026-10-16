'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Alert,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type CreatorPage = {
  creator: {
    userId: string;
    slug: string;
    displayName: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    educator?: boolean;
  };
  items: Array<{
    slug: string;
    title: string;
    summary?: string | null;
    contentType: string;
  }>;
};

export default function CreatorPage() {
  const params = useParams();
  const key = String(params?.key ?? '');
  const [data, setData] = useState<CreatorPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = (await apiGet(
          `/learn/creators/${encodeURIComponent(key)}`,
        )) as CreatorPage;
        if (mounted) setData(res);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Creator not found');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [key]);

  if (loading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell size="narrow">
        <Alert tone="danger">{error ?? 'Not found'}</Alert>
      </PageShell>
    );
  }

  const { creator, items } = data;

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/learn">← Learn</TextLink>
      <PageHeader
        title={creator.displayName ?? creator.slug}
        description={
          creator.educator
            ? 'Educator on epicsexual'
            : 'Member profile — no published learning yet'
        }
      />
      {creator.bio && (
        <p className="text-sm text-muted whitespace-pre-wrap">{creator.bio}</p>
      )}
      <p className="text-sm">
        <Link href={`/members/${creator.slug}`} className="text-accent">
          View full profile
        </Link>
      </p>
      {items.length === 0 ? (
        <Alert tone="info">No published courses or guides yet.</Alert>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.slug} className="p-4">
              <Link href={`/learn/${item.slug}`} className="font-semibold text-accent">
                {item.title}
              </Link>
              <p className="text-xs text-muted mt-1">{item.contentType}</p>
              {item.summary && (
                <p className="text-sm text-muted mt-2">{item.summary}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
