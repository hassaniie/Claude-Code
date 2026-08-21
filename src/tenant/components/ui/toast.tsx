import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSession, type Toast } from '../../store/session';
import { Button } from './primitives';

const ICON = {
  default: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  critical: XCircle,
  info: Info,
} as const;

const TONE: Record<Toast['variant'], string> = {
  default: 'text-muted',
  success: 'text-success',
  warning: 'text-warning',
  critical: 'text-critical',
  info: 'text-info',
};

export function Toaster() {
  const { toasts, dismissToast } = useSession();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2.5">
      {toasts.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[14px] border border-border bg-surface-overlay p-3.5 shadow-[var(--shadow-lg)] animate-[slide-in_0.28s_cubic-bezier(0.22,1,0.36,1)]"
            role="status"
          >
            <Icon className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', TONE[t.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{t.description}</p>}
              {t.action && (
                <Button variant="subtle" size="xs" className="mt-2" onClick={() => { t.action!.onClick(); dismissToast(t.id); }}>
                  {t.action.label}
                </Button>
              )}
            </div>
            <button onClick={() => dismissToast(t.id)} className="rounded-md p-1 text-subtle transition-colors hover:bg-surface-raised hover:text-foreground" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
