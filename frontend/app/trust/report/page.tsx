'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
    return (
      <div className="max-w-xl mx-auto p-6 text-sm">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Report a concern</h1>
        <p className="text-sm">Log in to submit a safety report.</p>
        <Link href="/auth/login" className="text-blue-600 underline text-sm">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Report a concern</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Reports are reviewed by platform admins. For emergencies, contact local services first.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm space-y-1">
          <span>Subject type</span>
          <select
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as 'event' | 'user')}
          >
            <option value="event">Event</option>
            <option value="user">User</option>
          </select>
        </label>
        <label className="block text-sm space-y-1">
          <span>Subject ID</span>
          <input
            required
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Event or user id"
          />
        </label>
        <label className="block text-sm space-y-1">
          <span>Category</span>
          <select
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="safety">Safety</option>
            <option value="harassment">Harassment</option>
            <option value="spam">Spam</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-sm space-y-1">
          <span>Details</span>
          <textarea
            required
            minLength={10}
            rows={5}
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
      {message && <p className="text-sm">{message}</p>}
      <Link href="/trust/code-of-conduct" className="text-sm text-blue-600 underline block">
        Code of conduct
      </Link>
    </div>
  );
}
