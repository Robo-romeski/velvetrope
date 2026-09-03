'use client';

import Link from 'next/link';

export default function StripeRefreshPage() {
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Stripe Onboarding</h1>
      <p className="text-sm text-gray-600">You can restart onboarding if something went wrong.</p>
      <Link className="text-blue-600 underline" href="/host/stripe">Return to Stripe settings</Link>
    </div>
  );
}


