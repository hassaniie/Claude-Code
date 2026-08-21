/**
 * Admin — Tenant Management (§9).
 *
 * A management workspace over every tenant: search, building/floor/status
 * filters, sort, and two views — a dense table for operations and a card view
 * for scanning. Quick actions (open, view portal, lifecycle) live on each row.
 */

import { Building2, LayoutGrid, Rows3, Store, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, StatGrid, Toolbar } from '../../components/ui/page';
import { Card, CardBody } from '../../components/ui/card';
import { PageHeader, StatCard } from '../../components/common';
import { Button, ProgressBar, TenantMark } from '../../components/ui/primitives';
import { SearchInput, SimpleSelect } from '../../components/ui/form';
import { Segmented } from '../../components/ui/tabs';
import { DataTable, type Column } from '../../components/ui/data';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../../components/ui/overlay';
import { TenantStatusBadge, AlertLevelBadge } from '../../components/status';
import { adminApi } from '../../data/api';
import { simulation } from '../../data/live';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useSession } from '../../store/session';
import { area, num } from '../../lib/utils';
import type { AlertLevel, TenantStatus, TenantSummary } from '../../data/types';
import { MoreHorizontal } from 'lucide-react';

const STATUS_OPTIONS: Array<{ value: TenantStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending_activation', label: 'Pending Activation' },
  { value: 'pending_configuration', label: 'Pending Configuration' },
  { value: 'draft', label: 'Draft' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'archived', label: 'Archived' },
];

function energyLevel(s: TenantSummary): AlertLevel {
  if (s.offlineMeters > 0) return 'offline';
  if (s.activeAlerts > 1) return 'critical';
  if (s.activeAlerts > 0) return 'warning';
  if (s.meterCount === 0) return 'attention';
  return 'normal';
}

export default function Tenants() {
  const navigate = useNavigate();
  const { prefs } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TenantStatus | 'all'>('all');
  const [buildingId, setBuildingId] = useState('all');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const debounced = useDebounced(search);

  const buildings = useAsync(() => adminApi.listBuildings(), { deps: [] });
  const tenants = useAsync(
    () => adminApi.listTenants({ search: debounced, status, buildingId: buildingId === 'all' ? undefined : buildingId }),
    { deps: [debounced, status, buildingId], refreshMs: 8000 },
  );

  const rows = tenants.data ?? [];
  const counts = useMemo(() => {
    const all = rows;
    return {
      total: all.length,
      active: all.filter((r) => r.tenant.status === 'active').length,
      pending: all.filter((r) => ['pending_activation', 'pending_configuration', 'draft'].includes(r.tenant.status)).length,
      suspended: all.filter((r) => r.tenant.status === 'suspended').length,
    };
  }, [rows]);

  const buildingOptions = [
    { value: 'all', label: 'All buildings' },
    ...(buildings.data ?? []).map((b) => ({ value: b.id, label: b.name })),
  ];

  const columns: Column<TenantSummary>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <TenantMark name={r.tenant.name} hue={r.tenant.brandHue} size={32} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{r.tenant.name}</p>
            <p className="tnum truncate text-[11px] text-subtle">{r.tenant.code}</p>
          </div>
        </div>
      ),
      sortValue: (r) => r.tenant.name,
    },
    { key: 'building', header: 'Location', cell: (r) => <span>{r.buildingName}<span className="text-subtle"> · {r.floorNames.join(', ')}</span></span>, sortValue: (r) => r.buildingName, hideBelow: 'lg' },
    { key: 'offices', header: 'Offices', align: 'right', cell: (r) => <span className="tnum">{r.officeCount}</span>, sortValue: (r) => r.officeCount, hideBelow: 'md' },
    { key: 'area', header: 'Area', align: 'right', cell: (r) => <span className="tnum">{area(r.totalAreaSqft, prefs.areaUnit)}</span>, sortValue: (r) => r.totalAreaSqft, hideBelow: 'md' },
    { key: 'meters', header: 'Sub-meters', align: 'right', cell: (r) => <span className="tnum">{r.meterCount}</span>, sortValue: (r) => r.meterCount, hideBelow: 'xl' },
    { key: 'status', header: 'Status', cell: (r) => <TenantStatusBadge status={r.tenant.status} size="sm" />, sortValue: (r) => r.tenant.status },
    { key: 'energy', header: 'Energy', cell: (r) => <AlertLevelBadge level={energyLevel(r)} size="sm" />, hideBelow: 'lg' },
    { key: 'open', header: 'Open', align: 'right', cell: (r) => (r.openRequests ? <span className="tnum font-medium text-foreground">{r.openRequests}</span> : <span className="text-subtle">—</span>), sortValue: (r) => r.openRequests, hideBelow: 'xl' },
    {
      key: 'actions',
      header: '',
      width: '44px',
      cell: (r) => <RowActions summary={r} onOpen={() => navigate(`/admin/tenants/${r.tenant.id}`)} />,
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Tenants"
        description="Every organization across the NASTP park."
        actions={<Button variant="primary" size="sm" onClick={() => navigate('/admin/tenants/new')}><UserPlus className="h-4 w-4" />Add Tenant</Button>}
      />

      <StatGrid cols={4}>
        <StatCard label="Total" value={num(counts.total)} icon={Building2} tone="primary" />
        <StatCard label="Active" value={num(counts.active)} icon={Building2} tone="success" />
        <StatCard label="Pending" value={num(counts.pending)} icon={Building2} tone="warning" />
        <StatCard label="Suspended" value={num(counts.suspended)} icon={Building2} tone="critical" />
      </StatGrid>

      <Card>
        <div className="border-b border-border-subtle p-3.5">
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search tenants by name or code…" className="w-full sm:w-[300px]" />
            <SimpleSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-[190px]" />
            <SimpleSelect value={buildingId} onChange={setBuildingId} options={buildingOptions} className="w-[170px]" />
            <div className="flex-1" />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'table', label: 'Table', icon: <Rows3 className="h-3.5 w-3.5" /> },
                { value: 'cards', label: 'Cards', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
              ]}
            />
          </Toolbar>
        </div>

        {view === 'table' ? (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.tenant.id}
            onRowClick={(r) => navigate(`/admin/tenants/${r.tenant.id}`)}
            loading={tenants.status === 'loading'}
            error={tenants.status === 'error' ? tenants.error : undefined}
            onRetry={tenants.refetch}
            emptyTitle="No tenants match"
            emptyDescription="Try clearing filters or search terms."
            emptyIcon={<Building2 className="h-5 w-5" />}
            pageSize={12}
          />
        ) : (
          <CardBody>
            {tenants.status === 'loading' ? (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[168px] animate-pulse rounded-2xl bg-surface-raised" />)}
              </div>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-subtle">No tenants match your filters.</p>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => <TenantCard key={r.tenant.id} summary={r} onOpen={() => navigate(`/admin/tenants/${r.tenant.id}`)} areaUnit={prefs.areaUnit} />)}
              </div>
            )}
          </CardBody>
        )}
      </Card>
    </Page>
  );
}

function RowActions({ summary, onOpen }: { summary: TenantSummary; onOpen: () => void }) {
  const { enterPortal } = useSession();
  const navigate = useNavigate();
  const { toast } = useSession();
  const t = summary.tenant;
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Tenant actions" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </MenuTrigger>
      <MenuContent onClick={(e) => e.stopPropagation()}>
        <MenuItem onSelect={onOpen}><Building2 className="h-4 w-4" />Open workspace</MenuItem>
        {t.status === 'active' && (
          <MenuItem onSelect={() => { enterPortal(t.id); navigate('/portal'); }}><Store className="h-4 w-4" />View portal</MenuItem>
        )}
        <MenuSeparator />
        {t.status === 'active' ? (
          <MenuItem destructive onSelect={() => { simulation.setTenantStatus(t.id, 'suspended'); toast({ title: 'Tenant suspended', description: `${t.name} portal access disabled.`, variant: 'warning' }); }}>Suspend tenant</MenuItem>
        ) : t.status === 'suspended' ? (
          <MenuItem onSelect={() => { simulation.setTenantStatus(t.id, 'active'); toast({ title: 'Tenant reactivated', description: `${t.name} portal access restored.`, variant: 'success' }); }}>Reactivate tenant</MenuItem>
        ) : t.status === 'pending_activation' ? (
          <MenuItem onSelect={() => { simulation.setTenantStatus(t.id, 'active'); toast({ title: 'Tenant activated', description: `${t.name} is now live.`, variant: 'success' }); }}>Activate tenant</MenuItem>
        ) : null}
      </MenuContent>
    </Menu>
  );
}

function TenantCard({ summary: r, onOpen, areaUnit }: { summary: TenantSummary; onOpen: () => void; areaUnit: 'sqft' | 'sqm' }) {
  const configPct = Math.round(r.tenant.configScore * 100);
  return (
    <button onClick={onOpen} className="edge-light group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TenantMark name={r.tenant.name} hue={r.tenant.brandHue} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">{r.tenant.name}</p>
            <p className="truncate text-[11.5px] text-subtle">{r.buildingName}</p>
          </div>
        </div>
        <TenantStatusBadge status={r.tenant.status} size="sm" />
      </div>

      {r.tenant.status === 'active' ? (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border-subtle bg-surface-inset/50 p-2.5">
          <MiniFact label="Offices" value={String(r.officeCount)} />
          <MiniFact label="Load" value={`${num(r.currentLoadKw)} kW`} />
          <MiniFact label="Open" value={String(r.openRequests)} />
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-subtle">Configuration</span>
            <span className="tnum font-medium text-foreground">{configPct}%</span>
          </div>
          <ProgressBar value={configPct} tone={configPct === 100 ? 'success' : 'warning'} className="mt-1.5" height={5} />
        </div>
      )}

      <div className="flex items-center justify-between text-[11.5px] text-subtle">
        <span>{area(r.totalAreaSqft, areaUnit)}</span>
        <AlertLevelBadge level={energyLevel(r)} size="sm" />
      </div>
    </button>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="tnum text-[14px] font-semibold text-foreground">{value}</p>
      <p className="text-[9.5px] uppercase tracking-[0.08em] text-subtle">{label}</p>
    </div>
  );
}
