import type { ApplicationStatus } from '@/lib/my-applications';
import { Badge, ButtonLink, TextLink } from '@/app/components/ui';

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
    <TextLink href={`/events/${eventId}`} className="text-sm">
      Details
    </TextLink>
  );

  if (!loggedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {detail}
        <ButtonLink href={`/events/${eventId}/apply`} size="sm">
          Apply
        </ButtonLink>
      </div>
    );
  }

  if (applicationStatus === 'approved') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {detail}
        <ButtonLink href={`/events/${eventId}/ticket`} size="sm">
          View ticket
        </ButtonLink>
        <TextLink href="/applications" className="text-sm">
          My applications
        </TextLink>
      </div>
    );
  }

  if (applicationStatus === 'pending') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {detail}
        <Badge tone="accent">Pending review</Badge>
        <TextLink href="/applications" className="text-sm">
          My applications
        </TextLink>
      </div>
    );
  }

  if (applicationStatus === 'waitlisted') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {detail}
        <Badge tone="warning">Waitlisted</Badge>
        <TextLink href="/applications" className="text-sm">
          My applications
        </TextLink>
      </div>
    );
  }

  if (applicationStatus === 'rejected') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {detail}
        <Badge>Not approved</Badge>
        <TextLink href="/applications" className="text-sm">
          My applications
        </TextLink>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {detail}
      <ButtonLink href={`/events/${eventId}/apply`} size="sm">
        Apply
      </ButtonLink>
    </div>
  );
}
