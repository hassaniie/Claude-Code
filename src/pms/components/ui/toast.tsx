import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSession, type Toast } from '../../store/session';

const ICONS = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
} as const;

const TONE: Record<Toast['variant'], string> = {
  default: 'text-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

const RAIL: Record<Toast['variant'], string> = {
  default: 'bg-neutral',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

/**
 * Bottom-right toast stack. Deliberately capped at four — an operator who has
 * to dismiss a wall of confirmations stops reading them.
 */
export function Toaster() {
  const { toasts, dismissToast } = useSession();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'glass pointer-events-auto relative flex gap-3 overflow-hidden rounded-xl px-3.5 py-3 shadow-[var(--shadow-lg)]',
              'animate-[slide-in_0.28s_cubic-bezier(0.22,1,0.36,1)]',
            )}
          >
            <span className={cn('absolute inset-y-0 left-0 w-[3px]', RAIL[t.variant])} />
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONE[t.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{t.description}</p>
              )}
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismissToast(t.id);
                  }}
                  className="mt-1.5 text-[11.5px] font-medium text-primary hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="h-fit rounded p-0.5 text-subtle transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
