'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Asset3dThumbnail } from '@/app/components/assets-3d/Asset3dThumbnail';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
} from '@/app/components/ui';
import { apiGet } from '@/lib/api';
import type { Asset3dCatalogPage } from '@/lib/assets-3d';

const EMPTY_PAGE: Asset3dCatalogPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  categories: [],
};

export default function Assets3dCatalogPage() {
  const [catalog, setCatalog] = useState(EMPTY_PAGE);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (filters?: {
    query?: string;
    category?: string;
    tag?: string;
  }) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    const nextQuery = filters?.query ?? query;
    const nextCategory = filters?.category ?? category;
    const nextTag = filters?.tag ?? tag;
    if (nextQuery.trim()) params.set('query', nextQuery.trim());
    if (nextCategory) params.set('category', nextCategory);
    if (nextTag.trim()) params.set('tag', nextTag.trim());
    try {
      const data = (await apiGet(
        `/assets-3d${params.size ? `?${params}` : ''}`,
      )) as Asset3dCatalogPage;
      setCatalog(data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'The 3D library could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load({ query: '', category: '', tag: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell size="wide" className="space-y-10">
      <PageHeader
        title="Objects worth examining from every angle."
        description="A reusable library of interactive 3D references. Rotate, zoom, inspect materials, and play authored motion directly in the browser."
      />

      <form
        className="grid gap-3 border-y border-border py-5 sm:grid-cols-[minmax(0,1fr)_14rem_14rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="space-y-1 text-sm">
          <span>Search the library</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, description, or tag"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {catalog.categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Tag</span>
          <Input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="e.g. anatomy"
          />
        </label>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? (
        <LoadingState label="Opening the 3D library…" />
      ) : catalog.items.length === 0 ? (
        <EmptyState
          title="No published 3D assets found"
          description="Try a broader search, or return after the library has been curated."
        />
      ) : (
        <section aria-label="3D asset catalog">
          <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
            <h2 className="font-display text-2xl font-semibold">
              Published collection
            </h2>
            <div className="text-sm tabular-nums text-muted">
              {catalog.total} {catalog.total === 1 ? 'asset' : 'assets'}
            </div>
          </div>
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.items.map((asset) => (
              <article key={asset.id} className="group">
                <Link href={`/assets-3d/${asset.slug}`} className="block">
                  <Asset3dThumbnail
                    url={asset.thumbnailUrl}
                    title={asset.title}
                    className="border border-border transition-colors group-hover:border-border-strong"
                  />
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.025em] group-hover:text-accent">
                        {asset.title}
                      </h2>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {asset.category}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-accent">
                      Open
                    </span>
                  </div>
                </Link>
                {asset.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                    {asset.description}
                  </p>
                )}
                {asset.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {asset.tags.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setTag(value);
                          void load({ tag: value });
                        }}
                      >
                        <Badge>{value}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
