import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

const shellWidths = {
  narrow: 'max-w-xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
} as const;

export function PageShell({
  children,
  size = 'default',
  className,
}: {
  children: ReactNode;
  size?: keyof typeof shellWidths;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'mx-auto w-full px-4 py-8 sm:px-6 sm:py-12',
        shellWidths[size],
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  size = 'default',
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: 'default' | 'display';
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </div>
        )}
        <h1
          className={cn(
            'font-display font-semibold tracking-[-0.035em] text-foreground',
            size === 'display'
              ? 'text-4xl leading-[0.98] sm:text-6xl'
              : 'text-3xl leading-[1.02] sm:text-4xl',
          )}
        >
          {title}
        </h1>
        {description && (
          <div className="mt-3 text-sm leading-6 text-muted sm:text-base">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const buttonVariants = {
  primary:
    'border border-action bg-action text-action-foreground hover:border-action-hover hover:bg-action-hover',
  secondary:
    'border border-border-strong bg-surface text-foreground hover:border-foreground/45 hover:bg-surface-subtle',
  ghost:
    'border border-transparent bg-transparent text-foreground underline-offset-4 hover:text-accent hover:underline',
  danger:
    'border border-danger bg-danger text-white hover:opacity-90 dark:text-background',
} as const;

const buttonSizes = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
} as const;

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <button
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonStyles({ variant, size, className })}>
      {children}
    </Link>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'font-semibold text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-accent-hover',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface p-5 shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && (
              <h2 className="font-display text-2xl font-semibold tracking-[-0.025em]">
                {title}
              </h2>
            )}
            {description && (
              <div className="mt-1 text-sm leading-6 text-muted">
                {description}
              </div>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FormField({
  label,
  hint,
  error,
  errorId,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  errorId?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <div className="text-xs leading-5 text-muted">{hint}</div>
      )}
      {error && (
        <div
          id={errorId}
          className="text-xs leading-5 text-danger"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('vk-field', className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('vk-field', className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('vk-field', className)} {...props} />;
}

const alertTones = {
  info: 'border-accent/20 bg-accent-soft text-foreground',
  success: 'border-success/25 bg-success-soft text-success',
  warning: 'border-warning/25 bg-warning-soft text-warning',
  danger: 'border-danger/25 bg-danger-soft text-danger',
} as const;

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof alertTones;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  return (
    <div
      role={role}
      className={cn(
        'rounded-md border px-4 py-3 text-sm leading-6',
        alertTones[tone],
        className,
      )}
    >
      {title && <div className="font-semibold">{title}</div>}
      <div className={cn(Boolean(title) && 'mt-0.5')}>{children}</div>
    </div>
  );
}

const badgeTones = {
  neutral: 'bg-surface-subtle text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
} as const;

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold capitalize tracking-wide',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface px-4 py-4',
        className,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
        {value}
      </div>
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface/60 px-6 py-10 text-center">
      <div className="font-display text-xl font-semibold">{title}</div>
      {description && (
        <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {description}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
