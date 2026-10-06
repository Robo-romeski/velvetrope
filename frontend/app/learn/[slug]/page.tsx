'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiGetAuth, apiPostAuth, getAccessTokenClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type Lesson = {
  id: string;
  title: string;
  body?: string;
  completed?: boolean;
};

type ContentDetail = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  contentType: string;
  status?: string;
  externalUrl?: string | null;
  priceCents?: number;
  access?: { required: boolean; priceCents: number; status: string };
  creator: { slug: string; displayName: string | null };
  lessons: Lesson[];
  progress?: { completed: number; total: number } | null;
  groupId?: string | null;
};

export default function LearnDetailPage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let token: string | null = null;
      try {
        token = await getAccessTokenClient();
      } catch {
        token = null;
      }
      const data = token
        ? ((await apiGetAuth(`/learn/${slug}`)) as ContentDetail)
        : ((await apiGet(`/learn/${slug}`)) as ContentDetail);
      setContent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const sessionId = searchParams?.get('session_id');
    if (!sessionId || !user) return;
    (async () => {
      try {
        await apiPostAuth(`/learn/${slug}/checkout/confirm`, { sessionId });
        router.replace(`/learn/${slug}`);
        await load();
      } catch {
        // ignore; user can retry purchase
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, slug]);

  const purchase = async () => {
    setError(null);
    try {
      const checkout = (await apiPostAuth(`/learn/${slug}/checkout`, {})) as {
        sessionId: string;
        url: string | null;
      };
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      setError('Checkout could not be started.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout could not be started.');
    }
  };

  const completeLesson = async (lessonId: string) => {
    await apiPostAuth(`/learn/${slug}/lessons/${lessonId}/complete`, {});
    await load();
  };

  const reportContent = async () => {
    if (!content || !user) return;
    await apiPostAuth('/trust/reports', {
      subjectType: 'content',
      subjectId: content.id,
      category: 'other',
      details: 'Member reported this learning content for moderator review.',
    });
    setReportSent(true);
  };

  if (loading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!content) {
    return (
      <PageShell size="narrow">
        <Alert tone="danger">{error ?? 'Content not found'}</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/learn">← Learn</TextLink>
      <PageHeader
        title={content.title}
        description={
          content.summary ??
          `By ${content.creator.displayName ?? 'educator'} · ${content.contentType}`
        }
        actions={
          content.status === 'draft' ? (
            <ButtonLink href={`/learn/${slug}/edit`} variant="secondary">
              Edit draft
            </ButtonLink>
          ) : null
        }
      />
      {content.access?.required && content.access.status === 'pending' && user && (
        <Button type="button" onClick={() => void purchase()}>
          Purchase · ${((content.access.priceCents ?? 0) / 100).toFixed(2)}
        </Button>
      )}
      {content.externalUrl && (
        <ButtonLink href={content.externalUrl} variant="secondary">
          Open workshop link
        </ButtonLink>
      )}
      {content.groupId && (
        <p className="text-sm text-muted">
          Related group:{' '}
          <Link href={`/community/groups/${content.groupId}`} className="text-accent">
            View group
          </Link>
        </p>
      )}
      {content.progress && (
        <p className="text-sm text-muted">
          Progress: {content.progress.completed} / {content.progress.total} lessons
        </p>
      )}
      <div className="space-y-4">
        {content.lessons.map((lesson) => (
          <Card key={lesson.id} className="p-5 space-y-2">
            <h2 className="font-semibold">{lesson.title}</h2>
            {lesson.body ? (
              <p className="text-sm whitespace-pre-wrap text-muted">{lesson.body}</p>
            ) : (
              <p className="text-sm text-muted">
                <Link href={`/auth/login?next=${encodeURIComponent(`/learn/${slug}`)}`}>
                  Log in
                </Link>{' '}
                to read this lesson.
              </p>
            )}
            {user && lesson.body && !lesson.completed && content.status !== 'draft' && (
              <Button type="button" size="sm" onClick={() => void completeLesson(lesson.id)}>
                Mark complete
              </Button>
            )}
            {lesson.completed && (
              <span className="text-xs text-accent">Completed</span>
            )}
          </Card>
        ))}
      </div>
      {user && content.status !== 'draft' && (
        <Button type="button" variant="secondary" onClick={() => void reportContent()}>
          Report content
        </Button>
      )}
      {reportSent && <Alert tone="success">Report submitted to moderators.</Alert>}
    </PageShell>
  );
}
