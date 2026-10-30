'use client';

import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { useAuth } from '@/lib/auth';

const posthogEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
);

export function PostHogIdentity() {
  const { user, loading } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!posthogEnabled || loading) return;

    const userId = user?.id ?? null;
    if (previousUserId.current === userId) return;

    if (userId) {
      posthog.identify(userId);
    } else {
      posthog.reset();
    }

    previousUserId.current = userId;
  }, [loading, user?.id]);

  return null;
}
