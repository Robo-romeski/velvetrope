'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetAuth, isUnauthorized } from '@/lib/api';
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
} from '@/app/components/ui';

type SearchResult = {
  query: string;
  members: Array<{
    userId: string;
    slug: string;
    displayName: string | null;
    bio?: string | null;
  }>;
  groups: Array<{ slug: string; name: string; description?: string | null }>;
  learning: Array<{ slug: string; title: string; summary?: string | null }>;
  events: Array<{ id: string; title: string; description?: string | null }>;
};

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const data = (await apiGetAuth(
        `/search?q=${encodeURIComponent(query.trim())}`,
      )) as SearchResult;
      setResult(data);
    } catch (e) {
      if (isUnauthorized(e)) {
        router.replace(`/auth/login?next=${encodeURIComponent('/search')}`);
      } else {
        setError(e instanceof Error ? e.message : 'Search failed');
      }
    } finally {
      setSearching(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell size="narrow">
        <Alert tone="info">
          <Link href={`/auth/login?next=${encodeURIComponent('/search')}`}>
            Log in
          </Link>{' '}
          to search members, groups, learning, and events.
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-6">
      <PageHeader
        title="Search"
        description="Find people, groups, courses, and public gatherings."
      />
      <Card className="p-5">
        <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
          <FormField label="Query">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, topic, event title…"
            />
          </FormField>
          <Button type="submit" disabled={searching} className="self-end">
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </form>
      </Card>
      {error && <Alert tone="danger">{error}</Alert>}
      {result && (
        <div className="space-y-6">
          <Section title="Members" empty={result.members.length === 0}>
            {result.members.map((m) => (
              <Link
                key={m.userId}
                href={`/members/${m.slug}`}
                className="block text-sm text-accent"
              >
                {m.displayName ?? m.slug}
              </Link>
            ))}
          </Section>
          <Section title="Groups" empty={result.groups.length === 0}>
            {result.groups.map((g) => (
              <Link
                key={g.slug}
                href={`/community/groups/${g.slug}`}
                className="block text-sm text-accent"
              >
                {g.name}
              </Link>
            ))}
          </Section>
          <Section title="Learn" empty={result.learning.length === 0}>
            {result.learning.map((item) => (
              <Link
                key={item.slug}
                href={`/learn/${item.slug}`}
                className="block text-sm text-accent"
              >
                {item.title}
              </Link>
            ))}
          </Section>
          <Section title="Events" empty={result.events.length === 0}>
            {result.events.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="block text-sm text-accent"
              >
                {ev.title}
              </Link>
            ))}
          </Section>
        </div>
      )}
    </PageShell>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {empty ? (
        <p className="text-sm text-muted">No matches.</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </Card>
  );
}
