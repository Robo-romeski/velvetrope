'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  Card,
  FormField,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  Textarea,
  TextLink,
} from '@/app/components/ui';

type ReviewStatus = {
  submitted: boolean;
  rating?: number;
  comment?: string | null;
  anonymous?: boolean;
};

export default function CourseReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const slug = useMemo(() => String(params?.slug ?? ''), [params]);
  const [title, setTitle] = useState<string | null>(null);
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !slug) return;
    let mounted = true;
    (async () => {
      try {
        const [detail, mine] = await Promise.all([
          apiGetAuth(`/learn/${slug}`),
          apiGetAuth(`/learn/${slug}/reviews/mine`),
        ]);
        if (!mounted) return;
        setTitle(detail?.title ?? null);
        setStatus(mine as ReviewStatus);
      } catch (e) {
        if (mounted) {
          setMessage(e instanceof Error ? e.message : 'Could not load review');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, slug, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiPostAuth(`/learn/${slug}/reviews`, {
        rating,
        comment: comment.trim() || undefined,
        anonymous,
      });
      setStatus({ submitted: true, rating, comment, anonymous });
      setMessage('Thank you for your review.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell size="narrow">
        <Alert tone="info">
          <Link href={`/auth/login?next=${encodeURIComponent(`/learn/${slug}/review`)}`}>
            Log in
          </Link>{' '}
          to leave a review.
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href={`/learn/${slug}`}>← Back to course</TextLink>
      <PageHeader
        title="Course review"
        description={title ? `Share feedback on “${title}”` : undefined}
      />
      {message && (
        <Alert tone={status?.submitted ? 'success' : 'danger'}>{message}</Alert>
      )}
      {status?.submitted ? (
        <Card className="p-5 text-sm text-muted">
          You already submitted a {status.rating}-star review.
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Rating">
              <Select
                value={String(rating)}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? '' : 's'}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Comment (optional)">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Show anonymously on creator analytics
            </label>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit review'}
            </Button>
          </form>
        </Card>
      )}
    </PageShell>
  );
}
