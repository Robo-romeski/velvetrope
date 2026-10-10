'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
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
  summary?: string | null;
  contentType: string;
  tags: string[];
  publishedAt?: string | null;
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
    <PageShell size="wide" className="space-y-10">
      <PageHeader
        eyebrow="Learning"
        title="Notes for doing this with more care."
        description="Published guides and courses from community educators. Catalog details are public; sign in to read full lessons, and note that some content requires purchase."
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
      <div className="grid gap-3 border-y border-border py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1 text-sm">
          <span>Search the library</span>
        <Input
          placeholder="Title or subject"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        </label>
        <label className="space-y-1 text-sm">
          <span>Topic</span>
        <Input
          placeholder="Filter by tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
        >
          Apply
        </Button>
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
        <div className="border-t-2 border-highlight">
          {items.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 border-b border-border py-7 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-start"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {item.contentType}
              </div>
              <div>
                <Link
                  href={`/learn/${item.slug}`}
                  className="font-display text-2xl font-semibold text-foreground hover:text-accent"
                >
                  {item.title}
                </Link>
                {item.summary && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    {item.summary}
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((topic) => (
                      <Badge key={topic}>{topic}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {item.publishedAt && (
                <time
                  className="text-xs text-muted"
                  dateTime={item.publishedAt}
                >
                  {new Date(item.publishedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              )}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
