'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  API_BASE,
  apiGetAuth,
  apiPatchAuth,
  apiPostAuth,
  apiPostAuthForm,
  isUnauthorized,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { paymentsEnabled } from '@/lib/payments-enabled';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  Textarea,
} from '@/app/components/ui';

type VisibilityLevel = 'public' | 'members' | 'private';
type MessagePermission = 'following' | 'members' | 'none';

type OwnProfile = {
  userId: string;
  slug: string;
  displayName: string | null;
  bio: string | null;
  interests: string[];
  links: { label: string; url: string }[];
  avatarUrl: string | null;
  visibility: {
    bio: VisibilityLevel;
    interests: VisibilityLevel;
    links: VisibilityLevel;
    avatarUrl: VisibilityLevel;
  };
  educator: boolean;
  messagePermission: MessagePermission;
};

const visibilityOptions = [
  { value: 'members', label: 'Signed-in members' },
  { value: 'public', label: 'Anyone (public)' },
  { value: 'private', label: 'Only me' },
];

export default function ProfileSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [interestsText, setInterestsText] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fsettings%2Fprofile');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = (await apiGetAuth('/members/me/profile')) as OwnProfile;
        if (!mounted) return;
        setProfile(data);
        setInterestsText((data.interests ?? []).join(', '));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, user, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const interests = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = (await apiPatchAuth('/members/me/profile', {
        displayName: profile.displayName,
        bio: profile.bio,
        interests,
        links: profile.links,
        avatarUrl: profile.avatarUrl,
        visibility: profile.visibility,
        messagePermission: profile.messagePermission,
      })) as OwnProfile;
      setProfile(updated);
      setSaved(true);
    } catch (e) {
      if (isUnauthorized(e)) {
        router.replace('/auth/login?next=%2Fsettings%2Fprofile');
      } else {
        setError(e instanceof Error ? e.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setError(null);
    setSaved(false);
    try {
      const request = (await apiPostAuth('/members/me/avatar/upload-request', {
        contentType: file.type,
        sizeBytes: file.size,
      })) as
        | { mode: 'direct' }
        | {
            mode: 's3';
            uploadUrl: string;
            headers: Record<string, string>;
            contentType: string;
            sizeBytes: number;
          };

      let avatarUrl: string;
      if (request.mode === 'direct') {
        const form = new FormData();
        form.append('file', file);
        const result = (await apiPostAuthForm(
          '/members/me/avatar/file',
          form,
        )) as { avatarUrl: string };
        avatarUrl = result.avatarUrl;
      } else {
        const put = await fetch(request.uploadUrl, {
          method: 'PUT',
          headers: request.headers,
          body: file,
        });
        if (!put.ok) {
          throw new Error('Upload to storage failed. Try again.');
        }
        const result = (await apiPostAuth('/members/me/avatar/complete', {
          contentType: request.contentType,
          sizeBytes: request.sizeBytes,
        })) as { avatarUrl: string };
        avatarUrl = result.avatarUrl;
      }
      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
      setSaved(true);
    } catch (e) {
      if (isUnauthorized(e)) {
        router.replace('/auth/login?next=%2Fsettings%2Fprofile');
      } else {
        setError(e instanceof Error ? e.message : 'Avatar upload failed');
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const addLink = () => {
    if (!profile || !linkLabel.trim() || !linkUrl.trim()) return;
    setProfile({
      ...profile,
      links: [...profile.links, { label: linkLabel.trim(), url: linkUrl.trim() }],
    });
    setLinkLabel('');
    setLinkUrl('');
  };

  if (authLoading || loading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell size="narrow">
        <Alert tone="danger">{error ?? 'Profile unavailable'}</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader
        title="Your profile"
        description="How you show up in the community. Event invites do not change these settings."
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {saved && <Alert tone="success">Profile saved.</Alert>}
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Profile URL">
            <p className="text-sm text-muted">
              epicsexual.com/members/{profile.slug}
            </p>
          </FormField>
          <FormField
            label="Display name"
            hint="What other members see on your profile and posts. Your account name is for sign-in and receipts only."
          >
            <Input
              value={profile.displayName ?? ''}
              onChange={(e) =>
                setProfile({ ...profile, displayName: e.target.value })
              }
              maxLength={80}
            />
          </FormField>
          <FormField label="Bio">
            <Textarea
              value={profile.bio ?? ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
            />
          </FormField>
          <FormField label="Interests" hint="Comma-separated tags">
            <Input
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
            />
          </FormField>
          <FormField
            label="Avatar"
            hint="Upload JPEG, PNG, or WebP (5 MB max), or paste an image URL"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    profile.avatarUrl.startsWith('/')
                      ? `${API_BASE}${profile.avatarUrl}`
                      : profile.avatarUrl
                  }
                  alt=""
                  className="h-16 w-16 rounded-full object-cover bg-muted/20"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-full bg-muted/20"
                  aria-hidden
                />
              )}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={avatarUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAvatar(file);
                    e.target.value = '';
                  }}
                />
                {avatarUploading && (
                  <p className="text-sm text-muted">Uploading…</p>
                )}
              </div>
            </div>
            <Input
              className="mt-3"
              placeholder="https:// optional image URL"
              value={profile.avatarUrl ?? ''}
              onChange={(e) =>
                setProfile({ ...profile, avatarUrl: e.target.value })
              }
            />
          </FormField>
          <FormField
            label="Who can message you"
            hint="Blocks always take priority. You can change this at any time."
          >
            <Select
              value={profile.messagePermission}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  messagePermission: e.target.value as MessagePermission,
                })
              }
            >
              <option value="following">People you follow</option>
              <option value="members">Any signed-in member</option>
              <option value="none">Nobody</option>
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['bio', 'interests', 'links', 'avatarUrl'] as const).map((key) => (
              <FormField key={key} label={`${key} visibility`}>
                <Select
                  value={profile.visibility[key]}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      visibility: {
                        ...profile.visibility,
                        [key]: e.target.value as VisibilityLevel,
                      },
                    })
                  }
                >
                  {visibilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            ))}
          </div>
          <FormField label="Links">
            <ul className="mb-2 space-y-1 text-sm">
              {profile.links.map((link, i) => (
                <li key={`${link.url}-${i}`} className="flex justify-between gap-2">
                  <span>
                    {link.label}: {link.url}
                  </span>
                  <button
                    type="button"
                    className="text-danger text-xs"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        links: profile.links.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Label"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <Input
                placeholder="https://"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={addLink}>
                Add link
              </Button>
            </div>
          </FormField>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>
      <Card className="p-5 space-y-2 text-sm">
        <p className="font-medium">Community</p>
        <p className="text-muted">
          Educator mode:{' '}
          {profile.educator ? 'enabled' : 'off — enable when creating content at Learn → Create'}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/settings/kudos" className="text-accent">
            Kudos inbox
          </Link>
          <Link href="/settings/connections" className="text-accent">
            Followers & following
          </Link>
          <Link href="/settings/blocks" className="text-accent">
            Blocked members
          </Link>
          <Link href="/settings/privacy" className="text-accent">
            Privacy
          </Link>
          {paymentsEnabled() && (
            <Link href="/settings/payouts" className="text-accent">
              Payouts
            </Link>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
