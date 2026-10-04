import { API_SERVER_BASE } from '@/lib/server-api';
import {
  ButtonLink,
  Card,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

async function loadCodeOfConduct() {
  const res = await fetch(`${API_SERVER_BASE}/trust/code-of-conduct`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return { version: '', text: 'Code of conduct is temporarily unavailable.' };
  }
  return res.json() as Promise<{ version: string; text: string }>;
}

export default async function CodeOfConductPage() {
  const { version, text } = await loadCodeOfConduct();

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow={version ? `Version ${version}` : 'Community standards'}
        title="Code of conduct"
        description="The shared expectations that keep VelvetKey gatherings respectful, consensual, and safe."
      />
      <Card className="p-6 sm:p-8">
        <pre className="vk-prose whitespace-pre-wrap font-sans text-sm">
          {text}
        </pre>
      </Card>
      <ButtonLink href="/" variant="secondary">
        Back to events
      </ButtonLink>
    </PageShell>
  );
}
