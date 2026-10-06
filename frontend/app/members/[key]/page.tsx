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
  isUnauthorized,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, authLoading]);

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
            <Button type="button" variant="secondary" onClick={blockMember}>
              Block
            </Button>
          </div>
        )}
        {isSelf && (
          <TextLink href="/settings/profile">Edit your profile</TextLink>
        )}
      </Card>
    </PageShell>
  );
}
