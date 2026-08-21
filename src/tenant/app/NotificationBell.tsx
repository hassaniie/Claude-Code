import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ago } from '../lib/utils';
import { simulation, useLive } from '../data/live';
import type { AppNotification } from '../data/types';
import { Button, IconBox } from '../components/ui/primitives';
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from '../components/ui/overlay';
import { EmptyState } from '../components/ui/data';
import { MODULE_ICON, MODULE_TONE } from '../components/status';
import { cn } from '../lib/utils';

export function NotificationBell({ tenantId }: { tenantId?: string }) {
  const navigate = useNavigate();
  const notifications = useLive((w) =>
    w.notifications.filter((n) => (tenantId ? n.tenantId === tenantId : true)),
  );
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <Tooltip content={`${unread} unread notification${unread === 1 ? '' : 's'}`}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="tnum absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Notifications</p>
            <p className="text-[11px] text-subtle">{unread} unread</p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => simulation.markAllNotificationsRead(tenantId)}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <EmptyState title="You're all caught up" description="No notifications right now." className="py-10" icon={<Bell className="h-5 w-5" />} />
          ) : (
            <ul className="p-1.5">
              {notifications.slice(0, 20).map((n) => (
                <NotificationRow key={n.id} notification={n} onOpen={() => { simulation.markNotificationRead(n.id); if (n.href) navigate(n.href); }} />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ notification: n, onOpen }: { notification: AppNotification; onOpen: () => void }) {
  const Icon = MODULE_ICON[n.domain];
  return (
    <li>
      <button onClick={onOpen} className={cn('flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-surface-raised', !n.read && 'bg-primary-muted/25')}>
        <IconBox icon={Icon} tone={MODULE_TONE[n.domain]} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[12.5px] font-medium text-foreground">{n.title}</p>
            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted">{n.body}</p>
          <p className="mt-1 text-[10.5px] text-subtle">{ago(n.ts)}</p>
        </div>
      </button>
    </li>
  );
}
