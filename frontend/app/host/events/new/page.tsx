'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPostAuth, isUnauthorized } from '@/lib/api';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  Textarea,
} from '@/app/components/ui';

export default function NewHostEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [isDiscoveryVisible, setIsDiscoveryVisible] = useState(true);
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
        isDiscoveryVisible,
      });
      router.push('/host/events');
      return created;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Create failed';
      if (isUnauthorized(e)) {
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
      <PageShell size="narrow">
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="New event" />;
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Host workspace"
        title="Create an event"
        description="Start with the essentials. You can refine the guest form, invites, and ticket settings next."
      />
      <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Title" htmlFor="new-event-title">
            <Input
              id="new-event-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label="Description" htmlFor="new-event-description">
            <Textarea
              id="new-event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Date and time" htmlFor="new-event-date">
              <Input
                id="new-event-date"
                required
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </FormField>
            <FormField label="Capacity" htmlFor="new-event-capacity">
              <Input
                id="new-event-capacity"
                required
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </FormField>
          </div>
          <label className="flex items-start gap-3 border border-border bg-surface-subtle p-4 text-sm">
            <input
              type="checkbox"
              checked={isDiscoveryVisible}
              onChange={(event) =>
                setIsDiscoveryVisible(event.target.checked)
              }
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              Include this event in public discovery
              <span className="block text-xs text-muted">
                Turn this off for test, demo, rehearsal, or private-link events.
                The record remains available in your host workspace.
              </span>
            </span>
          </label>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <ButtonLink href="/host/events" variant="secondary">
              Cancel
            </ButtonLink>
            <Button
            type="submit"
            disabled={saving}
            >
              {saving ? 'Saving…' : 'Create draft'}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
