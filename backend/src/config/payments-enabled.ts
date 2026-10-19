import { BadRequestException } from '@nestjs/common';

/** When false, ticket/course prices must stay 0 and Stripe checkout/onboarding are disabled. */
export function isPaymentsEnabled(): boolean {
  const raw = process.env.PAYMENTS_ENABLED?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV === 'test';
}

export function rejectPaidPricingWhenDisabled(priceCents: number): void {
  if (priceCents > 0 && !isPaymentsEnabled()) {
    throw new BadRequestException(
      'Paid pricing is not enabled yet. Keep events and courses free (price 0).',
    );
  }
}

export function rejectStripeMoneyFlowsWhenDisabled(): void {
  if (!isPaymentsEnabled()) {
    throw new BadRequestException(
      'Payments are not enabled. All gatherings are free for now.',
    );
  }
}
