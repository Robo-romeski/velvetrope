'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  FormField,
  Input,
  Section,
  TextLink,
  Textarea,
} from '@/app/components/ui';
import { apiPostAuth } from '@/lib/api';
import type { AdminAsset3d } from '@/lib/assets-3d';

export default function NewAdminAsset3dPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const asset = (await apiPostAuth('/admin/assets-3d', {
        title,
        category,
        description,
        tags: tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      })) as AdminAsset3d;
      router.push(`/admin/assets-3d/${asset.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'The draft could not be created.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Add a 3D asset"
      description="Start with catalog metadata. The model remains private until you upload, preview, and publish it."
    >
      <TextLink href="/admin/assets-3d">← Asset library</TextLink>
      {error && <Alert tone="danger">{error}</Alert>}
      <form onSubmit={submit} className="max-w-2xl space-y-5">
        <FormField label="Title" htmlFor="asset-title">
          <Input
            id="asset-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
          />
        </FormField>
        <FormField label="Category" htmlFor="asset-category">
          <Input
            id="asset-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Reference"
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
            placeholder="neutral, reference, animated"
          />
        </FormField>
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating draft…' : 'Create draft and upload'}
        </Button>
      </form>
    </Section>
  );
}
