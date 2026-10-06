'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  Textarea,
} from '@/app/components/ui';

export default function NewLearnContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [educator, setEducator] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentType, setContentType] = useState('guide');
  const [tags, setTags] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Flearn%2Fnew');
      return;
    }
    (async () => {
      try {
        const profile = await apiGetAuth('/members/me/profile');
        setEducator(profile.educator === true);
      } catch {
        setEducator(false);
      }
    })();
  }, [authLoading, user, router]);

  const enableEducator = async () => {
    await apiPostAuth('/learn/educator/enable', {});
    setEducator(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiPostAuth('/learn', {
        title,
        summary,
        contentType,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        externalUrl: contentType === 'workshop_link' ? externalUrl : undefined,
      });
      router.push(`/learn/${created.slug}/edit`);
    } catch (e) {
      if (isUnauthorized(e)) {
        router.replace('/auth/login?next=%2Flearn%2Fnew');
      } else {
        setError(e instanceof Error ? e.message : 'Create failed');
      }
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader title="Create learning content" />
      {!educator && (
        <Alert tone="info">
          Enable educator mode to publish guides and courses.{' '}
          <button type="button" className="underline" onClick={() => void enableEducator()}>
            Enable now
          </button>
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </FormField>
          <FormField label="Summary">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </FormField>
          <FormField label="Type">
            <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              <option value="guide">Guide</option>
              <option value="tutorial">Tutorial</option>
              <option value="course">Course</option>
              <option value="workshop_link">External workshop link</option>
            </Select>
          </FormField>
          <FormField label="Tags" hint="Comma-separated">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </FormField>
          {contentType === 'workshop_link' && (
            <FormField label="Workshop URL">
              <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
            </FormField>
          )}
          <Button type="submit" disabled={busy || !educator}>
            Save draft
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
