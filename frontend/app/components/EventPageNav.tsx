import Link from 'next/link';

export function EventPageNav({
  eventId,
  title,
}: {
  eventId: string;
  title?: string | null;
}) {
  return (
    <div className="text-sm space-y-1">
      <Link href="/" className="text-blue-600 underline">
        Events
      </Link>
      {title && (
        <div className="text-gray-600 dark:text-gray-400">
          /{' '}
          <Link href={`/events/${eventId}`} className="underline">
            {title}
          </Link>
        </div>
      )}
    </div>
  );
}
