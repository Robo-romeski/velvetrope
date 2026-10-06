'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  apiGetAuth,
  apiPostAuth,
  isUnauthorized,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  Textarea,
  TextLink,
} from '@/app/components/ui';

type GroupDetail = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  privacy: string;
  memberCount: number;
  isMember: boolean;
};

type GroupPost = {
  id: string;
  title?: string | null;
  body: string;
  createdAt: string;
  commentCount: number;
  author: { userId: string; slug: string; displayName: string | null };
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { userId: string; slug: string; displayName: string | null };
};

export default function GroupPage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const g = (await apiGetAuth(`/groups/${slug}`)) as GroupDetail;
      setGroup(g);
      const p = (await apiGetAuth(`/groups/${slug}/posts`)) as GroupPost[];
      setPosts(Array.isArray(p) ? p : []);
    } catch (e) {
      if (isUnauthorized(e)) {
        router.replace(`/auth/login?next=${encodeURIComponent(`/community/groups/${slug}`)}`);
      } else {
        setError(e instanceof Error ? e.message : 'Could not load group');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/community/groups/${slug}`)}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user, authLoading]);

  const join = async () => {
    try {
      await apiPostAuth(`/groups/${slug}/join`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Join failed');
    }
  };

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiPostAuth(`/groups/${slug}/posts`, {
        title: postTitle,
        body: postBody,
      });
      setPostTitle('');
      setPostBody('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    }
  };

  const loadComments = async (postId: string) => {
    const rows = (await apiGetAuth(`/posts/${postId}/comments`)) as Comment[];
    setComments((prev) => ({ ...prev, [postId]: rows }));
    setExpandedPost(postId);
  };

  const submitComment = async (postId: string) => {
    const body = commentDraft[postId]?.trim();
    if (!body) return;
    await apiPostAuth(`/posts/${postId}/comments`, { body });
    setCommentDraft((prev) => ({ ...prev, [postId]: '' }));
    await loadComments(postId);
    await load();
  };

  if (loading || authLoading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!group) {
    return (
      <PageShell size="narrow">
        <Alert tone="danger">{error ?? 'Group not found'}</Alert>
        <TextLink href="/community" className="mt-4 inline-block">
          All groups
        </TextLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/community">← Community</TextLink>
      <PageHeader
        title={group.name}
        description={group.description ?? `${group.memberCount} members · ${group.privacy}`}
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {!group.isMember && (
        <Button type="button" onClick={join}>
          Join group
        </Button>
      )}
      {group.isMember && (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">New discussion</h2>
          <form onSubmit={submitPost} className="space-y-3">
            <FormField label="Title (optional)">
              <Input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            </FormField>
            <FormField label="Message">
              <Textarea
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                rows={4}
                required
              />
            </FormField>
            <Button type="submit">Post</Button>
          </form>
        </Card>
      )}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-5 space-y-2">
            {post.title && <h3 className="font-semibold">{post.title}</h3>}
            <p className="text-sm whitespace-pre-wrap">{post.body}</p>
            <p className="text-xs text-muted">
              <Link href={`/members/${post.author.slug}`} className="text-accent">
                {post.author.displayName ?? 'Member'}
              </Link>
              {' · '}
              {post.commentCount} comments
            </p>
            {group.isMember && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    expandedPost === post.id
                      ? setExpandedPost(null)
                      : void loadComments(post.id)
                  }
                >
                  {expandedPost === post.id ? 'Hide comments' : 'View comments'}
                </Button>
                {expandedPost === post.id && (
                  <div className="border-t border-border pt-3 space-y-2">
                    {(comments[post.id] ?? []).map((c) => (
                      <div key={c.id} className="text-sm">
                        <span className="font-medium">
                          {c.author.displayName ?? 'Member'}:
                        </span>{' '}
                        {c.body}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment"
                        value={commentDraft[post.id] ?? ''}
                        onChange={(e) =>
                          setCommentDraft((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void submitComment(post.id)}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
