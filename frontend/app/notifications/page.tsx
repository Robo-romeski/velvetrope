'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';
import { apiGetAuth, apiPatchAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { SocialNotifications } from '@/lib/social';

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SocialNotifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fnotifications');
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        const result = (await apiGetAuth(
          '/social/notifications',
        )) as SocialNotifications;
        if (!mounted) return;
        setData(result);
        setError(null);
        if (result.unreadCount > 0) {
          await apiPatchAuth('/social/notifications/read', {});
          if (!mounted) return;
          setData({
            unreadCount: 0,
            items: result.items.map((item) => ({ ...item, unread: false })),
          });
          window.dispatchEvent(
            new Event('epicsexual:notifications-changed'),
          );
        }
      } catch (cause) {
        if (!mounted) return;
        if (isUnauthorized(cause)) {
          router.replace('/auth/login?next=%2Fnotifications');
        } else {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not load notifications',
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [authLoading, router, user]);

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Community"
        title="Notifications"
        description="Follows, replies, thanks, and activity in your groups. Message unread counts stay in Messages only."
        actions={
          <Link href="/feed" className="text-sm font-semibold text-accent">
            Back to feed
          </Link>
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {authLoading || loading ? (
        <LoadingState />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nothing new yet"
          description="Social activity from people and groups you follow will appear here."
        />
      ) : (
        <section aria-label="Notifications" className="border-t border-border-strong">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="grid gap-2 border-b border-border py-5 sm:grid-cols-[1fr_auto]"
            >
              <span>
                <span className="font-semibold">
                  {item.actor.displayName ?? item.actor.slug}
                </span>{' '}
                <span className="text-muted">{item.text}</span>
              </span>
              <time dateTime={item.createdAt} className="text-xs text-muted">
                {formatTime(item.createdAt)}
              </time>
            </Link>
          ))}
        </section>
      )}
    </PageShell>
  );
}
