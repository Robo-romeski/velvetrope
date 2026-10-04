'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import {
  Alert,
  Card,
  EmptyState,
  LoadingState,
  MetricTile,
  PageHeader,
  PageShell,
  Section,
} from '@/app/components/ui';

type FeedbackSummary = {
  count: number;
  averageRating: number;
  distribution: Record<string, number>;
  comments: Array<{
    id: string;
    rating: number;
    comment: string;
    authorSub: string | null;
    createdAt: string;
  }>;
};

export default function HostFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !eventId) return;
    let mounted = true;
    (async () => {
      try {
        const data = await apiGetAuth(
          `/feedback/event/${encodeURIComponent(eventId)}`,
        );
        if (mounted) setSummary(data as FeedbackSummary);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Could not load feedback');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, eventId, user]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }
  if (!user) return <HostLoginPrompt title="Event feedback" />;

  return (
    <PageShell className="space-y-8">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Guest sentiment"
        title="Event feedback"
        description="A private view of ratings and comments shared after the event."
      />
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      {!summary && !error && <LoadingState label="Loading feedback…" />}
      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Responses" value={summary.count} />
            <MetricTile
              label="Average rating"
              value={`${summary.averageRating.toFixed(1)} / 5`}
            />
          </div>
          <Card className="space-y-2 text-sm">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex justify-between">
                <span>{rating} stars</span>
                <span className="font-semibold">
                  {summary.distribution[String(rating)] ?? 0}
                </span>
              </div>
            ))}
          </Card>
          <Section title="Written comments">
            <div className="grid gap-3">
              {summary.comments.map((comment) => (
                <Card key={comment.id} className="text-sm">
                  <div className="text-xs text-muted">
                    {comment.rating}/5 ·{' '}
                    {comment.authorSub
                      ? `Attendee ${comment.authorSub}`
                      : 'Anonymous'}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap leading-6">
                    {comment.comment}
                  </p>
                </Card>
              ))}
              {summary.comments.length === 0 && (
                <EmptyState title="No written comments" />
              )}
            </div>
          </Section>
        </>
      )}
    </PageShell>
  );
}
