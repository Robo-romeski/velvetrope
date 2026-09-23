import { Suspense, type ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>{children}</Suspense>;
}
