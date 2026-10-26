'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Asset3dViewer } from '@/app/components/assets-3d/Asset3dViewer';
import {
  Alert,
  Badge,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';
import { apiGet } from '@/lib/api';
import type { Asset3dDetail } from '@/lib/assets-3d';

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Asset3dDetailPage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const [asset, setAsset] = useState<Asset3dDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiGet(`/assets-3d/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (active) setAsset(data as Asset3dDetail);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : '3D asset not found.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <PageShell size="wide">
        <LoadingState label="Preparing the 3D asset…" />
      </PageShell>
    );
  }

  if (!asset) {
    return (
      <PageShell size="narrow" className="space-y-5">
        <Alert tone="danger">
          {error ?? 'This 3D asset is not available.'}
        </Alert>
        <TextLink href="/assets-3d">← Return to the 3D library</TextLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide" className="space-y-7">
      <TextLink href="/assets-3d">← 3D library</TextLink>
      <PageHeader
        title={asset.title}
        description={asset.description}
        actions={
          <div className="text-right text-xs leading-5 text-muted">
            <div>{asset.category}</div>
            <div>{formatBytes(asset.modelSizeBytes)}</div>
          </div>
        }
      />
      {asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {asset.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
      <Asset3dViewer
        modelUrl={asset.modelUrl}
        thumbnailUrl={asset.thumbnailUrl}
        title={asset.title}
      />
      <p className="max-w-3xl text-sm leading-6 text-muted">
        The viewer preserves the model’s authored materials. Controls work with
        a mouse, trackpad, touchscreen, or keyboard-focused buttons. Animation
        controls appear automatically when the file includes clips.
      </p>
    </PageShell>
  );
}
