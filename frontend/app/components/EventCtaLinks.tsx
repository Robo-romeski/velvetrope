import Link from 'next/link';
import type { ApplicationStatus } from '@/lib/my-applications';

export function EventCtaLinks({
  eventId,
  applicationStatus,
  loggedIn,
}: {
  eventId: string;
  applicationStatus?: ApplicationStatus;
  loggedIn: boolean;
}) {
  const detail = (
    <Link className="text-blue-600 underline" href={`/events/${eventId}`}>
      Details
    </Link>
  );

  if (!loggedIn) {
    return (
      <div className="flex flex-wrap gap-3 text-sm items-center">
        {detail}
        <Link className="text-blue-600 underline" href={`/events/${eventId}/apply`}>
          Apply
        </Link>
      </div>
    );
  }

  if (applicationStatus === 'approved') {
    return (
      <div className="flex flex-wrap gap-3 text-sm items-center">
        {detail}
        <Link className="text-blue-600 underline" href={`/events/${eventId}/ticket`}>
          View ticket
        </Link>
        <Link className="text-blue-600 underline" href="/applications">
          My applications
        </Link>
      </div>
    );
  }

  if (applicationStatus === 'pending') {
    return (
      <div className="flex flex-wrap gap-3 text-sm items-center">
        {detail}
        <span className="text-gray-600 dark:text-gray-400">Pending review</span>
        <Link className="text-blue-600 underline" href="/applications">
          My applications
        </Link>
      </div>
    );
  }

  if (applicationStatus === 'rejected') {
    return (
      <div className="flex flex-wrap gap-3 text-sm items-center">
        {detail}
        <span className="text-gray-500">Not approved</span>
        <Link className="text-blue-600 underline" href="/applications">
          My applications
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 text-sm items-center">
      {detail}
      <Link className="text-blue-600 underline" href={`/events/${eventId}/apply`}>
        Apply
      </Link>
    </div>
  );
}
