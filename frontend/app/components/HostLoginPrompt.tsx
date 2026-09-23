import Link from 'next/link';

export default function HostLoginPrompt({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {message ?? 'Log in as a host to continue.'}
      </p>
      <div className="flex gap-3">
        <Link href="/auth/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Login
        </Link>
        <Link href="/auth/register" className="inline-block px-4 py-2 border rounded">
          Sign up
        </Link>
      </div>
    </div>
  );
}
