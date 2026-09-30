'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';

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
    return <div className="max-w-3xl mx-auto p-6 text-sm">Loading…</div>;
  }
  if (!user) return <HostLoginPrompt title="Event feedback" />;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <HostEventNav eventId={eventId} />
      <h1 className="text-2xl font-semibold">Event feedback</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!summary && !error && <p className="text-sm">Loading…</p>}
      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded p-3">
              <div className="text-xs text-gray-500">Responses</div>
              <div className="text-xl font-semibold">{summary.count}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs text-gray-500">Average rating</div>
              <div className="text-xl font-semibold">
                {summary.averageRating.toFixed(1)} / 5
              </div>
            </div>
          </div>
          <div className="border rounded p-3 text-sm">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex justify-between">
                <span>{rating} stars</span>
                <span>{summary.distribution[String(rating)] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {summary.comments.map((comment) => (
              <div key={comment.id} className="border rounded p-3 text-sm">
                <div className="text-xs text-gray-500">
                  {comment.rating}/5 ·{' '}
                  {comment.authorSub
                    ? `Attendee ${comment.authorSub}`
                    : 'Anonymous'}
                </div>
                <p className="whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
            {summary.comments.length === 0 && (
              <p className="text-sm text-gray-500">No written comments.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
