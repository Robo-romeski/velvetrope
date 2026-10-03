'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/components/ui';

const tabs = [
  { suffix: 'edit', label: 'Edit' },
  { suffix: 'form', label: 'Form' },
  { suffix: 'invites', label: 'Invites' },
  { suffix: 'applications', label: 'Applications' },
  { suffix: 'scan', label: 'Check-in' },
  { suffix: 'analytics', label: 'Analytics' },
  { suffix: 'feedback', label: 'Feedback' },
] as const;

export function HostEventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="Event workspace"
      className="-mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max items-center gap-1 pb-3 text-sm">
        <Link
          href="/host/events"
          className="mr-2 rounded-lg px-2.5 py-2 font-medium text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
        >
          ← Events
        </Link>
        {tabs.map((tab) => {
          const href = `/host/events/${eventId}/${tab.suffix}`;
          const active = pathname.includes(
            `/host/events/${eventId}/${tab.suffix}`,
          );
          return (
            <Link
              key={tab.suffix}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-2 font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted hover:bg-surface-subtle hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link
          href={`/events/${eventId}/chat`}
          aria-current={
            pathname.includes(`/events/${eventId}/chat`) ? 'page' : undefined
          }
          className={cn(
            'rounded-lg px-3 py-2 font-medium transition-colors',
            pathname.includes(`/events/${eventId}/chat`)
              ? 'bg-foreground text-background'
              : 'text-muted hover:bg-surface-subtle hover:text-foreground',
          )}
        >
          Chat
        </Link>
      </div>
    </nav>
  );
}
