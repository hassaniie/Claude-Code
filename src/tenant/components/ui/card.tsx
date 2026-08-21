import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * The surface every panel is built from. Softer elevation and a larger radius
 * than the PMS command centre — the calmer, more premium tenant feel.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { interactive?: boolean; glass?: boolean }>(
  ({ className, interactive, glass, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'edge-light relative flex flex-col rounded-[16px] border border-border bg-surface shadow-[var(--shadow-sm)]',
        glass && 'glass',
        interactive && 'cursor-pointer transition-all duration-200 hover:border-border-strong hover:shadow-[var(--shadow-md)] hover:-translate-y-px',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
  compact,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border-subtle', compact ? 'px-4 py-3' : 'px-5 py-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-[12px] text-subtle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-3 border-t border-border-subtle px-5 py-3.5', className)} {...props} />;
}

/** Page-level section heading, used above grids of cards. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-subtle">{title}</h2>
        {description && <p className="mt-1 text-[12.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
