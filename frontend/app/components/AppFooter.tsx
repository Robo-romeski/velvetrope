import Image from 'next/image';
import Link from 'next/link';

const footerLinks = [
  { href: '/#gatherings', label: 'Gatherings' },
  { href: '/community', label: 'Conversation' },
  { href: '/learn', label: 'Learn' },
  { href: '/trust/code-of-conduct', label: 'Code of conduct' },
  { href: '/trust/report', label: 'Report a concern' },
] as const;

const COPYRIGHT_YEAR = 2026;

export function AppFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-display text-lg font-semibold tracking-[-0.02em] text-foreground"
          >
            <Image
              src="/epicsexual-logo.png"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
            <span>epicsexual</span>
          </Link>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            An independent community journal for ENM learning, conversation,
            and private gatherings.
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
            © {COPYRIGHT_YEAR} epicsexual
          </p>
        </div>
      </div>
    </footer>
  );
}
