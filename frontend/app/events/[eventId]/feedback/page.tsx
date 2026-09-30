'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiGetAuth, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventPageNav } from '@/app/components/EventPageNav';

type FeedbackStatus = {
  submitted: boolean;
  rating?: number;
  comment?: string | null;
  anonymous?: boolean;
};

export default function EventFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventStarted, setEventStarted] = useState(false);
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !eventId) return;
    let mounted = true;
    (async () => {
      try {
        const [event, mine] = await Promise.all([
          apiGet(`/events/${encodeURIComponent(eventId)}`),
          apiGetAuth(`/feedback/mine/${encodeURIComponent(eventId)}`),
        ]);
        if (!mounted) return;
        setEventTitle(event?.title ?? null);
        setEventStarted(
          !!event?.date && new Date(event.date).getTime() <= Date.now(),
        );
        setStatus(mine as FeedbackStatus);
      } catch (e) {
        if (mounted) {
          setMessage(e instanceof Error ? e.message : 'Could not load feedback');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, eventId, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiPostAuth(`/feedback/event/${encodeURIComponent(eventId)}`, {
        rating,
        comment: comment.trim() || undefined,
        anonymous,
      });
      setStatus({ submitted: true, rating, comment, anonymous });
      setMessage('Thank you for sharing feedback.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="max-w-xl mx-auto p-6 text-sm">Loading…</div>;
  }
  if (!user) {
    return <HostLoginPrompt title="Event feedback" />;
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <EventPageNav eventId={eventId} title={eventTitle} />
      <h1 className="text-2xl font-semibold">Event feedback</h1>
      {status?.submitted ? (
        <div className="border rounded p-4 text-sm space-y-1">
          <p className="font-medium">Feedback submitted</p>
          <p>Rating: {status.rating}/5</p>
          {status.comment && <p>{status.comment}</p>}
          <p className="text-xs text-gray-500">
            {status.anonymous ? 'Shared anonymously' : 'Shared with your account'}
          </p>
        </div>
      ) : !eventStarted ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Feedback opens after the event starts.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm space-y-1">
            <span>Rating</span>
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="w-full border rounded px-3 py-2 bg-transparent"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm space-y-1">
            <span>Comment (optional)</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={2000}
              rows={5}
              className="w-full border rounded px-3 py-2 bg-transparent"
            />
          </label>
          <label className="flex gap-2 items-start text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
              className="mt-1"
            />
            Share anonymously with the host
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </form>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
