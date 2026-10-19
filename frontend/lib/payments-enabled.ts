import { notFound } from 'next/navigation';

/** Mirrors backend PAYMENTS_ENABLED; unset = free-only (matches prod launch default). */
export function paymentsEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV === 'test';
}

/** Payment routes are not linked in the UI; direct URLs 404 until payments ship. */
export function hidePaymentsSurface(): void {
  if (!paymentsEnabled()) {
    notFound();
  }
}
