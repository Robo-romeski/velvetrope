import Link from 'next/link';

const footerLinks = [
  { href: '/', label: 'Events' },
  { href: '/trust/code-of-conduct', label: 'Code of conduct' },
  { href: '/trust/report', label: 'Report a concern' },
] as const;

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
          >
            VelvetKey
          </Link>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Private gatherings, thoughtfully held.
          </p>
        </div>
        <div className="space-y-3 md:text-right">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} VelvetKey
          </p>
        </div>
      </div>
    </footer>
  );
}
