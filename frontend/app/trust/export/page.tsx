'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetAuth, apiPostAuth } from '@/lib/api';
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
} from '@/app/components/ui';

export default function DataExportPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [json, setJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const download = async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await apiGetAuth('/trust/export');
      const text = JSON.stringify(data, null, 2);
      setJson(text);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'epicsexual-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return <PageShell size="narrow"><LoadingState /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell size="narrow" className="space-y-6">
        <PageHeader
          eyebrow="Privacy"
          title="Download my data"
          description="Log in to export your account data."
        />
        <ButtonLink href="/auth/login">Log in</ButtonLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        eyebrow="Privacy"
        title="Your data"
        description="Download a JSON export of your profile and application history. Passwords are never included."
      />
      <Card className="space-y-5 p-6 sm:p-8">
        <Button type="button" onClick={download} disabled={fetching}>
          {fetching ? 'Preparing…' : 'Download JSON'}
        </Button>
        {error && <Alert tone="danger" role="alert">{error}</Alert>}
      {json && (
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-surface-subtle p-3 text-xs">
          {json}
        </pre>
      )}
      </Card>

      <Card className="space-y-5 border-danger/30 p-6 sm:p-8">
        <div>
          <h2 className="font-display text-2xl font-semibold">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Permanently deletes your profile, applications, tickets, and payments.
            You cannot delete while you still host events—remove those first.
          </p>
        </div>
        <FormField label="Confirm with your password" htmlFor="delete-password">
          <Input
            id="delete-password"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
        </FormField>
        <Button
          type="button"
          variant="danger"
          disabled={deleting || !deletePassword}
          onClick={async () => {
            setDeleting(true);
            setDeleteMessage(null);
            setError(null);
            try {
              await apiPostAuth('/trust/delete-account', { password: deletePassword });
              await logout();
              router.push('/');
              router.refresh();
            } catch (e) {
              setDeleteMessage(e instanceof Error ? e.message : 'Delete failed');
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? 'Deleting…' : 'Delete my account'}
        </Button>
        {deleteMessage && <Alert tone="danger" role="alert">{deleteMessage}</Alert>}
      </Card>
    </PageShell>
  );
}
