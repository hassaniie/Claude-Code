/**
 * Domain atoms — the small, repeated pieces that give the product its
 * operational vocabulary: plates, deltas, KPI tiles, live gauges.
 */

import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn, num } from '../../lib/utils';
import { Sparkline } from '../charts';
import { Tooltip } from '../ui/overlay';
import { Skeleton, type PillTone } from '../ui/primitives';

/* --------------------------------------------------------------- PlateTag */

/** A number plate, rendered like a number plate. Monospaced and unmistakable. */
export const PlateTag = memo(function PlateTag({
  plate,
  size = 'md',
  dim,
  className,
}: {
  plate: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dim?: boolean;
  className?: string;
}) {
  const sizes = {
    xs: 'h-[18px] px-1.5 text-[10px] tracking-[0.06em]',
    sm: 'h-[22px] px-2 text-[11px] tracking-[0.07em]',
    md: 'h-[26px] px-2.5 text-[12.5px] tracking-[0.08em]',
    lg: 'h-[34px] px-3.5 text-[16px] tracking-[0.09em]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-mono font-semibold uppercase',
        'border border-border-strong bg-surface-inset text-foreground',
        dim && 'opacity-60',
        sizes[size],
        className,
      )}
    >
      {plate}
    </span>
  );
});

/* --------------------------------------------------------------- Delta */

export function Delta({
  value,
  suffix = '',
  invert,
  className,
  showZero,
}: {
  value: number;
  suffix?: string;
  /** When true, a rise is bad (e.g. failed recognitions). */
  invert?: boolean;
  className?: string;
  showZero?: boolean;
}) {
  if (value === 0 && !showZero) return null;
  const positive = value > 0;
  const good = invert ? !positive : positive;
  const Icon = value === 0 ? ArrowRight : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-0.5 text-[11px] font-medium',
        value === 0 ? 'text-subtle' : good ? 'text-success' : 'text-danger',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}
      {num(value, Number.isInteger(value) ? 0 : 1)}
      {suffix}
    </span>
  );
}

/* --------------------------------------------------- AnimatedNumber */

/** Counts to its target so a changing figure registers without a hard cut. */
export function AnimatedNumber({
  value,
  digits = 0,
  className,
  duration = 480,
}: {
  value: number;
  digits?: number;
  className?: string;
  duration?: number;
}) {
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
      // easeOutCubic — fast settle, no bounce.
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

/* ---------------------------------------------------------------- StatTile */

export interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: PillTone;
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  caption?: ReactNode;
  spark?: number[];
  onClick?: () => void;
  loading?: boolean;
  tooltip?: ReactNode;
  className?: string;
}

const TONE_ICON: Record<PillTone, string> = {
  success: 'text-success bg-success-dim',
  warning: 'text-warning bg-warning-dim',
  danger: 'text-danger bg-danger-dim',
  info: 'text-info bg-info-dim',
  primary: 'text-primary bg-primary-muted',
  neutral: 'text-muted bg-surface-raised',
};

/**
 * The workhorse KPI tile. One figure, one label, and only as much supporting
 * detail as fits without competing with the number.
 */
export const StatTile = memo(function StatTile({
  label, value, unit, icon: Icon, tone = 'neutral', delta, deltaSuffix,
  invertDelta, caption, spark, onClick, loading, tooltip, className,
}: StatTileProps) {
  const body = (
    <div
      className={cn(
        'edge-light group relative flex min-h-[104px] flex-col gap-2.5 overflow-hidden rounded-[13px] border border-border bg-surface p-3.5',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:border-border-strong hover:bg-surface-raised hover:-translate-y-px hover:shadow-[var(--shadow-md)]',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-medium uppercase leading-tight tracking-[0.1em] text-subtle">{label}</p>
        {Icon && (
          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE_ICON[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <div className="flex items-baseline gap-1">
          <span className="tnum text-[24px] font-semibold leading-none tracking-[-0.03em] text-foreground">
            {value}
          </span>
          {unit && <span className="text-[12px] font-medium text-subtle">{unit}</span>}
        </div>
      )}

      {(delta !== undefined || caption) && (
        <div className="flex items-center gap-2">
          {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} />}
          {caption && <span className="truncate text-[11px] text-subtle">{caption}</span>}
        </div>
      )}

      {spark && spark.length > 1 && (
        <div className="-mx-3.5 -mb-3.5 mt-auto opacity-70 transition-opacity group-hover:opacity-100">
          <Sparkline data={spark} height={28} />
        </div>
      )}
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{body}</Tooltip> : body;
});

/* ----------------------------------------------------------- RadialGauge */

/**
 * Occupancy gauge. A 270° sweep with a graduated track — reads as an
 * instrument rather than a progress bar, which is the point on a wall display.
 */
export function RadialGauge({
  value,
  size = 190,
  thickness = 12,
  label,
  sublabel,
  tone,
  ticks = 36,
  children,
}: {
  /** 0–100. */
  value: number;
  size?: number;
  thickness?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  tone?: 'auto' | PillTone;
  ticks?: number;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const START = 135;
  const SWEEP = 270;
  const r = (size - thickness) / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;

  const colour =
    tone && tone !== 'auto'
      ? `var(--${tone === 'primary' ? 'primary' : tone === 'neutral' ? 'neutral' : tone})`
      : clamped >= 95
        ? 'var(--danger)'
        : clamped >= 80
          ? 'var(--warning)'
          : 'var(--state-vacant)';

  const polar = (angleDeg: number, radius: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as const;
  };

  const arc = (from: number, to: number, radius: number) => {
    const [x1, y1] = polar(from, radius);
    const [x2, y2] = polar(to, radius);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const end = START + (SWEEP * clamped) / 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-0">
        {/* graduated ticks */}
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const t = i / ticks;
          const angle = START + SWEEP * t;
          const lit = t * 100 <= clamped;
          const [x1, y1] = polar(angle, r + thickness / 2 + 5);
          const [x2, y2] = polar(angle, r + thickness / 2 + (i % 6 === 0 ? 11 : 8));
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={lit ? colour : 'var(--border-strong)'}
              strokeWidth={i % 6 === 0 ? 1.6 : 1}
              opacity={lit ? 0.85 : 0.5}
              strokeLinecap="round"
            />
          );
        })}

        <path d={arc(START, START + SWEEP, r)} fill="none" stroke="var(--surface-inset)" strokeWidth={thickness} strokeLinecap="round" />
        <path
          d={arc(START, Math.max(START + 0.1, end), r)}
          fill="none"
          stroke={colour}
          strokeWidth={thickness}
          strokeLinecap="round"
          style={{ transition: 'd 600ms cubic-bezier(0.22, 1, 0.36, 1)', filter: `drop-shadow(0 0 8px ${colour}55)` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {children ?? (
          <>
            <span className="tnum text-[34px] font-semibold leading-none tracking-[-0.035em] text-foreground">
              {clamped.toFixed(1)}
              <span className="text-[18px] text-subtle">%</span>
            </span>
            {label && <span className="text-[10.5px] uppercase tracking-[0.12em] text-subtle">{label}</span>}
            {sublabel && <span className="mt-1 text-[11.5px] text-muted">{sublabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- LiveDot */

export function LiveDot({ tone = 'success', label }: { tone?: PillTone; label?: string }) {
  const colours: Record<PillTone, string> = {
    success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger',
    info: 'bg-info', neutral: 'bg-neutral', primary: 'bg-primary',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className={cn('absolute inline-flex h-full w-full animate-[pulse-ring_2.4s_ease-in-out_infinite] rounded-full opacity-60', colours[tone])} />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', colours[tone])} />
      </span>
      {label && <span className="text-[11px] text-muted">{label}</span>}
    </span>
  );
}

/* ------------------------------------------------------------ KeyValue */

export function KeyValue({
  label,
  value,
  mono,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5', className)}>
      <span className="shrink-0 text-[11.5px] text-subtle">{label}</span>
      <span className={cn('truncate text-right text-[12.5px] font-medium text-foreground', mono && 'font-mono tnum')}>
        {value}
      </span>
    </div>
  );
}
