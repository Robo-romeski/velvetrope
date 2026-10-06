'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { buttonStyles, cn } from '@/app/components/ui';

export function AppNav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHost = user?.roles?.includes('host') === true;
  const isAdmin = user?.roles?.includes('admin') === true;
  const next = pathname?.startsWith('/') ? pathname : '/';
  const loginHref = `/auth/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/auth/register?next=${encodeURIComponent(next)}`;
  const hostRegisterHref = '/auth/register?next=%2Fhost%2Fevents&host=1';

  const onLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const closeMenu = () => setMenuOpen(false);
  const eventsActive =
    pathname === '/' || pathname?.startsWith('/events/') === true;
  const communityActive = pathname?.startsWith('/community') === true;
  const learnActive = pathname?.startsWith('/learn') === true;

  const navLinkClass = (active: boolean) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-surface-subtle text-foreground'
        : 'text-muted hover:bg-surface-subtle hover:text-foreground',
    );

  const signedInLinks = (
    <>
      <Link
        href="/community"
        onClick={closeMenu}
        className={navLinkClass(communityActive)}
      >
        Community
      </Link>
      <Link
        href="/learn"
        onClick={closeMenu}
        className={navLinkClass(learnActive)}
      >
        Learn
      </Link>
      <Link
        href="/applications"
        onClick={closeMenu}
        className={navLinkClass(pathname?.startsWith('/applications') === true)}
      >
        My applications
      </Link>
      {isHost && (
        <>
          <Link
            href="/host/events"
            onClick={closeMenu}
            className={navLinkClass(
              pathname?.startsWith('/host/events') === true,
            )}
          >
            Host dashboard
          </Link>
          <Link
            href="/host/stripe"
            onClick={closeMenu}
            className={navLinkClass(
              pathname?.startsWith('/host/stripe') === true,
            )}
          >
            Payments
          </Link>
        </>
      )}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={closeMenu}
          className={navLinkClass(pathname?.startsWith('/admin') === true)}
        >
          Admin
        </Link>
      )}
    </>
  );

  return (
    <nav
      aria-label="Primary navigation"
      className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-[4.5rem] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
            onClick={closeMenu}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground transition-transform group-hover:-rotate-3">
              V
            </span>
            <span>VelvetKey</span>
          </Link>
          <Link
            href="/"
            className={cn(
              navLinkClass(eventsActive),
              'hidden md:inline-flex',
            )}
          >
            Events
          </Link>
          <Link
            href="/community"
            className={cn(
              navLinkClass(communityActive),
              'hidden md:inline-flex',
            )}
          >
            Community
          </Link>
          <Link
            href="/learn"
            className={cn(navLinkClass(learnActive), 'hidden md:inline-flex')}
          >
            Learn
          </Link>
          <Link
            href="/#how-it-works"
            className={cn(navLinkClass(false), 'hidden lg:inline-flex')}
          >
            How it works
          </Link>
          <Link
            href="/trust/code-of-conduct"
            className={cn(navLinkClass(false), 'hidden lg:inline-flex')}
          >
            Trust
          </Link>
        </div>

        <button
          type="button"
          className={buttonStyles({
            variant: 'secondary',
            size: 'sm',
            className: 'md:hidden',
          })}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {loading && (
            <div
              className="flex animate-pulse items-center gap-2"
              role="status"
              aria-label="Loading account navigation"
            >
              <span className="h-8 w-24 rounded-lg bg-surface-subtle" />
              <span className="h-8 w-20 rounded-lg bg-surface-subtle" />
              <span className="size-9 rounded-xl bg-surface-subtle" />
            </div>
          )}
          {!loading && user && signedInLinks}
          {!loading && !user && (
            <>
              <Link
                href={loginHref}
                className={buttonStyles({ variant: 'ghost', size: 'sm' })}
              >
                Log in
              </Link>
              <Link
                href={registerHref}
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                Join VelvetKey
              </Link>
              <Link
                href={hostRegisterHref}
                className={buttonStyles({
                  size: 'sm',
                  className: 'ml-1',
                })}
              >
                Host an event
              </Link>
            </>
          )}
          {!loading && user && (
            <details className="relative ml-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-subtle">
                <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {(user.name?.trim() || user.email).charAt(0).toUpperCase()}
                </span>
                Account
              </summary>
              <div className="absolute right-0 z-20 mt-2 flex min-w-52 flex-col gap-1 rounded-2xl border border-border bg-surface-raised p-2 shadow-card">
                <div className="border-b border-border px-3 py-2">
                  <div className="truncate text-sm font-medium">
                    {user.name || 'VelvetKey member'}
                  </div>
                  <div className="truncate text-xs text-muted">{user.email}</div>
                </div>
                <Link href="/settings/profile" className={navLinkClass(false)}>
                  Profile
                </Link>
                <Link href="/settings/connections" className={navLinkClass(false)}>
                  Follows
                </Link>
                <Link
                  href={
                    user.id
                      ? `/members/${user.id}`
                      : '/settings/profile'
                  }
                  className={navLinkClass(false)}
                >
                  Public profile
                </Link>
                <Link
                  href="/identity/verify"
                  className={navLinkClass(false)}
                >
                  Identity
                </Link>
                <Link href="/trust/report" className={navLinkClass(false)}>
                  Report a concern
                </Link>
                <Link href="/trust/export" className={navLinkClass(false)}>
                  My data
                </Link>
                <Link
                  href="/trust/code-of-conduct"
                  className={navLinkClass(false)}
                >
                  Code of conduct
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                >
                  Log out
                </button>
              </div>
            </details>
          )}
        </div>

        {menuOpen && (
          <div
            id="mobile-navigation"
            className="basis-full border-t border-border py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={closeMenu}
                className={navLinkClass(eventsActive)}
              >
                Events
              </Link>
              <Link
                href="/community"
                onClick={closeMenu}
                className={navLinkClass(communityActive)}
              >
                Community
              </Link>
              <Link
                href="/#how-it-works"
                onClick={closeMenu}
                className={navLinkClass(false)}
              >
                How it works
              </Link>
              {loading && (
                <div
                  className="px-3 py-2 text-sm text-muted"
                  role="status"
                >
                  Loading account…
                </div>
              )}
              {!loading && user && signedInLinks}
              {!loading && user && (
                <>
                  <div className="my-2 border-t border-border" />
                  <Link
                    href="/identity/verify"
                    onClick={closeMenu}
                    className={navLinkClass(false)}
                  >
                    Identity
                  </Link>
                  <Link
                    href="/trust/report"
                    onClick={closeMenu}
                    className={navLinkClass(false)}
                  >
                    Report a concern
                  </Link>
                  <Link
                    href="/trust/export"
                    onClick={closeMenu}
                    className={navLinkClass(false)}
                  >
                    My data
                  </Link>
                  <Link
                    href="/trust/code-of-conduct"
                    onClick={closeMenu}
                    className={navLinkClass(false)}
                  >
                    Code of conduct
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger-soft"
                  >
                    Log out
                  </button>
                </>
              )}
              {!loading && !user && (
                <div className="grid gap-2 py-2">
                  <Link
                    href={loginHref}
                    onClick={closeMenu}
                    className={buttonStyles({ variant: 'secondary' })}
                  >
                    Log in
                  </Link>
                  <Link
                    href={registerHref}
                    onClick={closeMenu}
                    className={buttonStyles({ variant: 'secondary' })}
                  >
                    Sign up
                  </Link>
                  <Link
                    href={hostRegisterHref}
                    onClick={closeMenu}
                    className={buttonStyles()}
                  >
                    Host an event
                  </Link>
                  <Link
                    href="/trust/code-of-conduct"
                    onClick={closeMenu}
                    className={cn(navLinkClass(false), 'text-center')}
                  >
                    Code of conduct
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
