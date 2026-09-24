import Link from 'next/link';
import { API_BASE } from '@/lib/api';

async function loadCodeOfConduct() {
  const res = await fetch(`${API_BASE}/trust/code-of-conduct`, {
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
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Code of conduct</h1>
      {version && (
        <p className="text-xs text-gray-500">Version {version}</p>
      )}
      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans border rounded p-4 bg-black/[0.02] dark:bg-white/[0.04]">
        {text}
      </pre>
      <Link href="/" className="text-sm text-blue-600 underline">
        Back to events
      </Link>
    </div>
  );
}
