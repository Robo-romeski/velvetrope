'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiGet, apiPostAuth } from '@/lib/api';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

export default function RedeemInvitePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [validatedEventId, setValidatedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    setLoading(true);
    setStatus(null);
    setValidatedEventId(null);
    try {
      const res = await apiGet(
        `/invites/validate/${encodeURIComponent(code.trim())}`,
      );
      if (res?.valid && res.eventId) {
        setValidatedEventId(res.eventId as string);
        setStatus(
          res.used
            ? 'This code is already redeemed. You can still apply if it was yours.'
            : 'Valid invite. Redeem to continue to the application.',
        );
      } else if (res?.expired) {
        setStatus('This invite code has expired.');
      } else {
        setStatus('Invalid code.');
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const redeem = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const trimmed = code.trim().toUpperCase();
      const res = await apiPostAuth(
        `/invites/redeem/${encodeURIComponent(trimmed)}`,
        {},
      );
      const eventId =
        (res?.eventId as string | undefined) ?? validatedEventId ?? null;
      if (eventId) {
        router.push(
          `/events/${encodeURIComponent(eventId)}/apply?invite=${encodeURIComponent(trimmed)}`,
        );
        return;
      }
      setStatus('Redeemed. Open the event from Events to apply.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Redeem failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="max-w-lg space-y-7">
      <PageHeader
        eyebrow="Guest access"
        title="Redeem invite"
        description="Enter your private code, then continue to the event application."
      />
      <Card className="space-y-5 p-6 sm:p-8">
        <FormField label="Invite code" htmlFor="invite-redeem-code">
          <Input
            id="invite-redeem-code"
            type="text"
            autoCapitalize="characters"
            placeholder="Enter invite code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={validate}
            disabled={loading || !code.trim()}
          >
            Validate
          </Button>
          <Button
            type="button"
            onClick={redeem}
            disabled={loading || !code.trim()}
          >
            Redeem and apply
          </Button>
        </div>
        {status && <Alert tone="info">{status}</Alert>}
      </Card>
    </PageShell>
  );
}
