import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/** Consistent page gutter and vertical rhythm for every screen. Calmer, more
 *  generous spacing than the PMS command centre. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto flex max-w-[1600px] flex-col gap-5 p-4 lg:p-6', className)}>{children}</div>;
}

/** Full-height page for screens that own their own scrolling (board, wall). */
export function PageFull({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6', className)}>{children}</div>;
}

export function Toolbar({ children, className, sticky }: { children: ReactNode; className?: string; sticky?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', sticky && 'sticky top-0 z-20 -mx-4 bg-canvas/85 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6', className)}>
      {children}
    </div>
  );
}

export function Spacer() {
  return <div className="flex-1" />;
}

/** Simple responsive grid for KPI rows. */
export function StatGrid({ children, className, cols = 4 }: { children: ReactNode; className?: string; cols?: 2 | 3 | 4 | 5 | 6 }) {
  const map = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
  };
  return <div className={cn('grid gap-3.5', map[cols], className)}>{children}</div>;
}
