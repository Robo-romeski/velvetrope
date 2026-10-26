'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { Asset3dThumbnail } from '@/app/components/assets-3d/Asset3dThumbnail';
import { Asset3dViewer } from '@/app/components/assets-3d/Asset3dViewer';
import {
  Alert,
  Badge,
  Button,
  FormField,
  Input,
  LoadingState,
  Section,
  TextLink,
  Textarea,
} from '@/app/components/ui';
import {
  modelContentType,
  uploadToSignedUrl,
  type SignedAssetUpload,
} from '@/lib/assets-3d-upload';
import { apiGetAuth, apiPatchAuth, apiPostAuth } from '@/lib/api';
import type { AdminAsset3d } from '@/lib/assets-3d';

function imageContentType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLocaleLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export default function AdminAsset3dEditorPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [asset, setAsset] = useState<AdminAsset3d | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'model' | 'thumbnail' | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applyAsset = useCallback((next: AdminAsset3d) => {
    setAsset(next);
    setTitle(next.title);
    setSlug(next.slug);
    setDescription(next.description ?? '');
    setCategory(next.category);
    setTags(next.tags.join(', '));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyAsset(
        (await apiGetAuth(
          `/admin/assets-3d/${encodeURIComponent(id)}`,
        )) as AdminAsset3d,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'The asset could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [applyAsset, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiPatchAuth(`/admin/assets-3d/${id}`, {
        title,
        slug,
        description,
        category,
        tags: tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      })) as AdminAsset3d;
      applyAsset(updated);
      setMessage('Catalog details saved.');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Changes could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (
    kind: 'model' | 'thumbnail',
    file: File | undefined,
  ) => {
    if (!file) return;
    const contentType =
      kind === 'model' ? modelContentType(file) : imageContentType(file);
    setUploading(kind);
    setUploadProgress(0);
    setError(null);
    setMessage(null);
    try {
      const signed = (await apiPostAuth(`/admin/assets-3d/${id}/uploads`, {
        kind,
        filename: file.name,
        contentType,
        sizeBytes: file.size,
      })) as SignedAssetUpload;
      await uploadToSignedUrl(file, signed, setUploadProgress);
      const updated = (await apiPostAuth(
        `/admin/assets-3d/${id}/uploads/complete`,
        {
          kind,
          objectKey: signed.objectKey,
          filename: file.name,
          contentType,
          sizeBytes: file.size,
        },
      )) as AdminAsset3d;
      applyAsset(updated);
      setMessage(
        kind === 'model'
          ? 'Model validated and ready to preview.'
          : 'Thumbnail uploaded.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'The upload did not complete.',
      );
    } finally {
      setUploading(null);
    }
  };

  const changePublication = async (publish: boolean) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiPostAuth(
        `/admin/assets-3d/${id}/${publish ? 'publish' : 'unpublish'}`,
        {},
      )) as AdminAsset3d;
      applyAsset(updated);
      setMessage(
        publish
          ? 'Published to the public 3D library.'
          : 'Unpublished. The public page is now private.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Publication status could not be changed.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Opening the asset editor…" />;
  if (!asset) {
    return (
      <div className="space-y-4">
        <Alert tone="danger">{error ?? 'Asset not found.'}</Alert>
        <TextLink href="/admin/assets-3d">← Asset library</TextLink>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TextLink href="/admin/assets-3d">← Asset library</TextLink>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={asset.status === 'published' ? 'success' : 'neutral'}>
            {asset.status}
          </Badge>
          {asset.status === 'published' && (
            <TextLink href={`/assets-3d/${asset.slug}`}>Public page</TextLink>
          )}
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className="grid gap-8 lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="space-y-7">
          <Section
            title="Catalog details"
            description="These fields become public only after publication."
          >
            <form onSubmit={save} className="space-y-4">
              <FormField label="Title" htmlFor="asset-title">
                <Input
                  id="asset-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={120}
                />
              </FormField>
              <FormField
                label="URL slug"
                hint="Changing this changes the public URL."
                htmlFor="asset-slug"
              >
                <Input
                  id="asset-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                  maxLength={100}
                />
              </FormField>
              <FormField label="Category" htmlFor="asset-category">
                <Input
                  id="asset-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  maxLength={80}
                />
              </FormField>
              <FormField label="Description" htmlFor="asset-description">
                <Textarea
                  id="asset-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  maxLength={4000}
                />
              </FormField>
              <FormField
                label="Tags"
                hint="Comma-separated. Up to 20 tags."
                htmlFor="asset-tags"
              >
                <Input
                  id="asset-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                />
              </FormField>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save details'}
              </Button>
            </form>
          </Section>

          <Section
            title="Files"
            description="GLB is recommended. Standalone glTF JSON must embed all buffers and images."
          >
            <div className="space-y-5 border-y border-border py-5">
              <label className="block space-y-2 text-sm">
                <span className="font-semibold">
                  {asset.hasModel ? 'Replace model' : 'Upload model'}
                </span>
                {asset.modelFilename && (
                  <span className="block text-xs text-muted">
                    Current: {asset.modelFilename}
                  </span>
                )}
                <Input
                  type="file"
                  accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/json"
                  disabled={uploading !== null}
                  onChange={(event) =>
                    void uploadFile('model', event.target.files?.[0])
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-semibold">
                  {asset.hasThumbnail
                    ? 'Replace thumbnail'
                    : 'Upload thumbnail'}
                </span>
                <span className="block text-xs text-muted">
                  JPEG, PNG, or WebP. A neutral fallback appears when omitted.
                </span>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading !== null}
                  onChange={(event) =>
                    void uploadFile('thumbnail', event.target.files?.[0])
                  }
                />
              </label>
              {uploading && (
                <div role="status" className="text-sm">
                  <div className="flex justify-between gap-4">
                    <span>
                      Uploading {uploading === 'model' ? 'model' : 'thumbnail'}…
                    </span>
                    <span className="tabular-nums">{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-accent transition-[width]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section
            title="Publication"
            description="Drafts and their object-storage URLs stay available only to administrators."
          >
            {asset.status === 'published' ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void changePublication(false)}
              >
                Unpublish asset
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy || !asset.hasModel}
                onClick={() => void changePublication(true)}
              >
                Publish asset
              </Button>
            )}
          </Section>
        </div>

        <Section
          title="Private preview"
          description="Inspect framing, materials, controls, and animation before publication."
        >
          {asset.modelUrl ? (
            <Asset3dViewer
              modelUrl={asset.modelUrl}
              thumbnailUrl={asset.thumbnailUrl}
              title={asset.title}
            />
          ) : (
            <Asset3dThumbnail
              url={asset.thumbnailUrl}
              title={asset.title}
              className="border border-border"
            />
          )}
        </Section>
      </div>
    </div>
  );
}
