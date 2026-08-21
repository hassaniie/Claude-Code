/**
 * Tenant Portal — service request lists (My Requests, History), tenant-scoped,
 * each row opening the request drawer for timeline, comments and actions.
 */

import { Wrench } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { DataTable, type Column } from '../../../components/ui/data';
import { PriorityBadge, ServiceStatusBadge, CATEGORY_ICON } from '../../../components/status';
import { ServiceRequestDrawer } from '../../serviceShared';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import { ago } from '../../../lib/utils';
import type { ServiceRequest } from '../../../data/types';

export function PortalServiceList({ kind }: { kind: 'open' | 'history' }) {
  const { tenantId } = useSession();
  const [params, setParams] = useSearchParams();
  const isOpen = (s: string) => !['closed', 'confirmed', 'cancelled'].includes(s);
  const requests = useLive((w) => w.requests.filter((r) => r.tenantId === tenantId && (kind === 'open' ? isOpen(r.status) : !isOpen(r.status))));
  const openId = params.get('open');
  const open = openId ? requests.find((r) => r.id === openId) ?? null : null;

  const columns: Column<ServiceRequest>[] = [
    { key: 'ref', header: 'Ref', cell: (r) => <span className="tnum text-subtle">{r.reference}</span>, hideBelow: 'sm' },
    { key: 'title', header: 'Request', cell: (r) => { const Icon = CATEGORY_ICON[r.category]; return <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 shrink-0 text-service" /><span className="font-medium text-foreground">{r.title}</span></div>; }, sortValue: (r) => r.title },
    { key: 'priority', header: 'Priority', cell: (r) => <PriorityBadge priority={r.priority} size="sm" />, hideBelow: 'md' },
    { key: 'status', header: 'Status', cell: (r) => <ServiceStatusBadge status={r.status} size="sm" /> },
    { key: 'updated', header: 'Updated', cell: (r) => <span className="tnum text-subtle">{ago(r.updatedAt)}</span>, sortValue: (r) => r.updatedAt, hideBelow: 'lg' },
  ];

  return (
    <>
      <Card>
        <DataTable
          rows={requests}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => setParams({ open: r.id })}
          selectedKey={openId ?? undefined}
          emptyTitle={kind === 'open' ? 'No open requests' : 'No past requests'}
          emptyDescription={kind === 'open' ? 'Raise a request and it will appear here.' : 'Resolved and closed requests will appear here.'}
          emptyIcon={<Wrench className="h-5 w-5" />}
          pageSize={12}
        />
      </Card>
      <ServiceRequestDrawer request={open} open={Boolean(open)} onOpenChange={(o) => !o && setParams({})} mode="tenant" />
    </>
  );
}
