'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPutAuth, apiPostAuth } from '@/lib/api';
import { useParams } from 'next/navigation';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { HostEventNav } from '@/app/components/HostEventNav';
import { useAuth } from '@/lib/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  LoadingState,
  PageHeader,
  PageShell,
  Textarea,
} from '@/app/components/ui';

export default function HostEventFormEditor() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [schemaText, setSchemaText] = useState('{"fields": []}');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'cancelled' | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!eventId || authLoading || !user) return;
    (async () => {
      try {
        // load event status
        const ev = await apiGet(`/events/${eventId}`);
        if (!mounted) return;
        setEventStatus(ev?.status ?? null);

        const data = await apiGet(`/applications/event/${eventId}/form`);
        if (!mounted) return;
        if (data?.schema) setSchemaText(JSON.stringify(data.schema, null, 2));
      } catch {
        // ignore if not set yet
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId, authLoading, user]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (!user) {
    return <HostLoginPrompt title="Application form" />;
  }

  const onSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(schemaText || '{}');
      await apiPutAuth(`/applications/event/${eventId}/form`, { schema: parsed });
      setMessage('Saved');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiPostAuth(`/events/${eventId}/publish`, {});
      setEventStatus(res?.status ?? eventStatus);
      setMessage('Published');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiPostAuth(`/events/${eventId}/cancel`, {});
      setEventStatus(res?.status ?? eventStatus);
      setMessage('Cancelled');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="space-y-8">
      <HostEventNav eventId={eventId} />
      <PageHeader
        eyebrow="Guest questions"
        title="Application form"
        description="Define the questions guests answer when they apply."
        actions={
          <Badge tone={eventStatus === 'published' ? 'success' : 'neutral'}>
            {eventStatus ?? 'Unknown'}
          </Badge>
        }
      />
      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Button onClick={publish} disabled={loading} variant="secondary" size="sm">
            Publish event
          </Button>
          <Button onClick={cancel} disabled={loading} variant="ghost" size="sm">
            Cancel event
          </Button>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">JSON schema</span>
          <Textarea
            className="h-80 font-mono text-sm"
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
          />
        </label>
        <Button onClick={onSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save form'}
        </Button>
        {message && (
          <Alert
            tone={
              message === 'Saved' || message === 'Published' ? 'success' : 'info'
            }
            role="status"
          >
            {message}
          </Alert>
        )}
      </Card>
    </PageShell>
  );
}


