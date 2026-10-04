'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiGetAuth, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventPageNav } from '@/app/components/EventPageNav';
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
} from '@/app/components/ui';

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
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }
  if (!user) {
    return <HostLoginPrompt title="Event feedback" />;
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <EventPageNav eventId={eventId} title={eventTitle} />
      <PageHeader
        eyebrow="After the event"
        title="Event feedback"
        description="Help the host understand what worked and what could make the next gathering better."
      />
      {status?.submitted ? (
        <Card className="space-y-3">
          <Alert tone="success" title="Feedback submitted">
            Rating: {status.rating}/5
          </Alert>
          {status.comment && (
            <p className="text-sm leading-6">{status.comment}</p>
          )}
          <p className="text-xs text-muted">
            {status.anonymous ? 'Shared anonymously' : 'Shared with your account'}
          </p>
        </Card>
      ) : !eventStarted ? (
        <Alert tone="info">
          Feedback opens after the event starts.
        </Alert>
      ) : (
        <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          <FormField label="Rating" htmlFor="feedback-rating">
            <Select
              id="feedback-rating"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Comment (optional)" htmlFor="feedback-comment">
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={2000}
              rows={5}
            />
          </FormField>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            Share anonymously with the host
          </label>
          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </form>
        </Card>
      )}
      {message && (
        <Alert tone={status?.submitted ? 'success' : 'info'} role="status">
          {message}
        </Alert>
      )}
    </PageShell>
  );
}
