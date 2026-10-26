'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/app/components/ui';

const Asset3dCanvas = dynamic(() => import('./Asset3dCanvas'), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[28rem] items-center justify-center bg-surface-subtle text-sm text-muted"
      role="status"
    >
      Preparing interactive viewer…
    </div>
  ),
});

export function Asset3dViewer({
  modelUrl,
  thumbnailUrl,
  title,
  className,
}: {
  modelUrl: string;
  thumbnailUrl?: string | null;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-border bg-surface shadow-card',
        className,
      )}
    >
      <Asset3dCanvas
        modelUrl={modelUrl}
        thumbnailUrl={thumbnailUrl}
        title={title}
      />
    </div>
  );
}
