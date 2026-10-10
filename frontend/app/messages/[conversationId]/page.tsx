'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  LoadingState,
  PageShell,
  Textarea,
} from '@/app/components/ui';
import {
  apiGetAuth,
  apiPatchAuth,
  apiPostAuth,
  isUnauthorized,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ConversationThread } from '@/lib/messages';

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MessageThreadPage() {
  const params = useParams();
  const conversationId = String(params?.conversationId ?? '');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    try {
      const data = (await apiGetAuth(
        `/messages/conversations/${encodeURIComponent(conversationId)}`,
      )) as ConversationThread;
      setThread(data);
      setError(null);
      if (data.conversation.unreadCount > 0) {
        await apiPatchAuth(
          `/messages/conversations/${encodeURIComponent(conversationId)}/read`,
          {},
        );
        window.dispatchEvent(
          new Event('epicsexual:messages-changed'),
        );
        setThread((current) =>
          current
            ? {
                ...current,
                conversation: { ...current.conversation, unreadCount: 0 },
              }
            : current,
        );
      }
    } catch (cause) {
      if (isUnauthorized(cause)) {
        router.replace(
          `/auth/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`,
        );
      } else {
        setError(
          cause instanceof Error ? cause.message : 'Could not load conversation',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(
        `/auth/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`,
      );
      return;
    }
    void loadThread();
    const timer = window.setInterval(() => void loadThread(), 10_000);
    return () => window.clearInterval(timer);
  }, [authLoading, conversationId, loadThread, router, user]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await apiPostAuth(
        `/messages/conversations/${encodeURIComponent(conversationId)}`,
        { body },
      );
      setBody('');
      await loadThread();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <PageShell>
        <LoadingState label="Loading conversation…" />
      </PageShell>
    );
  }

  if (!thread) {
    return (
      <PageShell size="narrow" className="space-y-4">
        <Alert tone="danger">{error ?? 'Conversation unavailable'}</Alert>
        <Link
          href="/messages"
          className="font-semibold text-accent underline underline-offset-4"
        >
          Back to messages
        </Link>
      </PageShell>
    );
  }

  const member = thread.conversation.otherMember;

  return (
    <PageShell className="space-y-6">
      <header className="flex items-center justify-between gap-4 border-b border-border-strong pb-5">
        <div>
          <Link
            href="/messages"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-accent"
          >
            ← Messages
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {member.displayName ?? member.slug}
          </h1>
          <Link
            href={`/members/${member.slug}`}
            className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            @{member.slug}
          </Link>
        </div>
      </header>

      {error && <Alert tone="danger">{error}</Alert>}

      <section
        aria-label={`Conversation with ${member.displayName ?? member.slug}`}
        aria-live="polite"
        className="space-y-4"
      >
        {thread.messages.length === 0 ? (
          <div className="border-y border-border py-10 text-center text-sm text-muted">
            This is a new conversation. Keep it respectful and specific.
          </div>
        ) : (
          thread.messages.map((message) => {
            const own = message.senderId === user?.id;
            return (
              <article
                key={message.id}
                className={`max-w-[85%] border px-4 py-3 sm:max-w-[70%] ${
                  own
                    ? 'ml-auto border-accent/25 bg-accent-soft'
                    : 'border-border bg-surface'
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {message.body}
                </p>
                <time
                  dateTime={message.createdAt}
                  className="mt-2 block text-xs text-muted"
                >
                  {formatMessageTime(message.createdAt)}
                </time>
              </article>
            );
          })
        )}
      </section>

      {thread.conversation.canSend ? (
        <form
          onSubmit={sendMessage}
          className="sticky bottom-0 border-t border-border-strong bg-background py-4"
        >
          <label htmlFor="message-body" className="sr-only">
            Message
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              id="message-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Write a private message…"
              className="resize-y"
            />
            <Button type="submit" disabled={sending || !body.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Text only · {body.length.toLocaleString()} / 4,000
          </p>
        </form>
      ) : (
        <Alert tone="info">
          This member is not currently accepting messages from you.
        </Alert>
      )}
    </PageShell>
  );
}
