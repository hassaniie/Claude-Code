import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/** Consistent page gutter and rhythm for every screen. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4 p-3.5 lg:p-5', className)}>{children}</div>;
}

/** Full-height page for screens that own their own scrolling (map, CCTV wall). */
export function PageFull({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex h-full min-h-0 flex-col gap-3.5 p-3.5 lg:p-5', className)}>{children}</div>;
}

export function Toolbar({
  children,
  className,
  sticky,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        sticky && 'sticky top-0 z-20 -mx-3.5 bg-canvas/85 px-3.5 py-2 backdrop-blur lg:-mx-5 lg:px-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Spacer() {
  return <div className="flex-1" />;
}
