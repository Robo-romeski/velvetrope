'use client';

import { FormEvent, useState } from 'react';
import { apiPostAuth } from '@/lib/api';
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
  Select,
  Textarea,
  TextLink,
} from '@/app/components/ui';

export default function TrustReportPage() {
  const { user, loading } = useAuth();
  const [subjectType, setSubjectType] = useState<'event' | 'user'>('event');
  const [subjectId, setSubjectId] = useState('');
  const [category, setCategory] = useState('safety');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiPostAuth('/trust/reports', {
        subjectType,
        subjectId: subjectId.trim(),
        category,
        details: details.trim(),
      });
      setMessage('Report submitted. Our team will review it.');
      setDetails('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageShell size="narrow"><LoadingState /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell size="narrow" className="space-y-6">
        <PageHeader
          eyebrow="Trust and safety"
          title="Report a concern"
          description="Log in to submit a confidential report for platform review."
        />
        <ButtonLink href="/auth/login">Log in</ButtonLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Trust and safety"
        title="Report a concern"
        description="Reports are reviewed by platform administrators. For emergencies, contact local services first."
      />
      <Card className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Subject type" htmlFor="report-subject-type">
            <Select
              id="report-subject-type"
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as 'event' | 'user')}
          >
            <option value="event">Event</option>
            <option value="user">User</option>
            </Select>
          </FormField>
          <FormField label="Subject ID" htmlFor="report-subject-id">
            <Input
              id="report-subject-id"
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              placeholder="Event or user id"
            />
          </FormField>
          <FormField label="Category" htmlFor="report-category">
            <Select
              id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="safety">Safety</option>
            <option value="harassment">Harassment</option>
            <option value="spam">Spam</option>
            <option value="other">Other</option>
            </Select>
          </FormField>
          <FormField
            label="Details"
            htmlFor="report-details"
            hint="Include enough context for a reviewer to understand what happened."
          >
            <Textarea
              id="report-details"
              required
              minLength={10}
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </FormField>
          {message && <Alert tone="info" role="status">{message}</Alert>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </form>
      </Card>
      <TextLink href="/trust/code-of-conduct">Read the code of conduct</TextLink>
    </PageShell>
  );
}
