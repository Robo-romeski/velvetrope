import { cn } from '@/app/components/ui';

export function Asset3dThumbnail({
  url,
  title,
  className,
}: {
  url?: string | null;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-[4/3] overflow-hidden bg-surface-subtle',
        className,
      )}
      {...(url
        ? {
            role: 'img',
            'aria-label': `Thumbnail for ${title}`,
            style: {
              backgroundImage: `url("${url.replaceAll('"', '\\"')}")`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            },
          }
        : {})}
    >
      {!url && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="max-w-44 text-center">
            <div className="mx-auto size-12 border border-border-strong bg-surface [transform:rotate(30deg)_skewY(-8deg)]" />
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              3D preview
            </div>
            <div className="mt-1 text-xs text-muted">Thumbnail pending</div>
          </div>
        </div>
      )}
    </div>
  );
}
