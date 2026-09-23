'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function AppNav() {
  const { user, loading, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="w-full border-b border-black/10 dark:border-white/15 px-6 py-4 flex items-center justify-between gap-4">
      <Link href="/" className="font-semibold">
        VelvetKey
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/">Events</Link>
        <Link href="/host/events">Host</Link>
        <Link href="/host/stripe">Stripe</Link>
        {!loading && !user && <Link href="/auth/login">Login</Link>}
        {!loading && !user && <Link href="/auth/register">Sign up</Link>}
        {!loading && user && (
          <button type="button" onClick={onLogout} className="underline">
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
