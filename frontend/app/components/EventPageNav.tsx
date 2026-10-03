import Link from 'next/link';

export function EventPageNav({
  eventId,
  title,
}: {
  eventId: string;
  title?: string | null;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-muted"
    >
      <Link
        href="/"
        className="font-medium transition-colors hover:text-foreground"
      >
        Events
      </Link>
      {title && (
        <>
          <span aria-hidden="true" className="text-border-strong">
            /
          </span>
          <Link
            href={`/events/${eventId}`}
            className="max-w-64 truncate font-medium text-foreground"
            aria-current="page"
          >
            {title}
          </Link>
        </>
      )}
    </nav>
  );
}
