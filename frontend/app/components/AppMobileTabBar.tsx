'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/app/components/ui';

const tabs = [
  { href: '/feed', label: 'Feed', match: (p: string) => p === '/feed' || p.startsWith('/community') || p.startsWith('/notifications') },
  { href: '/messages', label: 'Messages', match: (p: string) => p.startsWith('/messages') },
  { href: '/learn', label: 'Learn', match: (p: string) => p.startsWith('/learn') },
  { href: '/search', label: 'Search', match: (p: string) => p.startsWith('/search') },
] as const;

export function AppMobileTabBar() {
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? '';

  if (loading || !user) return null;

  return (
    <nav
      aria-label="Mobile tab navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center text-[0.6875rem] font-semibold tracking-wide',
                  active ? 'text-accent' : 'text-muted',
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
