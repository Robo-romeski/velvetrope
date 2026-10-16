'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth, apiPatchAuth, isUnauthorized } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  Card,
  FormField,
  LoadingState,
  PageHeader,
  PageShell,
  Select,
  TextLink,
} from '@/app/components/ui';

type VisibilityLevel = 'public' | 'members' | 'private';
type MessagePermission = 'following' | 'members' | 'none';

type OwnProfile = {
  visibility: {
    bio: VisibilityLevel;
    interests: VisibilityLevel;
    links: VisibilityLevel;
    avatarUrl: VisibilityLevel;
  };
  messagePermission: MessagePermission;
};

const visibilityOptions = [
  { value: 'members', label: 'Signed-in members' },
  { value: 'public', label: 'Anyone (public)' },
  { value: 'private', label: 'Only me' },
];

const fieldLabels: Record<keyof OwnProfile['visibility'], string> = {
  bio: 'Bio',
  interests: 'Interests',
  links: 'Links',
  avatarUrl: 'Avatar',
};

export default function PrivacySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fsettings%2Fprivacy');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = (await apiGetAuth('/members/me/profile')) as OwnProfile;
        if (mounted) setProfile(data);
      } catch (e) {
        if (!mounted) return;
        if (isUnauthorized(e)) {
          router.replace('/auth/login?next=%2Fsettings%2Fprivacy');
        } else {
          setError(e instanceof Error ? e.message : 'Could not load settings');
        }
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
      await apiPatchAuth('/members/me/profile', {
        visibility: profile.visibility,
        messagePermission: profile.messagePermission,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
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
        <Alert tone="danger">{error ?? 'Settings unavailable'}</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/settings/profile">← Profile settings</TextLink>
      <PageHeader
        title="Privacy"
        description="Control who can see profile fields and who can start a conversation with you."
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {saved && <Alert tone="success">Privacy settings saved.</Alert>}
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField
            label="Who can message you"
            hint="Blocks always take priority."
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
            {(Object.keys(fieldLabels) as (keyof OwnProfile['visibility'])[]).map(
              (key) => (
                <FormField key={key} label={`${fieldLabels[key]} visibility`}>
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
              ),
            )}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save privacy'}
          </Button>
        </form>
      </Card>
      <Card className="p-5 space-y-2 text-sm">
        <p className="font-medium">Related</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/settings/blocks" className="text-accent">
            Blocked members
          </Link>
          <Link href="/trust/export" className="text-accent">
            Export my data
          </Link>
          <Link href="/trust/code-of-conduct" className="text-accent">
            Code of conduct
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
