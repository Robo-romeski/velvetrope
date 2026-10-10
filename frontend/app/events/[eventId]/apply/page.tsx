'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPostAuth } from '@/lib/api';
import { useParams, useSearchParams } from 'next/navigation';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventPageNav } from '@/app/components/EventPageNav';
import { useAuth } from '@/lib/auth';
import { useMyApplicationByEvent } from '@/lib/my-applications';
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
  TextLink,
} from '@/app/components/ui';

type Field = { name: string; type: string; required?: boolean };

export default function ApplyToEventPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
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
    const fromQuery = searchParams?.get('invite')?.trim();
    if (fromQuery) {
      setInviteCode(fromQuery.toUpperCase());
    }
  }, [searchParams]);

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
      <PageShell>
        <LoadingState />
      </PageShell>
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
    <PageShell className="space-y-7">
      <EventPageNav eventId={eventId} title={eventTitle} />
      <PageHeader
        eyebrow="Application"
        title={eventTitle ? `Apply to ${eventTitle}` : 'Apply to event'}
        description="Share a few details with the host. Your answers stay connected to this application."
      />

      {eventStatus && eventStatus !== 'published' && (
        <Alert tone="warning">
          This event is not open for applications ({eventStatus}).
        </Alert>
      )}

      {applicationStatus === 'approved' && (
        <Alert tone="success" title="You are approved">
          <ButtonLink
            href={`/events/${eventId}/ticket`}
            size="sm"
            className="mt-3"
          >
            View ticket
          </ButtonLink>
        </Alert>
      )}

      {applicationStatus === 'pending' && (
        <Alert tone="info" title="Pending host review">
          <TextLink href="/applications" className="mt-2 inline-block">
            My applications
          </TextLink>
        </Alert>
      )}

      {applicationStatus === 'waitlisted' && (
        <Alert tone="warning" title="You are on the waitlist">
          <TextLink href="/applications" className="mt-2 inline-block">
            View waitlist status
          </TextLink>
        </Alert>
      )}

      {applicationStatus === 'rejected' && (
        <Alert tone="danger" title="Application not approved">
          <TextLink href="/applications" className="mt-2 inline-block">
            My applications
          </TextLink>
        </Alert>
      )}

      {submitted && !applicationStatus && (
        <Alert tone="success" title="Application submitted">
          <TextLink href="/applications" className="mt-2 inline-block">
            My applications
          </TextLink>
        </Alert>
      )}

      {!alreadyApplied && !applicationStatus && (
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="space-y-5">
            <FormField
              label="Invite code *"
              htmlFor="invite-code"
              error={errors['inviteCode']}
              errorId="inviteCode-error"
            >
              <Input
                id="invite-code"
                type="text"
                autoCapitalize="characters"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                aria-invalid={errors['inviteCode'] ? 'true' : 'false'}
                aria-describedby={
                  errors['inviteCode'] ? 'inviteCode-error' : undefined
                }
              />
            </FormField>
            {fields.length === 0 && (
              <p className="text-sm text-muted">
                No additional application questions are set for this event.
              </p>
            )}
            {fields.map((f) => (
              <FormField
                key={f.name}
                label={`${f.name}${f.required ? ' *' : ''}`}
                htmlFor={`application-${f.name}`}
                error={errors[f.name]}
                errorId={`${f.name}-error`}
              >
                <Input
                  id={`application-${f.name}`}
                  type={f.type === 'text' ? 'text' : 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  aria-invalid={errors[f.name] ? 'true' : 'false'}
                  aria-describedby={
                    errors[f.name] ? `${f.name}-error` : undefined
                  }
                />
              </FormField>
            ))}
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-sm">
            <input
              type="checkbox"
              checked={acceptedCoC}
              onChange={(e) => setAcceptedCoC(e.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            <span className="leading-6">
              I agree to the{' '}
              <Link
                href="/trust/code-of-conduct"
                className="font-medium text-accent underline underline-offset-4"
                target="_blank"
              >
                epicsexual code of conduct
              </Link>
              .
            </span>
          </label>
          <Button
            type="button"
            onClick={submit}
            disabled={loading || eventStatus !== 'published' || !acceptedCoC}
          >
            {loading ? 'Submitting…' : 'Submit application'}
          </Button>
        </Card>
      )}

      {message && !submitted && (
        <Alert tone="warning" role="alert">
          {message}
        </Alert>
      )}
    </PageShell>
  );
}
