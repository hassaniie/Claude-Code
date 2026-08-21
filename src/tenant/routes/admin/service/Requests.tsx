/**
 * Admin — Service Requests (§30). The table view of the service management
 * workspace: filters across category, priority, status, tenant and overdue,
 * operational metrics, and the request detail drawer.
 */

import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, StatGrid, Toolbar } from '../../../components/ui/page';
import { Card } from '../../../components/ui/card';
import { PageHeader, StatCard } from '../../../components/common';
import { SearchInput, SimpleSelect } from '../../../components/ui/form';
import { DataTable, type Column } from '../../../components/ui/data';
import { PriorityBadge, ServiceStatusBadge, CATEGORY_ICON } from '../../../components/status';
import { ServiceRequestDrawer } from '../../serviceShared';
import { SERVICE_CATEGORY_LABEL } from '../../../data/catalog';
import { useLive } from '../../../data/live';
import { NOW } from '../../../data/world';
import { ago, duration, num } from '../../../lib/utils';
import type { ServicePriority, ServiceRequest, ServiceStatus } from '../../../data/types';

const STATUS_OPTS: Array<{ value: ServiceStatus | 'open' | 'all'; label: string }> = [
  { value: 'open', label: 'Open' }, { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' }, { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'assigned', label: 'Assigned' }, { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_tenant', label: 'Waiting for Tenant' }, { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTS = [{ value: 'all', label: 'All priorities' }, { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];
const CATEGORY_OPTS = [{ value: 'all', label: 'All categories' }, ...Object.entries(SERVICE_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))];

export default function Requests() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ServiceStatus | 'open' | 'all'>('open');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');

  const data = useLive((w) => ({
    tenants: w.tenants.filter((t) => t.status === 'active' || t.status === 'suspended'),
    requests: w.requests.map((r) => ({ ...r, tenantName: w.tenantById[r.tenantId]?.name ?? '—' })),
  }));

  const openId = params.get('open');
  const open = openId ? data.requests.find((r) => r.id === openId) ?? null : null;

  const isOpen = (s: ServiceStatus) => !['closed', 'confirmed', 'cancelled'].includes(s);
  const filtered = data.requests.filter((r) => {
    if (status === 'open') { if (!isOpen(r.status)) return false; }
    else if (status !== 'all' && r.status !== status) return false;
    if (priority !== 'all' && r.priority !== priority) return false;
    if (category !== 'all' && r.category !== category) return false;
    if (tenantFilter !== 'all' && r.tenantId !== tenantFilter) return false;
    const t = search.trim().toLowerCase();
    if (t && !(r.title.toLowerCase().includes(t) || r.reference.toLowerCase().includes(t))) return false;
    return true;
  });

  const openReqs = data.requests.filter((r) => isOpen(r.status));
  const resolvedTimes = data.requests.filter((r) => r.resolvedAt).map((r) => r.resolvedAt! - r.createdAt);
  const avgResolution = resolvedTimes.length ? resolvedTimes.reduce((s, x) => s + x, 0) / resolvedTimes.length : 0;

  const columns: Column<(typeof data.requests)[number]>[] = [
    { key: 'ref', header: 'Ref', cell: (r) => <span className="tnum text-subtle">{r.reference}</span>, sortValue: (r) => r.reference, hideBelow: 'md' },
    { key: 'title', header: 'Request', cell: (r) => { const Icon = CATEGORY_ICON[r.category]; return <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 shrink-0 text-service" /><div className="min-w-0"><p className="truncate font-medium text-foreground">{r.title}</p><p className="truncate text-[11px] text-subtle">{r.tenantName}</p></div></div>; }, sortValue: (r) => r.title },
    { key: 'priority', header: 'Priority', cell: (r) => <PriorityBadge priority={r.priority} size="sm" />, sortValue: (r) => ({ critical: 0, high: 1, medium: 2, low: 3 } as Record<ServicePriority, number>)[r.priority], hideBelow: 'sm' },
    { key: 'status', header: 'Status', cell: (r) => <ServiceStatusBadge status={r.status} size="sm" /> },
    { key: 'due', header: 'Due', cell: (r) => r.dueAt && r.dueAt < NOW && isOpen(r.status) ? <span className="text-critical">Overdue</span> : <span className="tnum text-subtle">{r.dueAt ? ago(r.dueAt) : '—'}</span>, hideBelow: 'lg' },
    { key: 'updated', header: 'Updated', cell: (r) => <span className="tnum text-subtle">{ago(r.updatedAt)}</span>, sortValue: (r) => r.updatedAt, hideBelow: 'xl' },
  ];

  return (
    <Page>
      <PageHeader title="Service Requests" description="Manage and resolve tenant service requests across the park." />

      <StatGrid cols={5}>
        <StatCard label="Open" value={num(openReqs.length)} icon={Wrench} tone="service" />
        <StatCard label="Critical" value={num(openReqs.filter((r) => r.priority === 'critical').length)} icon={Wrench} tone={openReqs.some((r) => r.priority === 'critical') ? 'critical' : 'success'} />
        <StatCard label="Overdue" value={num(openReqs.filter((r) => r.dueAt && r.dueAt < NOW).length)} icon={Wrench} tone={openReqs.some((r) => r.dueAt && r.dueAt < NOW) ? 'warning' : 'success'} />
        <StatCard label="Avg Resolution" value={avgResolution ? duration(avgResolution) : '—'} icon={Wrench} tone="neutral" />
        <StatCard label="Resolved Today" value={num(data.requests.filter((r) => r.resolvedAt && r.resolvedAt >= NOW - 86_400_000).length)} icon={Wrench} tone="success" />
      </StatGrid>

      <Card>
        <div className="border-b border-border-subtle p-3.5">
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search requests…" className="w-full sm:w-[240px]" />
            <SimpleSelect value={status} onChange={setStatus} options={STATUS_OPTS} className="w-[170px]" />
            <SimpleSelect value={priority} onChange={setPriority} options={PRIORITY_OPTS} className="w-[150px]" />
            <SimpleSelect value={category} onChange={setCategory} options={CATEGORY_OPTS} className="w-[160px]" />
            <SimpleSelect value={tenantFilter} onChange={setTenantFilter} options={[{ value: 'all', label: 'All tenants' }, ...data.tenants.map((t) => ({ value: t.id, label: t.name }))]} className="w-[170px]" />
          </Toolbar>
        </div>
        <DataTable rows={filtered} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setParams({ open: r.id })} selectedKey={openId ?? undefined} emptyTitle="No requests match" pageSize={14} />
      </Card>

      <ServiceRequestDrawer request={open as ServiceRequest | null} open={Boolean(open)} onOpenChange={(o) => !o && setParams({})} mode="admin" tenantName={open ? (open as { tenantName?: string }).tenantName : undefined} />
    </Page>
  );
}
