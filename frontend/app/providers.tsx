'use client';

import { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { PostHogIdentity } from './components/PostHogIdentity';
import { AuthProvider } from '@/lib/auth';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <AuthProvider>
        <PostHogIdentity />
        {children}
      </AuthProvider>
    </MotionConfig>
  );
}
