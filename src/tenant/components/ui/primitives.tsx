import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { Tone } from '../../lib/meta';

/* ------------------------------------------------------------------ Button */

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium ' +
    'transition-all duration-150 outline-none disabled:pointer-events-none disabled:opacity-45 ' +
    'active:scale-[0.985] select-none focus-visible:ring-2 focus-visible:ring-ring/40',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_2px_10px_rgba(99,102,241,0.28)] hover:bg-primary-hover',
        secondary:
          'bg-surface-raised text-foreground border border-border hover:border-border-strong hover:bg-surface-overlay',
        ghost: 'text-muted hover:text-foreground hover:bg-surface-raised',
        outline: 'border border-border-strong text-foreground hover:bg-surface-raised',
        danger: 'bg-critical text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)] hover:brightness-110',
        success: 'bg-success text-white font-semibold hover:brightness-110',
        subtle: 'bg-surface-inset text-muted hover:text-foreground',
      },
      size: {
        xs: 'h-7 px-2.5 text-[12px] rounded-lg',
        sm: 'h-8 px-3 text-[12.5px]',
        md: 'h-9 px-4 text-[13px]',
        lg: 'h-11 px-5 text-[14px]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
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

/* ---------------------------------------------------------- tone classes */

/** Soft "chip" surface per semantic tone — dim background, saturated text. */
export const TONE_CHIP: Record<Tone, string> = {
  neutral: 'bg-neutral-dim text-muted border border-border',
  primary: 'bg-primary-muted text-primary border border-primary/25',
  success: 'bg-success-dim text-success border border-success/25',
  warning: 'bg-warning-dim text-warning border border-warning/25',
  critical: 'bg-critical-dim text-critical border border-critical/25',
  info: 'bg-info-dim text-info border border-info/25',
  energy: 'bg-energy-dim text-energy border border-energy/25',
  visitor: 'bg-visitor-dim text-visitor border border-visitor/25',
  service: 'bg-service-dim text-service border border-service/25',
  online: 'bg-online-dim text-online border border-online/25',
  offline: 'bg-offline-dim text-muted border border-border',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-neutral', primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning',
  critical: 'bg-critical', info: 'bg-info', energy: 'bg-energy', visitor: 'bg-visitor',
  service: 'bg-service', online: 'bg-online', offline: 'bg-offline',
};

export const TONE_ICON_BOX: Record<Tone, string> = {
  neutral: 'text-muted bg-surface-raised', primary: 'text-primary bg-primary-muted',
  success: 'text-success bg-success-dim', warning: 'text-warning bg-warning-dim',
  critical: 'text-critical bg-critical-dim', info: 'text-info bg-info-dim',
  energy: 'text-energy bg-energy-dim', visitor: 'text-visitor bg-visitor-dim',
  service: 'text-service bg-service-dim', online: 'text-online bg-online-dim',
  offline: 'text-muted bg-offline-dim',
};

/* -------------------------------------------------------------- StatusBadge */

/** Status + optional dot, always paired with a text label. Never colour-only. */
export function StatusBadge({
  tone = 'neutral',
  children,
  dot = true,
  pulse,
  size = 'md',
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]',
        TONE_CHIP[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-70', TONE_DOT[tone], 'animate-[pulse-ring_2.4s_ease-in-out_infinite]')} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- Badge */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-dim text-muted border border-border',
        primary: 'bg-primary-muted text-primary border border-primary/25',
        success: 'bg-success-dim text-success border border-success/25',
        warning: 'bg-warning-dim text-warning border border-warning/25',
        critical: 'bg-critical-dim text-critical border border-critical/25',
        info: 'bg-info-dim text-info border border-info/25',
        outline: 'border border-border-strong text-muted',
      },
      size: { sm: 'text-[10px] px-1.5 py-0', md: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export function Badge({ className, tone, size, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/* --------------------------------------------------------------- IconBox */

/** A rounded, tinted square holding a lucide icon — the module/section marker. */
export function IconBox({ icon: Icon, tone = 'neutral', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = { sm: 'h-7 w-7 rounded-lg', md: 'h-9 w-9 rounded-[11px]', lg: 'h-11 w-11 rounded-xl' };
  const ic = { sm: 'h-3.5 w-3.5', md: 'h-4.5 w-4.5', lg: 'h-5 w-5' };
  return (
    <span className={cn('flex shrink-0 items-center justify-center', dims[size], TONE_ICON_BOX[tone], className)}>
      <Icon className={ic[size]} />
    </span>
  );
}

/* --------------------------------------------------------------------- Kbd */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-inset px-1.5',
        'font-sans text-[10px] font-medium text-subtle',
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
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent',
        className,
      )}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-subtle', className)} />;
}

/* ---------------------------------------------------------------- Progress */

export function ProgressBar({
  value,
  tone = 'primary',
  className,
  height = 7,
  segments,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  height?: number;
  segments?: Array<{ value: number; tone: Tone; label?: string }>;
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
        <div key={i} title={p.label} className={cn('h-full transition-[width] duration-500 ease-out', TONE_DOT[p.tone])} style={{ width: `${Math.max(0, Math.min(100, p.value))}%` }} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({ name, seed = 1, size = 34, className }: { name: string; seed?: number; size?: number; className?: string }) {
  const hue = (seed * 47) % 360;
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(140deg, hsl(${hue} 52% 46%), hsl(${(hue + 42) % 360} 55% 30%))` }}
      aria-hidden
    >
      {letters}
    </span>
  );
}

/** A tenant "logo" mark — brand-hue gradient tile with the org initials. */
export function TenantMark({ name, hue, size = 40, className }: { name: string; hue: number; size?: number; className?: string }) {
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-[12px] font-semibold text-white ring-1 ring-white/10', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(140deg, hsl(${hue} 62% 52%), hsl(${(hue + 30) % 360} 58% 34%))` }}
      aria-hidden
    >
      {letters}
    </span>
  );
}

/* -------------------------------------------------------------- Separator */

export function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) {
  return <div role="separator" className={cn('bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)} />;
}

export { buttonVariants };
