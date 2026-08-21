/**
 * Composition-level components shared across every screen: the KPI tile, the
 * numeric value display, trend deltas, the activity timeline, the wizard
 * stepper, rating stars, breadcrumbs and page headers.
 *
 * These sit above the ui/ primitives and encode the product's information
 * hierarchy — large scannable figures, units kept visually secondary, status
 * never by colour alone.
 */

import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronRight, Star, type LucideIcon } from 'lucide-react';
import { Fragment, memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn, num } from '../lib/utils';
import type { Tone } from '../lib/meta';
import { Sparkline } from './charts';
import { Tooltip } from './ui/overlay';
import { IconBox, Skeleton, TONE_DOT } from './ui/primitives';

/* ----------------------------------------------------------------- Delta */

export function Delta({ value, suffix = '', invert, className, showZero }: { value: number; suffix?: string; invert?: boolean; className?: string; showZero?: boolean }) {
  if (value === 0 && !showZero) return null;
  const positive = value > 0;
  const good = invert ? !positive : positive;
  const Icon = value === 0 ? ArrowRight : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('tnum inline-flex items-center gap-0.5 text-[11.5px] font-medium', value === 0 ? 'text-subtle' : good ? 'text-success' : 'text-critical', className)}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}
      {num(value, Number.isInteger(value) ? 0 : 1)}
      {suffix}
    </span>
  );
}

/* --------------------------------------------------- AnimatedNumber */

export function AnimatedNumber({ value, digits = 0, className, duration = 520 }: { value: number; digits?: number; className?: string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    if (delta === 0) return;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(origin + delta * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = value;
    };
  }, [value, duration]);
  return <span className={cn('tnum', className)}>{num(display, digits)}</span>;
}

/* --------------------------------------------------------------- MetricValue */

/** A large figure with its unit kept secondary but clearly associated. */
export function MetricValue({ value, unit, size = 'md', className }: { value: ReactNode; unit?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = {
    sm: 'text-[18px]',
    md: 'text-[24px]',
    lg: 'text-[30px]',
    xl: 'text-[40px]',
  };
  const unitSizes = { sm: 'text-[11px]', md: 'text-[12px]', lg: 'text-[13px]', xl: 'text-[15px]' };
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span className={cn('tnum font-semibold leading-none tracking-[-0.03em] text-foreground', sizes[size])}>{value}</span>
      {unit && <span className={cn('font-medium text-subtle', unitSizes[size])}>{unit}</span>}
    </span>
  );
}

/* ---------------------------------------------------------------- StatCard */

export interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: Tone;
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  caption?: ReactNode;
  spark?: number[];
  sparkColor?: string;
  onClick?: () => void;
  loading?: boolean;
  tooltip?: ReactNode;
  className?: string;
}

/** The workhorse KPI tile: one figure, one label, only as much supporting
 *  detail as fits without competing with the number. */
export const StatCard = memo(function StatCard({
  label, value, unit, icon: Icon, tone = 'neutral', delta, deltaSuffix, invertDelta, caption, spark, sparkColor, onClick, loading, tooltip, className,
}: StatCardProps) {
  const body = (
    <div
      className={cn(
        'edge-light group relative flex min-h-[116px] flex-col gap-3 overflow-hidden rounded-[15px] border border-border bg-surface p-4 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-border-strong hover:bg-surface-raised hover:-translate-y-px hover:shadow-[var(--shadow-md)]',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-[0.09em] text-subtle">{label}</p>
        {Icon && <IconBox icon={Icon} tone={tone} size="sm" />}
      </div>

      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <MetricValue value={value} unit={unit} />
      )}

      {(delta !== undefined || caption) && (
        <div className="flex items-center gap-2">
          {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} />}
          {caption && <span className="truncate text-[11.5px] text-subtle">{caption}</span>}
        </div>
      )}

      {spark && spark.length > 1 && (
        <div className="-mx-4 -mb-4 mt-auto opacity-70 transition-opacity group-hover:opacity-100">
          <Sparkline data={spark} height={30} color={sparkColor} />
        </div>
      )}
    </div>
  );
  return tooltip ? <Tooltip content={tooltip}>{body}</Tooltip> : body;
});

/* --------------------------------------------------------------- KeyValue */

export function KeyValue({ label, value, mono, className }: { label: ReactNode; value: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5', className)}>
      <span className="shrink-0 text-[12px] text-subtle">{label}</span>
      <span className={cn('truncate text-right text-[13px] font-medium text-foreground', mono && 'font-mono tnum')}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- Timeline */

export interface TimelineItem {
  id: string;
  icon?: LucideIcon;
  tone?: Tone;
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        const last = i === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
            <span className={cn('relative z-10 mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border bg-surface', item.tone && TONE_ICON_FROM[item.tone])}>
              {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className={cn('h-1.5 w-1.5 rounded-full', item.tone ? TONE_DOT[item.tone] : 'bg-subtle')} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] font-medium text-foreground">{item.title}</p>
                {item.meta && <span className="shrink-0 text-[11px] text-subtle">{item.meta}</span>}
              </div>
              {item.detail && <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{item.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const TONE_ICON_FROM: Record<Tone, string> = {
  neutral: 'text-muted', primary: 'text-primary', success: 'text-success', warning: 'text-warning',
  critical: 'text-critical', info: 'text-info', energy: 'text-energy', visitor: 'text-visitor',
  service: 'text-service', online: 'text-online', offline: 'text-muted',
};

/* ----------------------------------------------------------------- Stepper */

export function Stepper({ steps, current, onStep, className }: { steps: Array<{ label: string; done?: boolean }>; current: number; onStep?: (i: number) => void; className?: string }) {
  return (
    <ol className={cn('flex items-center gap-1', className)}>
      {steps.map((step, i) => {
        const active = i === current;
        const done = step.done ?? i < current;
        const reachable = Boolean(onStep) && (done || i <= current);
        return (
          <Fragment key={step.label}>
            <li className="flex items-center gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={reachable ? () => onStep?.(i) : undefined}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : done ? 'border-success/40 bg-success-dim text-success' : 'border-border bg-surface-inset text-subtle',
                  reachable && !active && 'hover:border-border-strong',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              <span className={cn('hidden text-[12px] font-medium lg:inline', active ? 'text-foreground' : done ? 'text-muted' : 'text-subtle')}>{step.label}</span>
            </li>
            {i < steps.length - 1 && <span className={cn('h-px w-4 flex-1 lg:w-8', done ? 'bg-success/40' : 'bg-border')} aria-hidden />}
          </Fragment>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------- RatingStars */

export function RatingStars({ value, onChange, size = 16, className }: { value: number; onChange?: (v: number) => void; size?: number; className?: string }) {
  const [hover, setHover] = useState(0);
  const interactive = Boolean(onChange);
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={interactive ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onMouseEnter={interactive ? () => setHover(n) : undefined}
            onMouseLeave={interactive ? () => setHover(0) : undefined}
            onClick={interactive ? () => onChange?.(n) : undefined}
            className={cn(interactive && 'cursor-pointer transition-transform hover:scale-110', !interactive && 'cursor-default')}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star className={cn(filled ? 'fill-warning text-warning' : 'text-border-strong')} style={{ width: size, height: size }} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- PageHeader */

export function PageHeader({ title, description, actions, breadcrumb, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumb?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
          {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Breadcrumb */

export function Breadcrumb({ items, className }: { items: Array<{ label: ReactNode; to?: string }>; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1.5 text-[12px] text-subtle', className)} aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={i}>
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className={cn(i === items.length - 1 && 'text-muted')}>{item.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight className="h-3 w-3 opacity-60" />}
        </Fragment>
      ))}
    </nav>
  );
}
