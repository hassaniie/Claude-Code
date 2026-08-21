/**
 * Data surfaces: the table and the states every data view must be able to show
 * — loading, empty, error. These are components rather than copy-pasted markup
 * so a screen physically cannot forget one.
 */

import {
  AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Inbox, RefreshCw,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button, Skeleton } from './primitives';

/* ------------------------------------------------------------------- Table */

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  emptyAction,
  emptyIcon,
  pageSize = 0,
  stickyHeader = true,
  dense,
  className,
  selectedKey,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  pageSize?: number;
  stickyHeader?: boolean;
  dense?: boolean;
  className?: string;
  selectedKey?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = Math.min(page, pageCount - 1);
  const visible = pageSize ? sorted.slice(current * pageSize, current * pageSize + pageSize) : sorted;

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="bg-surface-inset">
              {columns.map((col) => {
                const sortable = Boolean(col.sortValue);
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'whitespace-nowrap border-b border-border px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-subtle',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.hideBelow && HIDE[col.hideBelow],
                      sortable && 'cursor-pointer select-none transition-colors hover:text-foreground',
                    )}
                    onClick={
                      sortable
                        ? () => setSort((prev) => (prev?.key === col.key ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' }))
                        : undefined
                    }
                  >
                    <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                      {col.header}
                      {sortable && (active ? sort!.dir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border-subtle">
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-3.5', dense ? 'py-2' : 'py-3', col.hideBelow && HIDE[col.hideBelow])}>
                      <Skeleton className="h-3.5 w-full max-w-[150px]" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              visible.map((row, i) => {
                const key = rowKey(row, i);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border-subtle transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-surface-raised',
                      selectedKey === key && 'bg-primary-muted/40',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3.5 align-middle text-[13px] text-muted',
                          dense ? 'py-2' : 'py-3',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.hideBelow && HIDE[col.hideBelow],
                          col.className,
                        )}
                      >
                        {col.cell(row, i)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>

        {!loading && !visible.length && <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} icon={emptyIcon} />}
      </div>

      {pageSize > 0 && sorted.length > pageSize && <Pagination page={current} pageCount={pageCount} total={sorted.length} pageSize={pageSize} onChange={setPage} />}
    </div>
  );
}

/* -------------------------------------------------------------- Pagination */

export function Pagination({ page, pageCount, total, pageSize, onChange }: { page: number; pageCount: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5">
      <p className="tnum text-[11.5px] text-subtle">
        {from}–{to} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="tnum px-2 text-[11.5px] text-muted">
          {page + 1} / {pageCount}
        </span>
        <Button variant="ghost" size="icon-sm" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ States */

export function EmptyState({ title, description, action, icon, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-raised text-subtle">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div>
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, className, compact }: { message: string; onRetry?: () => void; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-critical/25 bg-critical-dim/40 text-center', compact ? 'px-4 py-5' : 'px-6 py-12', className)} role="alert">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-critical/30 bg-critical-dim text-critical">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[13.5px] font-medium text-foreground">Could not load this data</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16', className)}>
      <div className="relative h-9 w-9">
        <span className="absolute inset-0 rounded-full border-2 border-border" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </div>
      <p className="text-[12.5px] text-subtle">{label}</p>
    </div>
  );
}

/** Wraps any async region: one place that decides which state renders. */
export function AsyncBoundary({
  status,
  error,
  onRetry,
  loadingFallback,
  isEmpty,
  emptyState,
  children,
}: {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  children: ReactNode;
}) {
  if (status === 'loading') return <>{loadingFallback ?? <LoadingState />}</>;
  if (status === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={onRetry} />;
  if (isEmpty) return <>{emptyState ?? <EmptyState title="No records" />}</>;
  return <>{children}</>;
}

/* --------------------------------------------------------- Definition list */

export function DefList({ items, columns = 2, className }: { items: Array<{ label: ReactNode; value: ReactNode; span?: boolean }>; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3', className)}>
      {items.map((item, i) => (
        <div key={i} className={cn('min-w-0', item.span && 'col-span-full')}>
          <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-subtle">{item.label}</dt>
          <dd className="mt-1 text-[13px] text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
