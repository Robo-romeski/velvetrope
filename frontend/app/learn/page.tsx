'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

type LearnItem = {
  id: string;
  slug: string;
  title: string;
  contentType: string;
  tags: string[];
};

export default function LearnCatalogPage() {
  const { user, loading: authLoading } = useAuth(); // authLoading gates actions only
  const [items, setItems] = useState<LearnItem[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (tag.trim()) params.set('tag', tag.trim());
      const path = `/learn${params.toString() ? `?${params}` : ''}`;
      const data = (await apiGet(path)) as LearnItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell size="wide" className="space-y-6">
      <PageHeader
        title="Learn"
        description="Member-created guides and courses—free to read while we build paid access."
        actions={
          user ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/learn/mine" variant="secondary">
                My content
              </ButtonLink>
              <ButtonLink href="/learn/new">Create</ButtonLink>
            </div>
          ) : (
            <ButtonLink href="/auth/login?next=%2Flearn">Log in</ButtonLink>
          )
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Input
          placeholder="Filter by tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          onClick={() => void load()}
        >
          Apply
        </button>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      {loading || authLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title="No published content yet"
          description="Educators can draft material from My content."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="p-5 space-y-2">
              <div className="text-xs uppercase text-muted">{item.contentType}</div>
              <Link href={`/learn/${item.slug}`} className="text-lg font-semibold text-accent">
                {item.title}
              </Link>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
