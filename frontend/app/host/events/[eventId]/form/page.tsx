'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPutAuth, apiPostAuth } from '@/lib/api';
import { useParams } from 'next/navigation';

export default function HostEventFormEditor() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [schemaText, setSchemaText] = useState('{"fields": []}');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'cancelled' | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!eventId) return;
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
  }, [eventId]);

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
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application Form - {eventId}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 border rounded">Status: {eventStatus ?? 'unknown'}</span>
          <button onClick={publish} disabled={loading} className="px-3 py-1 border rounded disabled:opacity-50">Publish</button>
          <button onClick={cancel} disabled={loading} className="px-3 py-1 border rounded disabled:opacity-50">Cancel</button>
        </div>
      </div>
      <p className="text-sm text-gray-500">Edit JSON schema for the application form.</p>
      <textarea
        className="w-full h-80 border rounded p-2 font-mono text-sm"
        value={schemaText}
        onChange={(e) => setSchemaText(e.target.value)}
      />
      <button
        onClick={onSave}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
      {message && <div className="text-sm">{message}</div>}
    </div>
  );
}


