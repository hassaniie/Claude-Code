import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------ Button */

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium ' +
    'transition-all duration-150 outline-none disabled:pointer-events-none disabled:opacity-45 ' +
    'active:scale-[0.985] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_2px_8px_rgba(59,130,246,0.28)] hover:bg-primary-hover',
        secondary:
          'bg-surface-raised text-foreground border border-border hover:border-border-strong hover:bg-surface-overlay',
        ghost: 'text-muted hover:text-foreground hover:bg-surface-raised',
        outline: 'border border-border-strong text-foreground hover:bg-surface-raised',
        danger:
          'bg-danger text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)] hover:brightness-110',
        success: 'bg-success text-[#04140a] font-semibold hover:brightness-110',
        warning: 'bg-warning text-[#1a1200] font-semibold hover:brightness-110',
        subtle: 'bg-surface-inset text-muted hover:text-foreground',
      },
      size: {
        xs: 'h-7 px-2.5 text-[12px] rounded-md',
        sm: 'h-8 px-3',
        md: 'h-9 px-3.5',
        lg: 'h-11 px-5 text-sm',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded-md',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

/* ------------------------------------------------------------------- Badge */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-[0.01em] whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-dim text-muted border border-border',
        primary: 'bg-primary-muted text-primary border border-primary/25',
        success: 'bg-success-dim text-success border border-success/25',
        warning: 'bg-warning-dim text-warning border border-warning/25',
        danger: 'bg-danger-dim text-danger border border-danger/25',
        info: 'bg-info-dim text-info border border-info/25',
        outline: 'border border-border-strong text-muted',
      },
      size: { sm: 'text-[10px] px-1.5 py-0', md: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/* -------------------------------------------------------------- StatusPill */

export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const DOT: Record<PillTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral',
  primary: 'bg-primary',
};

/** Status + a live dot. `pulse` marks states that demand attention. */
export function StatusPill({
  tone = 'neutral',
  children,
  pulse,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-foreground',
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-70', DOT[tone], 'animate-[pulse-ring_2.4s_ease-in-out_infinite]')} />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOT[tone])} />
      </span>
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------- Kbd */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-inset px-1.5',
        'font-sans text-[10px] font-medium text-subtle shadow-[0_1px_0_var(--border)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* --------------------------------------------------------------- Skeletons */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-raised',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[sweep_2.6s_linear_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.045] after:to-transparent',
        className,
      )}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-subtle', className)} />;
}

/* ---------------------------------------------------------------- Progress */

export function Meter({
  value,
  tone = 'primary',
  className,
  height = 6,
  segments,
}: {
  value: number;
  tone?: PillTone;
  className?: string;
  height?: number;
  /** Optional stacked segments, e.g. cars vs motorcycles. */
  segments?: Array<{ value: number; tone: PillTone; label?: string }>;
}) {
  const parts = segments ?? [{ value, tone }];
  return (
    <div
      className={cn('flex w-full overflow-hidden rounded-full bg-surface-inset', className)}
      style={{ height }}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {parts.map((p, i) => (
        <div
          key={i}
          title={p.label}
          className={cn('h-full transition-[width] duration-500 ease-out', DOT[p.tone])}
          style={{ width: `${Math.max(0, Math.min(100, p.value))}%` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  name,
  seed = 1,
  size = 32,
  className,
}: {
  name: string;
  seed?: number;
  size?: number;
  className?: string;
}) {
  const hue = (seed * 47) % 360;
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 55% 28%))`,
      }}
      aria-hidden
    >
      {letters}
    </span>
  );
}

/* -------------------------------------------------------------- Separator */

export function Separator({
  orientation = 'horizontal',
  className,
}: {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  return (
    <div
      role="separator"
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}

export { buttonVariants, badgeVariants };
