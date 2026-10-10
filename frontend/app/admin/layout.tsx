'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import {
  ButtonLink,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

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
    return <PageShell size="wide"><LoadingState label="Opening admin console…" /></PageShell>;
  }

  if (!user?.roles.includes('admin')) {
    return (
      <PageShell size="narrow" className="space-y-6">
        <PageHeader
          eyebrow="Restricted"
          title="Admin console"
          description="Platform administrator access is required."
        />
        <ButtonLink href="/" variant="secondary">Return home</ButtonLink>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide" className="space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Admin console"
        description="Moderation, account status, events, and immutable audit records."
      />
      <nav
        aria-label="Admin sections"
        className="flex flex-wrap gap-x-5 border-y border-border py-3 text-sm"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-b border-transparent px-1 py-2 font-semibold text-muted hover:border-accent hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </PageShell>
  );
}
