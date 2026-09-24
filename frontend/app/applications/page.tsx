'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetAuth } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventCtaLinks } from '@/app/components/EventCtaLinks';
import { useAuth } from '@/lib/auth';

type MyApplication = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

function statusLabel(status: MyApplication['status']) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending review';
  }
}

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGetAuth('/applications/mine');
        if (!mounted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load applications');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <HostLoginPrompt
        title="My applications"
        message="Log in to see your event applications."
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">My applications</h1>
      {loading && <div className="text-sm">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="space-y-3">
        {items.map((app) => (
          <div key={app.id} className="border rounded p-4 space-y-2">
            <Link href={`/events/${app.eventId}`} className="font-medium text-blue-600 underline">
              {app.eventTitle}
            </Link>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {statusLabel(app.status)}
              {' · '}
              Applied {new Date(app.createdAt).toLocaleString()}
            </div>
            <EventCtaLinks
              eventId={app.eventId}
              applicationStatus={app.status}
              loggedIn
            />
          </div>
        ))}
        {!loading && !error && items.length === 0 && (
          <div className="text-sm text-gray-500 space-y-2">
            <p>You have not applied to any events yet.</p>
            <Link href="/" className="text-blue-600 underline">
              Browse events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
