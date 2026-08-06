import * as SelectPrimitive from '@radix-ui/react-select';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import {
  forwardRef, type ComponentPropsWithoutRef, type ElementRef, type InputHTMLAttributes,
  type ReactNode, type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------ Input */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border bg-surface-inset px-3 text-[13px] text-foreground transition-colors',
        'placeholder:text-disabled outline-none',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-surface-inset px-3 py-2 text-[13px] text-foreground',
        'placeholder:text-disabled outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

/** Search field with a clear affordance and an optional keyboard hint. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  autoFocus,
  hint,
  size = 'md',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  hint?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const heights = { sm: 'h-8', md: 'h-9', lg: 'h-11 text-[14px]' };
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className={cn('pointer-events-none absolute left-3 text-subtle', size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border border-border bg-surface-inset pl-9 pr-9 text-[13px] text-foreground',
          'placeholder:text-disabled outline-none transition-colors',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          heights[size],
        )}
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 rounded p-0.5 text-subtle transition-colors hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        hint && <div className="pointer-events-none absolute right-2.5">{hint}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Select */

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 items-center justify-between gap-2 rounded-lg border border-border bg-surface-inset px-3',
      'text-[12.5px] text-foreground outline-none transition-colors',
      'hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20',
      'data-[placeholder]:text-subtle',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-subtle" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        'z-50 max-h-72 min-w-[9rem] overflow-hidden rounded-[12px] border border-border bg-surface-overlay p-1',
        'shadow-[var(--shadow-lg)] data-[state=open]:animate-[fade-up_0.16s_cubic-bezier(0.22,1,0.36,1)]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-2.5 pr-8 text-[12.5px] text-muted outline-none',
      'data-[highlighted]:bg-surface-raised data-[highlighted]:text-foreground data-[state=checked]:text-foreground',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-2.5">
      <Check className="h-3.5 w-3.5 text-primary" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

/* ------------------------------------------------------------------ Switch */

export const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border border-transparent',
      'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-inset data-[state=unchecked]:border-border',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-[14px] w-[14px] rounded-full bg-white shadow-sm ring-0 transition-transform',
        'data-[state=checked]:translate-x-[19px] data-[state=unchecked]:translate-x-[3px]',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

/* ---------------------------------------------------------------- Checkbox */

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-strong bg-surface-inset',
      'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check className="h-3 w-3 text-white" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

/* ------------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] text-danger">{error}</span>
      ) : (
        hint && <span className="text-[11px] text-subtle">{hint}</span>
      )}
    </label>
  );
}

/** Label + control row, used throughout Settings and Administration. */
export function SettingRow({
  title,
  description,
  control,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-6 py-3.5', className)}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-subtle">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
