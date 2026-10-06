'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGetAuth, apiPatchAuth, apiPostAuth } from '@/lib/api';
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
  Textarea,
} from '@/app/components/ui';

type ContentDetail = {
  slug: string;
  title: string;
  summary?: string;
  status?: string;
  priceCents?: number;
  lessons: { id: string; title: string; body?: string }[];
};

export default function EditLearnContentPage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonBody, setLessonBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceCents, setPriceCents] = useState(0);

  const load = async () => {
    const data = (await apiGetAuth(`/learn/${slug}`)) as ContentDetail;
    setContent(data);
    setPriceCents(data.priceCents ?? 0);
  };

  const savePrice = async () => {
    await apiPatchAuth(`/learn/${slug}`, { priceCents });
    await load();
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/learn/${slug}/edit`)}`);
      return;
    }
    (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Cannot edit');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user, authLoading]);

  const addLesson = async (event: FormEvent) => {
    event.preventDefault();
    await apiPostAuth(`/learn/${slug}/lessons`, {
      title: lessonTitle,
      body: lessonBody,
      isPreview: true,
    });
    setLessonTitle('');
    setLessonBody('');
    await load();
  };

  const publish = async () => {
    try {
      await apiPostAuth(`/learn/${slug}/publish`, {});
      router.push(`/learn/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    }
  };

  if (loading || authLoading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!content) {
    return (
      <PageShell size="narrow">
        <Alert tone="danger">{error ?? 'Not found'}</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader
        title={`Edit: ${content.title}`}
        description={`Status: ${content.status ?? 'draft'}`}
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Pricing (USD cents)</h2>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={0}
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value))}
          />
          <Button type="button" variant="secondary" onClick={() => void savePrice()}>
            Save price
          </Button>
        </div>
        <p className="text-xs text-muted">
          Educators need Stripe connected (Host → Payments) before learners can buy paid content.
        </p>
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Lessons</h2>
        <ul className="text-sm space-y-1">
          {content.lessons.map((l) => (
            <li key={l.id}>{l.title}</li>
          ))}
        </ul>
        <form onSubmit={addLesson} className="space-y-3 border-t border-border pt-4">
          <FormField label="Lesson title">
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />
          </FormField>
          <FormField label="Lesson body">
            <Textarea value={lessonBody} onChange={(e) => setLessonBody(e.target.value)} rows={5} required />
          </FormField>
          <Button type="submit">Add lesson</Button>
        </form>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void publish()}>
          Publish
        </Button>
        <Link href={`/learn/${slug}`} className="text-sm text-accent self-center">
          Preview
        </Link>
      </div>
    </PageShell>
  );
}
