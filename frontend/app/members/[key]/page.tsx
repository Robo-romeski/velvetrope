'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  apiDeleteAuth,
  apiGet,
  apiGetAuth,
  apiPostAuth,
  getAccessTokenClient,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { GroupSummary, MemberWall, SocialPost } from '@/lib/social';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  Textarea,
  TextLink,
} from '@/app/components/ui';

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

type PublicProfile = {
  userId: string;
  slug: string;
  displayName: string | null;
  bio?: string | null;
  interests?: string[];
  links?: { label: string; url: string }[];
  avatarUrl?: string | null;
  isFollowing?: boolean;
  followerCount: number;
  followingCount: number;
  canMessage?: boolean;
};

type KudoItem = {
  id: string;
  kudoType: string;
  message: string | null;
  contextVerified: boolean;
  giver: { slug: string; displayName: string | null };
};

type KudoTypeOption = { id: string; label: string };

const KUDO_LABELS: Record<string, string> = {
  welcoming: 'Welcoming',
  knowledge_sharing: 'Knowledge sharing',
  respectful_communication: 'Respectful communication',
  event_contribution: 'Event contribution',
};

export default function MemberProfilePage() {
  const params = useParams();
  const key = String(params?.key ?? '');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kudos, setKudos] = useState<KudoItem[]>([]);
  const [kudoTypes, setKudoTypes] = useState<KudoTypeOption[]>([]);
  const [kudoType, setKudoType] = useState('welcoming');
  const [kudoMessage, setKudoMessage] = useState('');
  const [kudoSending, setKudoSending] = useState(false);
  const [kudoSent, setKudoSent] = useState(false);
  const [messageStarting, setMessageStarting] = useState(false);
  const [wall, setWall] = useState<MemberWall | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let token: string | null = null;
      try {
        token = await getAccessTokenClient();
      } catch {
        token = null;
      }
      const data = token
        ? ((await apiGetAuth(`/members/${key}/profile`)) as PublicProfile)
        : ((await apiGet(`/members/${key}/profile`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })) as PublicProfile);
      setProfile(data);
      try {
        const list = token
          ? await apiGetAuth(`/kudos/profile/${encodeURIComponent(key)}`)
          : await apiGet(`/kudos/profile/${encodeURIComponent(key)}`);
        setKudos(Array.isArray(list) ? list : []);
      } catch {
        setKudos([]);
      }
      try {
        const wallData = token
          ? ((await apiGetAuth(
              `/members/${encodeURIComponent(key)}/wall`,
            )) as MemberWall)
          : ((await apiGet(`/members/${encodeURIComponent(key)}/wall`)) as MemberWall);
        setWall(wallData);
      } catch {
        setWall(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Member not found');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void load();
    void apiGet('/kudos/types')
      .then((t) => setKudoTypes(Array.isArray(t) ? t : []))
      .catch(() => setKudoTypes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, authLoading]);

  const sendKudo = async () => {
    if (!profile || !user) return;
    setKudoSending(true);
    setActionError(null);
    setKudoSent(false);
    try {
      await apiPostAuth('/kudos', {
        recipientId: profile.userId,
        kudoType,
        message: kudoMessage.trim() || null,
      });
      setKudoMessage('');
      setKudoSent(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not send kudo');
    } finally {
      setKudoSending(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile || !user) return;
    setActionError(null);
    try {
      if (profile.isFollowing) {
        await apiDeleteAuth(`/members/${profile.userId}/follow`);
      } else {
        await apiPostAuth(`/members/${profile.userId}/follow`, {});
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const blockMember = async () => {
    if (!profile || !user) return;
    setActionError(null);
    try {
      await apiPostAuth(`/members/${profile.userId}/block`, {});
      router.push('/community');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Block failed');
    }
  };

  const startMessage = async () => {
    if (!profile || !user) return;
    setMessageStarting(true);
    setActionError(null);
    try {
      const conversation = (await apiPostAuth('/messages/conversations', {
        recipientId: profile.userId,
      })) as { id: string };
      router.push(`/messages/${conversation.id}`);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Could not start conversation',
      );
      setMessageStarting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell size="narrow">
        <EmptyState title="Member not found" description={error ?? undefined} />
        <TextLink href="/feed" className="mt-4 inline-block">
          Back to community feed
        </TextLink>
      </PageShell>
    );
  }

  const isSelf = user?.id === profile.userId;

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader
        title={profile.displayName ?? 'Member'}
        description={`@${profile.slug}`}
      />
      {actionError && <Alert tone="danger">{actionError}</Alert>}
      <Card className="p-6 space-y-4">
        {profile.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="size-20 rounded-full object-cover"
          />
        )}
        {profile.bio && <p className="text-muted leading-relaxed">{profile.bio}</p>}
        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
        {profile.links && profile.links.length > 0 && (
          <ul className="space-y-1 text-sm">
            {profile.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  className="text-accent underline-offset-2 hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          {profile.followerCount} followers · {profile.followingCount} following
        </p>
        {!user && (
          <Alert tone="info">
            <Link href={`/auth/login?next=${encodeURIComponent(`/members/${key}`)}`}>
              Log in
            </Link>{' '}
            to follow members and join groups.
          </Alert>
        )}
        {user && !isSelf && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={toggleFollow}>
              {profile.isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
            {profile.canMessage ? (
              <Button
                type="button"
                variant="secondary"
                onClick={startMessage}
                disabled={messageStarting}
              >
                {messageStarting ? 'Opening…' : 'Message'}
              </Button>
            ) : (
              <span className="self-center text-xs text-muted">
                Messages closed by this member’s settings
              </span>
            )}
            <Button type="button" variant="secondary" onClick={blockMember}>
              Block
            </Button>
          </div>
        )}
        {user && !isSelf && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Send kudos</p>
            <p className="text-xs text-muted">
              They approve before it appears publicly. Not a rating or safety badge.
            </p>
            {kudoSent && (
              <Alert tone="success" title="Sent">
                Pending their approval in Settings → Kudos.
              </Alert>
            )}
            <FormField label="Type">
              <Select
                value={kudoType}
                onChange={(e) => setKudoType(e.target.value)}
              >
                {(kudoTypes.length ? kudoTypes : [{ id: 'welcoming', label: 'Welcoming' }]).map(
                  (opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ),
                )}
              </Select>
            </FormField>
            <FormField label="Note (optional)">
              <Textarea
                value={kudoMessage}
                onChange={(e) => setKudoMessage(e.target.value)}
                rows={2}
                maxLength={280}
              />
            </FormField>
            <Button type="button" onClick={sendKudo} disabled={kudoSending}>
              {kudoSending ? 'Sending…' : 'Send kudos'}
            </Button>
          </div>
        )}
        {isSelf && (
          <div className="flex flex-wrap gap-3 text-sm">
            <TextLink href="/settings/profile">Edit your profile</TextLink>
            <TextLink href="/settings/kudos">Kudos inbox</TextLink>
          </div>
        )}
      </Card>
      {user && wall && (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Recent posts
            </h2>
            {wall.posts.length === 0 ? (
              <EmptyState
                title="No posts visible to you"
                description={
                  isSelf
                    ? 'Share something from the community feed when you are ready.'
                    : 'They may publish to followers only, or have not posted yet.'
                }
              />
            ) : (
              <ul className="space-y-0 border-t border-border">
                {wall.posts.map((post: SocialPost) => (
                  <li
                    key={post.id}
                    className="border-b border-border py-5"
                  >
                    <time
                      dateTime={post.createdAt}
                      className="text-xs text-muted"
                    >
                      {formatTime(post.createdAt)}
                    </time>
                    <p className="mt-2 whitespace-pre-wrap text-[0.98rem] leading-7">
                      {post.body}
                    </p>
                    {post.linkUrl && (
                      <a
                        href={post.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block text-sm font-semibold text-accent hover:underline"
                      >
                        {post.linkUrl} ↗
                      </a>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {post.group ? (
                        <Link
                          href={`/community/groups/${post.group.slug}`}
                          className="font-semibold text-accent"
                        >
                          {post.group.name}
                        </Link>
                      ) : (
                        <Badge tone="neutral">
                          {post.audience === 'followers' ? 'Followers' : 'Members'}
                        </Badge>
                      )}
                      <span>
                        {post.commentCount}{' '}
                        {post.commentCount === 1 ? 'comment' : 'comments'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!isSelf && wall.posts.length > 0 && (
              <TextLink href="/feed">View in community feed</TextLink>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Topic groups
            </h2>
            {wall.groups.length === 0 ? (
              <EmptyState
                title="No groups shown"
                description={
                  isSelf
                    ? 'Join or create a group from the community directory.'
                    : 'Private groups stay hidden unless you share membership.'
                }
              />
            ) : (
              <ul className="divide-y divide-border border border-border">
                {wall.groups.map((group: GroupSummary) => (
                  <li key={group.id} className="px-4 py-3">
                    <Link
                      href={`/community/groups/${group.slug}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {group.name}
                    </Link>
                    {group.description && (
                      <p className="mt-1 text-sm text-muted line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {group.memberCount}{' '}
                      {group.memberCount === 1 ? 'member' : 'members'}
                      {group.privacy === 'private' ? ' · Private' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <TextLink href="/community">Browse all groups</TextLink>
          </section>
        </>
      )}

      {!user && (
        <Alert tone="info">
          Log in to see posts and groups this member shares with the community.
        </Alert>
      )}

      {kudos.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Kudos shared with them
          </h2>
          <ul className="space-y-3">
            {kudos.map((k) => (
              <Card key={k.id} className="p-4 text-sm space-y-1">
                <p className="font-medium">
                  {KUDO_LABELS[k.kudoType] ?? k.kudoType}
                  {k.contextVerified && (
                    <span className="text-muted font-normal"> · verified context</span>
                  )}
                </p>
                <p className="text-muted">
                  From{' '}
                  <Link href={`/members/${k.giver.slug}`} className="text-accent">
                    {k.giver.displayName ?? k.giver.slug}
                  </Link>
                </p>
                {k.message && <p>{k.message}</p>}
              </Card>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
