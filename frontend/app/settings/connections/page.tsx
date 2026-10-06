'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  TextLink,
} from '@/app/components/ui';

type Person = {
  userId: string;
  slug: string;
  displayName: string | null;
};

export default function ConnectionsSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [followers, setFollowers] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fsettings%2Fconnections');
      return;
    }
    (async () => {
      try {
        const [f1, f2] = await Promise.all([
          apiGetAuth('/members/me/followers'),
          apiGetAuth('/members/me/following'),
        ]);
        setFollowers(Array.isArray(f1) ? f1 : []);
        setFollowing(Array.isArray(f2) ? f2 : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  return (
    <PageShell size="narrow" className="space-y-6">
      <TextLink href="/settings/profile">← Profile settings</TextLink>
      <PageHeader title="Follows" description="Follow lists are private to you." />
      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="font-semibold mb-2">Followers</h2>
            <ul className="space-y-2">
              {followers.map((p) => (
                <Card key={p.userId} className="p-3">
                  <Link href={`/members/${p.slug}`}>{p.displayName ?? p.slug}</Link>
                </Card>
              ))}
              {followers.length === 0 && (
                <p className="text-sm text-muted">No followers yet.</p>
              )}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold mb-2">Following</h2>
            <ul className="space-y-2">
              {following.map((p) => (
                <Card key={p.userId} className="p-3">
                  <Link href={`/members/${p.slug}`}>{p.displayName ?? p.slug}</Link>
                </Card>
              ))}
              {following.length === 0 && (
                <p className="text-sm text-muted">Not following anyone yet.</p>
              )}
            </ul>
          </section>
        </div>
      )}
    </PageShell>
  );
}
