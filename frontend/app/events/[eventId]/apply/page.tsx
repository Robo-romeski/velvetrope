'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPostAuth } from '@/lib/api';
import { useParams } from 'next/navigation';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventPageNav } from '@/app/components/EventPageNav';
import { useAuth } from '@/lib/auth';
import { useMyApplicationByEvent } from '@/lib/my-applications';

type Field = { name: string; type: string; required?: boolean };

export default function ApplyToEventPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const { getStatus, loading: appsLoading } = useMyApplicationByEvent();
  const applicationStatus = getStatus(eventId);
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'cancelled' | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [acceptedCoC, setAcceptedCoC] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!eventId || authLoading || !user) return;
    (async () => {
      try {
        try {
          const ev = await apiGet(`/events/${encodeURIComponent(eventId)}`);
          if (!mounted) return;
          setEventTitle(ev?.title ?? null);
          setEventStatus(ev?.status ?? null);
        } catch {
          // ignore
        }

        const data = await apiGet(`/applications/event/${eventId}/form`);
        if (!mounted) return;
        setFields((data?.schema?.fields ?? []) as Field[]);
        setErrors({});
      } catch {
        // no schema yet
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId, authLoading, user]);

  if (authLoading || appsLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <HostLoginPrompt
        title="Apply to event"
        message="Log in to submit an application."
      />
    );
  }

  const submit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (eventStatus !== 'published') {
        setMessage('This event is not open for applications.');
        return;
      }
      if (applicationStatus) {
        setMessage('You already have an application for this event.');
        return;
      }
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
      if (!acceptedCoC) {
        setMessage('You must accept the code of conduct to apply.');
        return;
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
        acceptedCodeOfConduct: true,
      });
      setSubmitted(true);
      setMessage('Submitted. Track status in My applications.');
      setErrors({});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const alreadyApplied = !!applicationStatus || submitted;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <EventPageNav eventId={eventId} title={eventTitle} />
      <h1 className="text-2xl font-semibold">Apply{eventTitle ? `: ${eventTitle}` : ''}</h1>

      {eventStatus && eventStatus !== 'published' && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This event is not open for applications ({eventStatus}).
        </p>
      )}

      {applicationStatus === 'approved' && (
        <div className="text-sm space-y-2 border rounded p-3">
          <p>You are approved for this event.</p>
          <Link href={`/events/${eventId}/ticket`} className="text-blue-600 underline">
            View ticket
          </Link>
        </div>
      )}

      {applicationStatus === 'pending' && (
        <div className="text-sm space-y-2 border rounded p-3">
          <p>Your application is pending host review.</p>
          <Link href="/applications" className="text-blue-600 underline">
            My applications
          </Link>
        </div>
      )}

      {applicationStatus === 'rejected' && (
        <div className="text-sm space-y-2 border rounded p-3">
          <p>Your application was not approved for this event.</p>
          <Link href="/applications" className="text-blue-600 underline">
            My applications
          </Link>
        </div>
      )}

      {submitted && !applicationStatus && (
        <div className="text-sm">
          <Link href="/applications" className="text-blue-600 underline">
            My applications
          </Link>
        </div>
      )}

      {!alreadyApplied && !applicationStatus && (
        <>
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
                <div id={`inviteCode-error`} className="text-xs text-red-600">
                  {errors['inviteCode']}
                </div>
              )}
            </div>
            {fields.length === 0 && (
              <div className="text-sm text-gray-500">No application form set for this event yet.</div>
            )}
            {fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <label className="block text-sm font-medium">
                  {f.name}
                  {f.required ? ' *' : ''}
                </label>
                <input
                  className="w-full border rounded p-2"
                  type={f.type === 'text' ? 'text' : 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  aria-invalid={errors[f.name] ? 'true' : 'false'}
                  aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
                />
                {errors[f.name] && (
                  <div id={`${f.name}-error`} className="text-xs text-red-600">
                    {errors[f.name]}
                  </div>
                )}
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptedCoC}
              onChange={(e) => setAcceptedCoC(e.target.checked)}
              className="mt-1"
            />
            <span>
              I agree to the{' '}
              <Link href="/trust/code-of-conduct" className="text-blue-600 underline" target="_blank">
                VelvetKey code of conduct
              </Link>
              .
            </span>
          </label>
          <button
            onClick={submit}
            disabled={loading || eventStatus !== 'published' || !acceptedCoC}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </>
      )}

      {message && <div className="text-sm">{message}</div>}
    </div>
  );
}
