import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Previously opened attendee tickets remain available from their event
        ticket URL. Host check-in, payments, applications, and account changes
        require a connection.
      </p>
      <Link href="/" className="text-blue-600 underline text-sm">
        Try home again
      </Link>
    </div>
  );
}
