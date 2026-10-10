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
        <TextLink href="/community" className="mt-4 inline-block">
          Back to community
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
      {kudos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Kudos shared with them</h2>
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
