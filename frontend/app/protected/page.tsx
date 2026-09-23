'use client';

import { useAuth } from '@/lib/auth';

export default function ProtectedPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-bold">Protected</h1>
        <p className="text-sm">Log in to see this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Protected</h1>
      <p className="mt-2">Signed in as {user.email}.</p>
      <pre className="mt-4 text-xs bg-gray-100 text-black p-2 rounded w-full overflow-auto">
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
