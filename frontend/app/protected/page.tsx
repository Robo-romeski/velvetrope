"use client";
import { useUser } from '@auth0/nextjs-auth0';

function ProtectedContent() {
  const { user } = useUser();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Protected</h1>
      <p className="mt-2">Only visible when logged in.</p>
      <pre className="mt-4 text-xs bg-gray-100 text-black p-2 rounded w-full overflow-auto">{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}

export default function ProtectedPage() {
  return <ProtectedContent />;
}


