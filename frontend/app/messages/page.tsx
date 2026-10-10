'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';
import { apiGetAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ConversationSummary } from '@/lib/messages';

function formatMessageTime(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fmessages');
      return;
    }
    let mounted = true;
    void apiGetAuth('/messages/conversations')
      .then((data) => {
        if (mounted) {
          setConversations(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!mounted) return;
        if (isUnauthorized(cause)) {
          router.replace('/auth/login?next=%2Fmessages');
        } else {
          setError(cause instanceof Error ? cause.message : 'Could not load messages');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [authLoading, router, user]);

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Private connection"
        title="Messages"
        description="One-to-one conversations between members. Your message settings and blocks apply before every send."
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {authLoading || loading ? (
        <LoadingState label="Loading conversations…" />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No private conversations yet"
          description="Start from a member’s profile when their message settings allow it."
          action={
            <Link
              href="/community"
              className="font-semibold text-accent underline underline-offset-4"
            >
              Explore the community
            </Link>
          }
        />
      ) : (
        <section aria-label="Conversations" className="border-t border-border-strong">
          {conversations.map((conversation) => {
            const member = conversation.otherMember;
            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="grid gap-3 border-b border-border px-1 py-5 transition-colors hover:bg-surface-subtle sm:grid-cols-[3rem_1fr_auto] sm:px-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-display text-lg font-semibold text-accent"
                >
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    (member.displayName ?? member.slug).charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {member.displayName ?? member.slug}
                    </span>
                    <span className="text-xs text-muted">@{member.slug}</span>
                    {conversation.unreadCount > 0 && (
                      <Badge tone="accent">
                        {conversation.unreadCount} unread
                      </Badge>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}${conversation.lastMessage.body}`
                      : 'Conversation started — say hello when you are ready.'}
                  </span>
                </span>
                <time
                  dateTime={conversation.lastMessageAt ?? undefined}
                  className="text-xs text-muted sm:text-right"
                >
                  {formatMessageTime(conversation.lastMessageAt)}
                </time>
              </Link>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
