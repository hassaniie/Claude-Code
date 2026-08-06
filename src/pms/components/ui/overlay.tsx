/**
 * Overlay surfaces: dialog, side panel (drawer), popover, tooltip, menu.
 *
 * Side panels are the default for detail: they preserve the operator's place in
 * the underlying list, where a modal would tear them out of it. Modals are
 * reserved for decisions that must block.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------ Dialog */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const Overlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]',
      'data-[state=open]:animate-[fade-in_0.2s_ease-out]',
      className,
    )}
    {...props}
  />
));
Overlay.displayName = 'DialogOverlay';

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: 'sm' | 'md' | 'lg' | 'xl' }
>(({ className, children, size = 'md', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
        'overflow-hidden rounded-[16px] border border-border bg-surface-overlay shadow-[var(--shadow-lg)]',
        'data-[state=open]:animate-[fade-up_0.24s_cubic-bezier(0.22,1,0.36,1)]',
        { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size],
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({
  title,
  description,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-muted">
            {icon}
          </span>
        )}
        <div>
          <DialogPrimitive.Title className="text-sm font-semibold text-foreground">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-1 text-[12.5px] leading-relaxed text-muted">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
      </div>
      <DialogPrimitive.Close className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-raised hover:text-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </div>
  );
}

export function DialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex-1 overflow-y-auto px-5 py-4', className)}>{children}</div>;
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3.5', className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- Side panel */

export const SidePanel = DialogPrimitive.Root;
export const SidePanelTrigger = DialogPrimitive.Trigger;
export const SidePanelClose = DialogPrimitive.Close;

export const SidePanelContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'right' | 'left' | 'bottom';
    width?: string;
  }
>(({ className, children, side = 'right', width = '480px', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      style={side === 'bottom' ? undefined : { width, maxWidth: '96vw' }}
      className={cn(
        'fixed z-50 flex flex-col border-border bg-surface shadow-[var(--shadow-lg)]',
        side === 'right' && 'inset-y-0 right-0 border-l data-[state=open]:animate-[slide-in_0.28s_cubic-bezier(0.22,1,0.36,1)]',
        side === 'left' && 'inset-y-0 left-0 border-r data-[state=open]:animate-[slide-in_0.28s_cubic-bezier(0.22,1,0.36,1)]',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[18px] border-t data-[state=open]:animate-[fade-up_0.28s_cubic-bezier(0.22,1,0.36,1)]',
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SidePanelContent.displayName = 'SidePanelContent';

export function SidePanelHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <DialogPrimitive.Title className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </DialogPrimitive.Title>
          {badge}
        </div>
        {subtitle && (
          <DialogPrimitive.Description className="mt-1 truncate text-[12px] text-subtle">
            {subtitle}
          </DialogPrimitive.Description>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        <DialogPrimitive.Close className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-raised hover:text-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close panel</span>
        </DialogPrimitive.Close>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Tooltip */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 200,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[60] max-w-[280px] rounded-lg border border-border bg-surface-overlay px-2.5 py-1.5 text-[11.5px] leading-snug text-foreground',
            'shadow-[var(--shadow-md)] data-[state=delayed-open]:animate-[fade-in_0.14s_ease-out]',
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ----------------------------------------------------------------- Popover */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'end', sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-[14px] border border-border bg-surface-overlay p-1.5 shadow-[var(--shadow-lg)]',
        'data-[state=open]:animate-[fade-up_0.18s_cubic-bezier(0.22,1,0.36,1)]',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

/* -------------------------------------------------------------- Menu */

export const Menu = DropdownPrimitive.Root;
export const MenuTrigger = DropdownPrimitive.Trigger;

export const MenuContent = forwardRef<
  ElementRef<typeof DropdownPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, align = 'end', sideOffset = 6, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[200px] overflow-hidden rounded-[12px] border border-border bg-surface-overlay p-1 shadow-[var(--shadow-lg)]',
        'data-[state=open]:animate-[fade-up_0.16s_cubic-bezier(0.22,1,0.36,1)]',
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
MenuContent.displayName = 'MenuContent';

export const MenuItem = forwardRef<
  ElementRef<typeof DropdownPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] outline-none transition-colors',
      'data-[highlighted]:bg-surface-raised data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      destructive ? 'text-danger data-[highlighted]:bg-danger-dim' : 'text-muted data-[highlighted]:text-foreground',
      className,
    )}
    {...props}
  />
));
MenuItem.displayName = 'MenuItem';

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">{children}</div>
  );
}

export const MenuSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
