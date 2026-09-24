'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { suffix: 'edit', label: 'Edit' },
  { suffix: 'form', label: 'Form' },
  { suffix: 'invites', label: 'Invites' },
  { suffix: 'applications', label: 'Applications' },
  { suffix: 'scan', label: 'Check-in' },
] as const;

export function HostEventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname() ?? '';

  return (
    <nav className="flex flex-wrap gap-2 text-sm border-b border-black/10 dark:border-white/15 pb-3">
      <Link href="/host/events" className="text-gray-600 dark:text-gray-400 underline mr-2">
        Events
      </Link>
      {tabs.map((tab) => {
        const href = `/host/events/${eventId}/${tab.suffix}`;
        const active = pathname.includes(`/host/events/${eventId}/${tab.suffix}`);
        return (
          <Link
            key={tab.suffix}
            href={href}
            className={
              active
                ? 'px-3 py-1 rounded bg-blue-600 text-white'
                : 'px-3 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/10'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
