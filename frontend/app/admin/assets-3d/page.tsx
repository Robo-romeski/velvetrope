'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  ButtonLink,
  EmptyState,
  Input,
  LoadingState,
  Section,
  Select,
  TextLink,
} from '@/app/components/ui';
import { apiGetAuth } from '@/lib/api';
import type { AdminAsset3dSummary, Asset3dStatus } from '@/lib/assets-3d';

type AdminAssetPage = {
  items: AdminAsset3dSummary[];
  total: number;
};

export default function AdminAssets3dPage() {
  const [items, setItems] = useState<AdminAsset3dSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Asset3dStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiGetAuth(
        `/admin/assets-3d?query=${encodeURIComponent(query)}&status=${status}`,
      )) as AdminAssetPage;
      setItems(data.items ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'The 3D asset catalog could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Section
      title="3D asset library"
      description="Upload privately, inspect the model, then publish it to the public collection."
      actions={<ButtonLink href="/admin/assets-3d/new">Add asset</ButtonLink>}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, category, or tag"
          aria-label="Search assets"
        />
        <Select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as Asset3dStatus | 'all')
          }
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? (
        <LoadingState label="Loading 3D assets…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No 3D assets found"
          description="Add a draft to begin the upload and preview workflow."
        />
      ) : (
        <div className="border-t border-border">
          {items.map((asset) => (
            <article
              key={asset.id}
              className="grid gap-4 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-semibold">
                    {asset.title}
                  </h3>
                  <Badge
                    tone={asset.status === 'published' ? 'success' : 'neutral'}
                  >
                    {asset.status}
                  </Badge>
                  {!asset.hasModel && <Badge tone="warning">Model needed</Badge>}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {asset.category} · {asset.slug}
                </div>
                <div className="mt-2 text-xs text-muted">
                  Updated {new Date(asset.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {asset.status === 'published' && (
                  <TextLink href={`/assets-3d/${asset.slug}`}>
                    Public page
                  </TextLink>
                )}
                <ButtonLink
                  href={`/admin/assets-3d/${asset.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Edit and preview
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
