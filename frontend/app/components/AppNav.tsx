'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/lib/auth';
import { buttonStyles, cn } from '@/app/components/ui';
import { apiGetAuth } from '@/lib/api';
import type { ConversationSummary } from '@/lib/messages';
import type { SocialNotifications } from '@/lib/social';

export function AppNav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const reduceMotion = useReducedMotion();
  const isHost = user?.roles?.includes('host') === true;
  const isAdmin = user?.roles?.includes('admin') === true;
  const next = pathname?.startsWith('/') ? pathname : '/feed';
  const homeHref = user ? '/feed' : '/';
  const loginHref = `/auth/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/auth/register?next=${encodeURIComponent(next)}`;
  const hostRegisterHref = '/auth/register?next=%2Fhost%2Fevents&host=1';

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }
    let mounted = true;
    const loadUnread = async () => {
      try {
        const [rows, notifications] = await Promise.all([
          apiGetAuth('/messages/conversations') as Promise<
            ConversationSummary[]
          >,
          apiGetAuth('/social/notifications') as Promise<SocialNotifications>,
        ]);
        if (mounted) {
          setUnreadMessages(
            Array.isArray(rows)
              ? rows.reduce((total, row) => total + row.unreadCount, 0)
              : 0,
          );
          setUnreadNotifications(notifications?.unreadCount ?? 0);
        }
      } catch {
        if (mounted) {
          setUnreadMessages(0);
          setUnreadNotifications(0);
        }
      }
    };
    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 30_000);
    const handleMessagesChanged = () => void loadUnread();
    window.addEventListener(
      'epicsexual:messages-changed',
      handleMessagesChanged,
    );
    window.addEventListener(
      'epicsexual:notifications-changed',
      handleMessagesChanged,
    );
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener(
        'epicsexual:messages-changed',
        handleMessagesChanged,
      );
      window.removeEventListener(
        'epicsexual:notifications-changed',
        handleMessagesChanged,
      );
    };
  }, [pathname, user]);

  const onLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const closeMenu = () => setMenuOpen(false);
  const eventsActive =
    pathname === '/' || pathname?.startsWith('/events/') === true;
  const communityActive =
    pathname?.startsWith('/community') === true ||
    pathname?.startsWith('/feed') === true ||
    pathname?.startsWith('/notifications') === true;
  const learnActive = pathname?.startsWith('/learn') === true;

  const navLinkClass = (active: boolean) =>
    cn(
      'border-b px-1 py-2 text-[0.8125rem] font-semibold tracking-[0.02em] transition-colors',
      active
        ? 'border-accent text-foreground'
        : 'border-transparent text-muted hover:border-border-strong hover:text-foreground',
    );

  const signedInLinks = (
    <>
      <Link
        href="/messages"
        onClick={closeMenu}
        className={navLinkClass(pathname?.startsWith('/messages') === true)}
      >
        Messages
        {unreadMessages > 0 && (
          <span
            className="ml-1.5 rounded-sm bg-accent px-1.5 py-0.5 text-[0.65rem] text-accent-foreground"
            aria-label={`${unreadMessages} unread messages`}
          >
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </Link>
      <Link
        href="/notifications"
        onClick={closeMenu}
        className={navLinkClass(
          pathname?.startsWith('/notifications') === true,
        )}
      >
        Notifications
        {unreadNotifications > 0 && (
          <span
            className="ml-1.5 rounded-sm bg-accent px-1.5 py-0.5 text-[0.65rem] text-accent-foreground"
            aria-label={`${unreadNotifications} unread notifications`}
          >
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
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
      className="sticky top-0 z-40 w-full border-b border-border bg-background"
    >
      <div className="mx-auto flex min-h-[4.75rem] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-7">
          <Link
            href={homeHref}
            className="group flex items-center gap-2.5 font-display text-lg font-semibold tracking-[-0.025em]"
            onClick={closeMenu}
          >
            <Image
              src="/epicsexual-logo.png"
              alt=""
              width={32}
              height={32}
              priority
              className="size-8"
            />
            <span>epicsexual</span>
          </Link>
          <Link
            href="/feed"
            className={cn(
              navLinkClass(communityActive),
              'hidden md:inline-flex',
            )}
          >
            Community
          </Link>
          <Link
            href="/#gatherings"
            className={cn(
              navLinkClass(eventsActive),
              'hidden md:inline-flex',
            )}
          >
            Gatherings
          </Link>
          <Link
            href="/learn"
            className={cn(navLinkClass(learnActive), 'hidden md:inline-flex')}
          >
            Learn
          </Link>
          <Link
            href="/#about"
            className={cn(navLinkClass(false), 'hidden lg:inline-flex')}
          >
            About
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
              <span className="size-9 rounded-md bg-surface-subtle" />
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
                Join epicsexual
              </Link>
              <Link
                href={hostRegisterHref}
                className={buttonStyles({
                  size: 'sm',
                  className: 'ml-1',
                })}
              >
                Host a gathering
              </Link>
            </>
          )}
          {!loading && user && (
            <details className="relative ml-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-subtle">
                <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {(user.name?.trim() || user.email).charAt(0).toUpperCase()}
                </span>
                Account
              </summary>
              <div className="absolute right-0 z-20 mt-2 flex min-w-52 flex-col gap-1 rounded-card border border-border bg-surface-raised p-2 shadow-card">
                <div className="border-b border-border px-3 py-2">
                  <div className="truncate text-sm font-medium">
                    {user.name || 'epicsexual member'}
                  </div>
                  <div className="truncate text-xs text-muted">{user.email}</div>
                </div>
                <Link href="/settings/profile" className={navLinkClass(false)}>
                  Profile
                </Link>
                <Link href="/settings/connections" className={navLinkClass(false)}>
                  Follows
                </Link>
                <Link href="/settings/kudos" className={navLinkClass(false)}>
                  Kudos
                </Link>
                <Link href="/messages" className={navLinkClass(false)}>
                  Messages
                </Link>
                <Link href="/notifications" className={navLinkClass(false)}>
                  Notifications
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

        <AnimatePresence initial={false}>
          {menuOpen && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="basis-full border-t border-border py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              <Link
                href="/feed"
                onClick={closeMenu}
                className={navLinkClass(communityActive)}
              >
                Community
              </Link>
              <Link
                href="/#gatherings"
                onClick={closeMenu}
                className={navLinkClass(eventsActive)}
              >
                Gatherings
              </Link>
              <Link
                href="/learn"
                onClick={closeMenu}
                className={navLinkClass(learnActive)}
              >
                Learn
              </Link>
              <Link
                href="/#about"
                onClick={closeMenu}
                className={navLinkClass(false)}
              >
                About
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
                    Host a gathering
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
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
