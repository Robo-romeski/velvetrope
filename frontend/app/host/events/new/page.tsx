'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPostAuth } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { useAuth } from '@/lib/auth';

export default function NewHostEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiPostAuth('/events', {
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        capacity: Number(capacity),
      });
      router.push('/host/events');
      return created;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Create failed';
      if (message.includes('401') || message === 'Unauthorized') {
        setError('Log in as a host to create events.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="New event" />;
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">New event</h1>
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
            {saving ? 'Saving…' : 'Create draft'}
          </button>
          <Link href="/host/events" className="text-sm underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
