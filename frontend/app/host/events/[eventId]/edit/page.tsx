'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatchAuth } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';

function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditHostEventPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || authLoading || !user) return;
    let mounted = true;
    (async () => {
      try {
        const event = await apiGet(`/events/${encodeURIComponent(eventId)}`);
        if (!mounted) return;
        setTitle(event.title ?? '');
        setDescription(event.description ?? '');
        setDate(toLocalInput(event.date));
        setCapacity(event.capacity ?? 20);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Could not load event');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId, authLoading, user]);

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="Edit event" />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPatchAuth(`/events/${encodeURIComponent(eventId)}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        capacity: Number(capacity),
      });
      router.push('/host/events');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed';
      if (message.includes('401') || message === 'Unauthorized') {
        setError('Log in as a host to edit events.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <HostEventNav eventId={eventId} />
      <h1 className="text-2xl font-semibold">Edit event</h1>
      {loading && <div className="text-sm">Loading…</div>}
      {!loading && error && !title && (
        <div className="space-y-3">
          <div className="text-sm text-red-600">{error}</div>
          <Link href="/host/events" className="text-sm underline">
            Back to events
          </Link>
        </div>
      )}
      {!loading && !(!title && error) && (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm space-y-1">
            <span>Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-transparent"
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-transparent"
              rows={3}
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Date</span>
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-transparent"
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>Capacity</span>
            <input
              required
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 bg-transparent"
            />
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <Link href="/host/events" className="text-sm underline">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
