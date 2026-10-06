'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth, apiPostAuth, isUnauthorized } from '@/lib/api';
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
        : [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
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
    <PageShell size="wide" className="space-y-8">
      <PageHeader
        title="Community"
        description="Topic groups for conversation and learning—separate from event invitations."
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
          Sign in to browse groups, follow members, and customize your profile.{' '}
          <Link href="/auth/register?next=%2Fcommunity">Create an account</Link>
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
      ) : user && groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="Start a space around a topic you care about."
        />
      ) : (
        user && (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <Card key={group.id} className="p-5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{group.name}</h2>
                  <span className="text-xs uppercase text-muted">{group.privacy}</span>
                </div>
                {group.description && (
                  <p className="text-sm text-muted line-clamp-3">{group.description}</p>
                )}
                <p className="text-xs text-muted">{group.memberCount} members</p>
                <Link
                  href={`/community/groups/${group.slug}`}
                  className="text-sm font-medium text-accent mt-auto"
                >
                  {group.isMember ? 'Open group →' : 'View group →'}
                </Link>
              </Card>
            ))}
          </div>
        )
      )}
    </PageShell>
  );
}
