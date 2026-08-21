/**
 * Admin — Service Board (§30). A Kanban across the workflow states, for
 * managing flow at a glance. Cards carry priority and tenant; clicking one opens
 * the request drawer to act on it.
 */

import { useSearchParams } from 'react-router-dom';
import { PageFull } from '../../../components/ui/page';
import { PageHeader } from '../../../components/common';
import { PriorityBadge, CATEGORY_ICON } from '../../../components/status';
import { ServiceRequestDrawer } from '../../serviceShared';
import { SERVICE_BOARD, SERVICE_STATUS } from '../../../lib/meta';
import { useLive } from '../../../data/live';
import { NOW } from '../../../data/world';
import { ago } from '../../../lib/utils';
import { cn } from '../../../lib/utils';
import type { ServiceRequest, ServiceStatus } from '../../../data/types';

export default function Board() {
  const [params, setParams] = useSearchParams();
  const requests = useLive((w) => w.requests.map((r) => ({ ...r, tenantName: w.tenantById[r.tenantId]?.name ?? '—' })));
  const openId = params.get('open');
  const open = openId ? requests.find((r) => r.id === openId) ?? null : null;

  const byStatus = (s: ServiceStatus) => requests.filter((r) => r.status === s);

  return (
    <PageFull>
      <PageHeader title="Service Board" description="Workflow across every open request." />
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max gap-3.5 pb-2">
          {SERVICE_BOARD.map((status) => {
            const items = byStatus(status);
            return (
              <div key={status} className="flex w-[290px] flex-col rounded-2xl border border-border bg-surface/60">
                <div className="flex items-center justify-between border-b border-border-subtle px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', TONE_BG[SERVICE_STATUS[status].tone])} />
                    <span className="text-[12.5px] font-semibold text-foreground">{SERVICE_STATUS[status].label}</span>
                  </div>
                  <span className="tnum rounded-full bg-surface-inset px-1.5 text-[11px] text-subtle">{items.length}</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                  {items.length === 0 ? (
                    <p className="py-6 text-center text-[11.5px] text-subtle">Empty</p>
                  ) : (
                    items.map((r) => {
                      const Icon = CATEGORY_ICON[r.category];
                      const overdue = r.dueAt && r.dueAt < NOW;
                      return (
                        <button key={r.id} onClick={() => setParams({ open: r.id })} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface p-3 text-left transition-all hover:border-border-strong hover:shadow-[var(--shadow-sm)]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-service" />
                              <span className="tnum text-[10.5px] text-subtle">{r.reference}</span>
                            </div>
                            <PriorityBadge priority={r.priority} size="sm" />
                          </div>
                          <p className="line-clamp-2 text-[12.5px] font-medium text-foreground">{r.title}</p>
                          <div className="flex items-center justify-between text-[10.5px] text-subtle">
                            <span className="truncate">{r.tenantName}</span>
                            <span className={cn('tnum', overdue && 'text-critical')}>{overdue ? 'overdue' : ago(r.updatedAt)}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ServiceRequestDrawer request={open as ServiceRequest | null} open={Boolean(open)} onOpenChange={(o) => !o && setParams({})} mode="admin" tenantName={open ? (open as { tenantName?: string }).tenantName : undefined} />
    </PageFull>
  );
}

const TONE_BG: Record<string, string> = {
  info: 'bg-info', primary: 'bg-primary', warning: 'bg-warning', success: 'bg-success', critical: 'bg-critical', neutral: 'bg-neutral', service: 'bg-service',
};
