'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
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
import {
  apiDeleteAuth,
  apiGetAuth,
  apiPostAuth,
  isUnauthorized,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type {
  SocialComment,
  SocialDiscovery,
  SocialPost,
} from '@/lib/social';

type FeedScope = 'following' | 'discover';

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function linkLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scope, setScope] = useState<FeedScope>('following');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [discovery, setDiscovery] = useState<SocialDiscovery>({
    members: [],
    groups: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postBody, setPostBody] = useState('');
  const [postLink, setPostLink] = useState('');
  const [postAudience, setPostAudience] =
    useState<'members' | 'followers'>('members');
  const [posting, setPosting] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, SocialComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const load = useCallback(
    async (nextScope: FeedScope, query: string) => {
      setLoading(true);
      setError(null);
      try {
        const [feed, found] = await Promise.all([
          apiGetAuth(`/social/feed?scope=${nextScope}`),
          apiGetAuth(`/social/discovery?q=${encodeURIComponent(query.trim())}`),
        ]);
        setPosts(Array.isArray(feed) ? feed : []);
        setDiscovery(
          found && typeof found === 'object'
            ? (found as SocialDiscovery)
            : { members: [], groups: [] },
        );
      } catch (cause) {
        if (isUnauthorized(cause)) {
          router.replace('/auth/login?next=%2Ffeed');
        } else {
          setError(
            cause instanceof Error ? cause.message : 'Could not load community',
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Ffeed');
      return;
    }
    void load('following', '');
  }, [authLoading, load, router, user]);

  const changeScope = (nextScope: FeedScope) => {
    setScope(nextScope);
    void load(nextScope, search);
  };

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!postBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await apiPostAuth('/social/posts', {
        body: postBody,
        linkUrl: postLink.trim() || null,
        audience: postAudience,
      });
      setPostBody('');
      setPostLink('');
      setScope('following');
      await load('following', search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish post');
    } finally {
      setPosting(false);
    }
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    void load(scope, search);
  };

  const toggleFollow = async (member: SocialDiscovery['members'][number]) => {
    try {
      if (member.isFollowing) {
        await apiDeleteAuth(`/members/${member.userId}/follow`);
      } else {
        await apiPostAuth(`/members/${member.userId}/follow`, {});
      }
      await load(scope, search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update follow');
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const rows = (await apiGetAuth(
        `/posts/${encodeURIComponent(postId)}/comments`,
      )) as SocialComment[];
      setComments((current) => ({
        ...current,
        [postId]: Array.isArray(rows) ? rows : [],
      }));
      setExpandedPost(postId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load comments');
    }
  };

  const submitComment = async (post: SocialPost) => {
    const body = commentDrafts[post.id]?.trim();
    if (!body) return;
    try {
      await apiPostAuth(`/posts/${encodeURIComponent(post.id)}/comments`, {
        body,
      });
      setCommentDrafts((current) => ({ ...current, [post.id]: '' }));
      await loadComments(post.id);
      await load(scope, search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add comment');
    }
  };

  if (authLoading || (loading && posts.length === 0)) {
    return (
      <PageShell size="wide">
        <LoadingState label="Loading your community…" />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide" className="space-y-8">
      <PageHeader
        eyebrow="Community"
        title="What members are sharing."
        description="Follow people you value, join topic groups, and exchange practical experience. This is a community feed—not a dating or matching system."
        actions={
          <div className="flex gap-3 text-sm">
            <Link href="/community" className="font-semibold text-accent">
              Browse groups
            </Link>
            <Link href="/notifications" className="font-semibold text-accent">
              Notifications
            </Link>
          </div>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <form onSubmit={submitPost} className="space-y-4">
              <FormField label="Share with the community">
                <Textarea
                  value={postBody}
                  onChange={(event) => setPostBody(event.target.value)}
                  rows={4}
                  maxLength={20_000}
                  placeholder="Share an experience, question, or useful observation…"
                  required
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
                <FormField label="Useful link (optional)">
                  <Input
                    type="url"
                    value={postLink}
                    onChange={(event) => setPostLink(event.target.value)}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Audience">
                  <Select
                    value={postAudience}
                    onChange={(event) =>
                      setPostAudience(
                        event.target.value as 'members' | 'followers',
                      )
                    }
                  >
                    <option value="members">All members</option>
                    <option value="followers">Followers only</option>
                  </Select>
                </FormField>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted">
                  Text and links only. Blocks apply across the feed.
                </p>
                <Button type="submit" disabled={posting || !postBody.trim()}>
                  {posting ? 'Publishing…' : 'Publish'}
                </Button>
              </div>
            </form>
          </Card>

          <div className="flex border-b border-border-strong" role="tablist">
            {(['following', 'discover'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={scope === value}
                onClick={() => changeScope(value)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${
                  scope === value
                    ? 'border-accent text-foreground'
                    : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingState label="Refreshing feed…" />
          ) : posts.length === 0 ? (
            <EmptyState
              title={
                scope === 'following'
                  ? 'Your following feed is quiet'
                  : 'No member posts yet'
              }
              description={
                scope === 'following'
                  ? 'Follow members or join groups to shape this feed—or publish the first post.'
                  : 'Community-wide posts will appear here as members publish them.'
              }
            />
          ) : (
            <section aria-label={`${scope} feed`} className="border-t border-border">
              {posts.map((post) => {
                const canComment = !post.group || post.group.isMember;
                return (
                  <article
                    key={post.id}
                    id={`post-${post.id}`}
                    className="border-b border-border py-6"
                  >
                    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Link
                        href={`/members/${post.author.slug}`}
                        className="font-semibold text-foreground hover:text-accent"
                      >
                        {post.author.displayName ?? post.author.slug}
                      </Link>
                      <span className="text-xs text-muted">
                        @{post.author.slug}
                      </span>
                      <time
                        dateTime={post.createdAt}
                        className="text-xs text-muted sm:ml-auto"
                      >
                        {formatTime(post.createdAt)}
                      </time>
                    </header>
                    <div className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-7">
                      {post.body}
                    </div>
                    {post.linkUrl && (
                      <a
                        href={post.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block border-l-2 border-accent bg-surface-subtle px-4 py-3 text-sm font-semibold text-accent hover:underline"
                      >
                        {linkLabel(post.linkUrl)} ↗
                      </a>
                    )}
                    <footer className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {post.group ? (
                        <Link
                          href={`/community/groups/${post.group.slug}`}
                          className="font-semibold text-accent"
                        >
                          {post.group.name}
                        </Link>
                      ) : (
                        <Badge tone="neutral">
                          {post.audience === 'followers'
                            ? 'Followers'
                            : 'Members'}
                        </Badge>
                      )}
                      <button
                        type="button"
                        className="font-semibold hover:text-accent"
                        onClick={() =>
                          expandedPost === post.id
                            ? setExpandedPost(null)
                            : void loadComments(post.id)
                        }
                      >
                        {post.commentCount}{' '}
                        {post.commentCount === 1 ? 'comment' : 'comments'}
                      </button>
                    </footer>

                    {expandedPost === post.id && (
                      <div className="mt-4 space-y-3 border-l border-border pl-4">
                        {(comments[post.id] ?? []).map((comment) => (
                          <div key={comment.id} className="text-sm leading-6">
                            <Link
                              href={`/members/${comment.author.slug}`}
                              className="font-semibold hover:text-accent"
                            >
                              {comment.author.displayName ?? comment.author.slug}
                            </Link>{' '}
                            <span className="text-muted">{comment.body}</span>
                          </div>
                        ))}
                        {canComment ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              aria-label="Add a comment"
                              placeholder="Add a thoughtful comment"
                              value={commentDrafts[post.id] ?? ''}
                              onChange={(event) =>
                                setCommentDrafts((current) => ({
                                  ...current,
                                  [post.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void submitComment(post)}
                              disabled={!commentDrafts[post.id]?.trim()}
                            >
                              Reply
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted">
                            Join this group to participate.
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:border-l lg:border-border lg:pl-6">
          <section className="space-y-4">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-accent">
                Discovery
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">
                Find people and topics
              </h2>
            </div>
            <form onSubmit={submitSearch} className="flex gap-2">
              <Input
                aria-label="Search members and groups"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or interest"
              />
              <Button type="submit" size="sm" variant="secondary">
                Search
              </Button>
            </form>
            <div className="divide-y divide-border border-y border-border">
              {discovery.members.slice(0, 6).map((member) => (
                <div key={member.userId} className="py-4">
                  <Link
                    href={`/members/${member.slug}`}
                    className="font-semibold hover:text-accent"
                  >
                    {member.displayName ?? member.slug}
                  </Link>
                  {member.interests && member.interests.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {member.interests.slice(0, 4).join(' · ')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void toggleFollow(member)}
                    className="mt-2 text-xs font-semibold text-accent hover:underline"
                  >
                    {member.isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              ))}
              {discovery.members.length === 0 && (
                <p className="py-4 text-sm text-muted">No members found.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Topic groups</h2>
            {discovery.groups.slice(0, 5).map((group) => (
              <div key={group.id} className="border-b border-border pb-3">
                <Link
                  href={`/community/groups/${group.slug}`}
                  className="font-semibold hover:text-accent"
                >
                  {group.name}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {group.memberCount}{' '}
                  {group.memberCount === 1 ? 'member' : 'members'}
                </p>
              </div>
            ))}
            <Link href="/community" className="text-sm font-semibold text-accent">
              Browse all groups →
            </Link>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
