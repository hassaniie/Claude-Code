/**
 * Live activity feed and vehicle timeline.
 *
 * The feed is the operator's peripheral vision — it must be scannable at a
 * glance and must never steal focus. New rows animate in once; nothing below
 * them moves position, and the list is capped so it can't grow without bound.
 */

import {
  ArrowDownLeft, ArrowUpRight, Ban, BadgeCheck, CircleAlert, CreditCard, LockOpen,
  Lock, Siren, UserPlus, Video, VideoOff, Wrench, type LucideIcon,
} from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { ago, cn, currency, fmtTime } from '../../lib/utils';
import type { ActivityEvent, EventType } from '../../data/types';
import { Segmented } from '../ui/tabs';
import { EmptyState } from '../ui/data';
import { PlateTag } from './atoms';

const ICON: Record<EventType, LucideIcon> = {
  vehicle_entered: ArrowDownLeft,
  vehicle_exited: ArrowUpRight,
  visitor_registered: UserPlus,
  payment_completed: CreditCard,
  barrier_opened: LockOpen,
  barrier_closed: Lock,
  camera_offline: VideoOff,
  camera_restored: Video,
  recognition_failed: CircleAlert,
  floor_full: Ban,
  space_occupied: BadgeCheck,
  space_released: BadgeCheck,
  emergency_mode: Siren,
  operator_action: Wrench,
};

const TONE: Record<EventType, string> = {
  vehicle_entered: 'text-info bg-info-dim',
  vehicle_exited: 'text-muted bg-surface-raised',
  visitor_registered: 'text-viz-6 bg-surface-raised',
  payment_completed: 'text-success bg-success-dim',
  barrier_opened: 'text-success bg-success-dim',
  barrier_closed: 'text-muted bg-surface-raised',
  camera_offline: 'text-danger bg-danger-dim',
  camera_restored: 'text-success bg-success-dim',
  recognition_failed: 'text-warning bg-warning-dim',
  floor_full: 'text-danger bg-danger-dim',
  space_occupied: 'text-occupied bg-occupied-dim',
  space_released: 'text-vacant bg-vacant-dim',
  emergency_mode: 'text-danger bg-danger-dim',
  operator_action: 'text-primary bg-primary-muted',
};

export type FeedFilter = 'all' | 'traffic' | 'faults' | 'finance';

const GROUPS: Record<FeedFilter, EventType[] | null> = {
  all: null,
  traffic: ['vehicle_entered', 'vehicle_exited', 'barrier_opened', 'barrier_closed', 'space_occupied', 'space_released'],
  faults: ['camera_offline', 'camera_restored', 'recognition_failed', 'floor_full', 'emergency_mode'],
  finance: ['payment_completed', 'visitor_registered'],
};

export const ActivityRow = memo(function ActivityRow({
  event,
  onSelect,
}: {
  event: ActivityEvent;
  onSelect?: (event: ActivityEvent) => void;
}) {
  const Icon = ICON[event.type];
  return (
    <li
      className={cn(
        'group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors',
        onSelect && 'cursor-pointer hover:bg-surface-raised',
      )}
      onClick={onSelect ? () => onSelect(event) : undefined}
    >
      <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE[event.type])}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[12px] font-medium text-foreground">{event.title}</p>
          <span className="tnum shrink-0 text-[10px] text-subtle" title={fmtTime(event.ts)}>
            {ago(event.ts)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-subtle">{event.detail}</p>
        {(event.plate || event.amount) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {event.plate && <PlateTag plate={event.plate} size="xs" />}
            {event.amount !== undefined && (
              <span className="tnum text-[10.5px] font-medium text-success">{currency(event.amount)}</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
});

export function ActivityFeed({
  events,
  onSelect,
  className,
  showFilter = true,
  limit = 40,
  emptyLabel = 'No activity in this window',
}: {
  events: ActivityEvent[];
  onSelect?: (event: ActivityEvent) => void;
  className?: string;
  showFilter?: boolean;
  limit?: number;
  emptyLabel?: string;
}) {
  const [filter, setFilter] = useState<FeedFilter>('all');

  const visible = useMemo(() => {
    const group = GROUPS[filter];
    const list = group ? events.filter((e) => group.includes(e.type)) : events;
    return list.slice(0, limit);
  }, [events, filter, limit]);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {showFilter && (
        <div className="shrink-0 px-3 pb-2">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'traffic', label: 'Traffic' },
              { value: 'faults', label: 'Faults' },
              { value: 'finance', label: 'Finance' },
            ]}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState title={emptyLabel} description="Events appear here as the plaza reports them." />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {visible.map((e, i) => (
            <div key={e.id} className={i === 0 ? 'animate-[ticker_0.4s_cubic-bezier(0.22,1,0.36,1)]' : undefined}>
              <ActivityRow event={e} onSelect={onSelect} />
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Timeline */

export interface TimelineItem {
  id: string;
  title: string;
  detail?: string;
  ts: number;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: LucideIcon;
  meta?: string;
}

const DOT: Record<NonNullable<TimelineItem['tone']>, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral',
};

/** Vertical event trail — a vehicle's visit, or a device's fault history. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (!items.length) {
    return <EmptyState title="No timeline events" description="Nothing has been recorded for this record yet." />;
  }
  return (
    <ol className={cn('relative flex flex-col', className)}>
      <span className="absolute bottom-3 left-[11px] top-2 w-px bg-border" aria-hidden />
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.id} className="relative flex gap-3 py-2 pl-0">
            <span className="relative z-10 mt-1 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border border-border bg-surface">
              {Icon ? (
                <Icon className="h-3 w-3 text-muted" />
              ) : (
                <span className={cn('h-1.5 w-1.5 rounded-full', DOT[item.tone ?? 'neutral'])} />
              )}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[12px] font-medium text-foreground">{item.title}</p>
                <span className="tnum shrink-0 text-[10.5px] text-subtle">{fmtTime(item.ts)}</span>
              </div>
              {item.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-subtle">{item.detail}</p>}
              {item.meta && <p className="tnum mt-1 text-[10.5px] text-muted">{item.meta}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
