'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  Textarea,
} from '@/app/components/ui';

type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  privacy: 'public' | 'private';
  memberCount: number;
  isMember: boolean;
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = user
        ? ((await apiGetAuth('/groups')) as GroupSummary[])
        : ((await apiGet('/groups')) as GroupSummary[]);
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = (await apiPostAuth('/groups', {
        name,
        description,
        privacy,
      })) as GroupSummary;
      router.push(`/community/groups/${created.slug}`);
    } catch (e) {
      if (isUnauthorized(e)) {
        router.push('/auth/login?next=%2Fcommunity');
      } else {
        setError(e instanceof Error ? e.message : 'Create failed');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageShell size="wide" className="space-y-10">
      {user && (
        <nav aria-label="Community sections" className="flex gap-4 text-sm">
          <Link href="/feed" className="font-semibold text-accent">
            Feed
          </Link>
          <span aria-current="page" className="font-semibold">
            Groups
          </span>
          <Link href="/notifications" className="font-semibold text-accent">
            Notifications
          </Link>
        </nav>
      )}
      <PageHeader
        eyebrow="Community groups"
        title="Enter through a shared question."
        description="Topic-led spaces for lived experience and practical exchange. Public summaries are visible here; posts and participation remain inside the community."
        actions={
          user ? (
            <Button type="button" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Cancel' : 'Create group'}
            </Button>
          ) : (
            <ButtonLink href="/auth/login?next=%2Fcommunity">Log in to join</ButtonLink>
          )
        }
      />

      {!user && !authLoading && (
        <Alert tone="info">
          You can preview public topics below.{' '}
          <Link
            className="font-semibold underline underline-offset-4"
            href="/auth/register?next=%2Fcommunity"
          >
            Create an account
          </Link>{' '}
          to enter a group, read posts, and participate.
        </Alert>
      )}

      {showCreate && user && (
        <Card className="p-6">
          <form onSubmit={onCreate} className="space-y-4 max-w-lg">
            <FormField label="Group name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </FormField>
            <FormField label="Privacy">
              <Select
                value={privacy}
                onChange={(e) =>
                  setPrivacy(e.target.value as 'public' | 'private')
                }
              >
                <option value="public">Public — listed for all members</option>
                <option value="private">Private — members only</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create group'}
            </Button>
          </form>
        </Card>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {loading || authLoading ? (
        <LoadingState />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No public conversations yet"
          description={
            user
              ? 'Start a space around a topic you care about.'
              : 'Public topic summaries will appear here when they are published.'
          }
        />
      ) : (
        <section
          aria-labelledby="topics-heading"
          className="bg-surface-subtle px-5 py-8 sm:px-10 sm:py-10"
        >
          <div className="mb-6 max-w-xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
              Current topics
            </p>
            <h2
              id="topics-heading"
              className="mt-2 font-display text-2xl font-semibold"
            >
              Enter through a shared question.
            </h2>
          </div>
          <div className="border-t border-foreground/30">
            {groups.map((group, index) => {
              const path = `/community/groups/${group.slug}`;
              const href = user
                ? path
                : `/auth/login?next=${encodeURIComponent(path)}`;
              return (
                <article
                  key={group.id}
                  className="grid gap-3 border-b border-foreground/30 py-6 sm:grid-cols-[2.5rem_1fr_auto]"
                >
                  <span className="font-display text-lg text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h3 className="font-display text-2xl font-semibold">
                        {group.name}
                      </h3>
                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                        {group.privacy}
                      </span>
                    </div>
                    {group.description && (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                        {group.description}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted">
                      {group.memberCount}{' '}
                      {group.memberCount === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <Link
                    href={href}
                    className="self-start text-sm font-semibold text-accent underline-offset-4 hover:underline"
                  >
                    {user
                      ? group.isMember
                        ? 'Open topic'
                        : 'View topic'
                      : 'Log in to enter'}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </PageShell>
  );
}
