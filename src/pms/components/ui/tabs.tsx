import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 rounded-xl border border-border bg-surface-inset p-1', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-subtle transition-all',
      'outline-none hover:text-foreground',
      'data-[state=active]:bg-surface-raised data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-sm)]',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('outline-none data-[state=active]:animate-[fade-up_0.28s_cubic-bezier(0.22,1,0.36,1)]', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

/**
 * Segmented control — for switching a view's *mode* (2D / list / table),
 * as opposed to Tabs which switch its *content*.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode; disabled?: boolean }>;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-inset p-0.5', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150 disabled:opacity-40',
              size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-[12px]',
              active
                ? 'bg-surface-raised text-foreground shadow-[var(--shadow-sm)]'
                : 'text-subtle hover:text-foreground',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chip row, used for map filters. */
export function FilterChips<T extends string>({
  values,
  onChange,
  options,
  className,
}: {
  values: T[];
  onChange: (values: T[]) => void;
  options: Array<{ value: T; label: ReactNode; dot?: string; count?: number }>;
  className?: string;
}) {
  const toggle = (v: T) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium transition-all',
              active
                ? 'border-primary/40 bg-primary-muted text-foreground'
                : 'border-border bg-surface-inset text-subtle hover:border-border-strong hover:text-muted',
            )}
          >
            {opt.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: opt.dot }} />}
            {opt.label}
            {opt.count !== undefined && (
              <span className="tnum rounded bg-surface px-1 text-[10px] text-subtle">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
