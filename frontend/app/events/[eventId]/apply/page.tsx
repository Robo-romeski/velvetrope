'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPostAuth } from '@/lib/api';
import { useParams } from 'next/navigation';

type Field = { name: string; type: string; required?: boolean };

export default function ApplyToEventPage() {
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'cancelled' | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    if (!eventId) return;
    (async () => {
      try {
        // fetch event details for status
        try {
          const ev = await apiGet(`/events/${encodeURIComponent(eventId)}`);
          if (!mounted) return;
          setEventStatus(ev?.status ?? null);
        } catch {
          // ignore
        }

        const data = await apiGet(`/applications/event/${eventId}/form`);
        if (!mounted) return;
        setFields((data?.schema?.fields ?? []) as Field[]);
        // reset errors when schema changes
        setErrors({});
      } catch {
        // no schema yet
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const submit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (eventStatus !== 'published') {
        setMessage('This event is not open for applications.');
        return;
      }
      // client-side required validation
      const missing = (fields || [])
        .filter((f) => f.required)
        .filter((f) => {
          const v = values[f.name];
          return v === undefined || v === null || String(v).trim() === '';
        })
        .map((f) => f.name);
      if (!inviteCode || inviteCode.trim() === '') {
        missing.push('inviteCode');
      }
      if (missing.length > 0) {
        const nextErrors: Record<string, string | null> = {};
        for (const f of fields) {
          nextErrors[f.name] = missing.includes(f.name) ? 'Required' : null;
        }
        if (missing.includes('inviteCode')) nextErrors['inviteCode'] = 'Required';
        setErrors(nextErrors);
        setMessage('Please fill required fields');
        return;
      }

      await apiPostAuth('/applications', {
        eventId,
        answers: values,
        inviteCode: inviteCode?.trim() || undefined,
      });
      setMessage('Submitted');
      setErrors({});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Apply to Event - {eventId}</h1>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Invite Code *</label>
          <input
            className="w-full border rounded p-2"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            aria-invalid={errors['inviteCode'] ? 'true' : 'false'}
            aria-describedby={errors['inviteCode'] ? `inviteCode-error` : undefined}
          />
          {errors['inviteCode'] && (
            <div id={`inviteCode-error`} className="text-xs text-red-600">{errors['inviteCode']}</div>
          )}
        </div>
        {fields.length === 0 && <div className="text-sm text-gray-500">No application form set for this event yet.</div>}
        {fields.map((f) => (
          <div key={f.name} className="space-y-1">
            <label className="block text-sm font-medium">{f.name}{f.required ? ' *' : ''}</label>
            <input
              className="w-full border rounded p-2"
              type={f.type === 'text' ? 'text' : 'text'}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              aria-invalid={errors[f.name] ? 'true' : 'false'}
              aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
            />
            {errors[f.name] && (
              <div id={`${f.name}-error`} className="text-xs text-red-600">{errors[f.name]}</div>
            )}
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
      {message && <div className="text-sm">{message}</div>}
    </div>
  );
}


