'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6 text-sm">Loading…</div>;
  }

  if (!user?.roles.includes('admin')) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Admin console</h1>
        <p className="text-sm">Platform administrator access is required.</p>
        <Link href="/" className="text-sm text-blue-600 underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <nav className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/15 pb-3 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="px-3 py-1 border rounded">
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
