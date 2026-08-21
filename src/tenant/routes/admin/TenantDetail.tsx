/**
 * Admin — Tenant Detail Workspace (§10).
 *
 * Not a static profile: a comprehensive operational workspace for one tenant.
 * A rich entity header with lifecycle actions, then tabs across Overview,
 * Spaces, Energy, Visitors, Service, Users, Configuration and a unified
 * Activity timeline. Every tab reads the tenant-scoped slice of the world.
 */

import {
  Activity as ActivityIcon, ArrowLeft, Building2, Gauge, Mail, Phone, Store, UserRound, Wrench, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Breadcrumb, KeyValue, MetricValue, Timeline } from '../../components/common';
import { Button, IconBox, ProgressBar, Separator, StatusBadge, TenantMark } from '../../components/ui/primitives';
import { TabBar } from '../../components/ui/tabs';
import { DataTable, DefList, LoadingState, ErrorState, type Column } from '../../components/ui/data';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../../components/ui/overlay';
import { TrendChart } from '../../components/charts';
import {
  TenantStatusBadge, MeterStatusBadge, PriorityBadge, ServiceStatusBadge, VisitorStatusBadge, AlertLevelBadge,
} from '../../components/status';
import { adminApi } from '../../data/api';
import { simulation, useLive } from '../../data/live';
import { alertLevelForTenant } from '../../data/selectors';
import { useAsync } from '../../hooks/useAsync';
import { useSession } from '../../store/session';
import { ACTIVITY_ICON } from '../../lib/activityMeta';
import { ORG_TYPE_LABEL } from '../../data/catalog';
import { USER_ROLE } from '../../lib/meta';
import { ago, area, currency, energy, fmtDate, fmtDateFull, fmtTime, num } from '../../lib/utils';
import type {
  Meter, OfficeSpace, ServiceRequest, TenantStatus, TenantUser, Visitor,
} from '../../data/types';
import { ChevronDown } from 'lucide-react';

type Tab = 'overview' | 'spaces' | 'energy' | 'visitors' | 'service' | 'users' | 'configuration' | 'activity';

export default function TenantDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { prefs } = useSession();
  const [tab, setTab] = useState<Tab>('overview');

  const tenant = useAsync(() => adminApi.getTenant(id), { deps: [id] });
  const summary = useAsync(() => adminApi.getTenantSummary(id), { deps: [id], refreshMs: 8000 });
  const offices = useAsync(() => adminApi.listOffices(id), { deps: [id] });
  const meters = useAsync(() => adminApi.listMeters({ tenantId: id }), { deps: [id], refreshMs: 6000 });
  const users = useAsync(() => adminApi.listUsers(id), { deps: [id] });
  const requests = useAsync(() => adminApi.listRequests({ tenantId: id }), { deps: [id] });
  const visitors = useAsync(() => adminApi.listVisitors({ tenantId: id }), { deps: [id] });
  const activity = useAsync(() => adminApi.listActivity({ tenantId: id, limit: 40 }), { deps: [id] });
  const readings = useAsync(() => adminApi.getReadings(id, 'daily'), { deps: [id] });

  if (tenant.status === 'loading' || summary.status === 'loading') {
    return <Page><LoadingState label="Loading tenant workspace…" /></Page>;
  }
  if (tenant.status === 'error' || !tenant.data || !summary.data) {
    return <Page><ErrorState message={tenant.error ?? 'Tenant not found'} onRetry={tenant.refetch} /></Page>;
  }

  const t = tenant.data;
  const s = summary.data;

  const openReqs = (requests.data ?? []).filter((r) => !['closed', 'confirmed', 'cancelled'].includes(r.status));
  const activeVisitors = (visitors.data ?? []).filter((v) => v.status === 'in_building' || v.status === 'overstaying');

  const tabs: Array<{ value: Tab; label: string; count?: number }> = [
    { value: 'overview', label: 'Overview' },
    { value: 'spaces', label: 'Spaces', count: s.officeCount },
    { value: 'energy', label: 'Energy', count: s.meterCount },
    { value: 'visitors', label: 'Visitors', count: activeVisitors.length || undefined },
    { value: 'service', label: 'Service Center', count: openReqs.length || undefined },
    { value: 'users', label: 'Users', count: (users.data ?? []).length },
    { value: 'configuration', label: 'Configuration' },
    { value: 'activity', label: 'Activity' },
  ];

  return (
    <Page>
      <Breadcrumb items={[{ label: 'Tenants', to: '/admin/tenants' }, { label: t.name }]} />

      {/* Entity header */}
      <Card>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <TenantMark name={t.name} hue={t.brandHue} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">{t.name}</h1>
                <TenantStatusBadge status={t.status} />
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted">{t.legalName} · {ORG_TYPE_LABEL[t.organizationType]}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-subtle">
                <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{s.buildingName} · {s.floorNames.join(', ')}</span>
                <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{t.primaryContact.name}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}><ArrowLeft className="h-4 w-4" />Back</Button>
            {t.status === 'active' && <TenantPortalButton tenantId={t.id} />}
            <LifecycleMenu status={t.status} tenantId={t.id} name={t.name} />
          </div>
        </div>
        <div className="px-3">
          <TabBar value={tab} onChange={setTab} tabs={tabs} />
        </div>
      </Card>

      {tab === 'overview' && (
        <Overview
          summary={s}
          areaUnit={prefs.areaUnit}
          readings={readings.data ?? []}
          activity={activity.data ?? []}
          openReqs={openReqs}
          activeVisitors={activeVisitors}
          tenantId={t.id}
        />
      )}
      {tab === 'spaces' && <Spaces offices={offices.data ?? []} meters={meters.data ?? []} loading={offices.status === 'loading'} areaUnit={prefs.areaUnit} totalArea={s.totalAreaSqft} />}
      {tab === 'energy' && <Energy meters={meters.data ?? []} readings={readings.data ?? []} loading={meters.status === 'loading'} summary={s} tenantId={t.id} />}
      {tab === 'visitors' && <Visitors visitors={visitors.data ?? []} loading={visitors.status === 'loading'} />}
      {tab === 'service' && <ServiceTab requests={requests.data ?? []} loading={requests.status === 'loading'} />}
      {tab === 'users' && <Users users={users.data ?? []} loading={users.status === 'loading'} />}
      {tab === 'configuration' && <Configuration tenant={t} meters={meters.data ?? []} />}
      {tab === 'activity' && (
        <Card><CardHeader title="Activity" subtitle="Unified chronological timeline" /><CardBody>
          {(activity.data ?? []).length === 0 ? <p className="py-6 text-center text-[12.5px] text-subtle">No activity recorded.</p> : (
            <Timeline items={(activity.data ?? []).map((a) => ({ id: a.id, icon: ACTIVITY_ICON[a.kind], tone: a.domain === 'energy' ? 'energy' : a.domain === 'visitor' ? 'visitor' : a.domain === 'service' ? 'service' : 'primary', title: a.title, detail: `${a.detail} · ${a.actor}`, meta: ago(a.ts) }))} />
          )}
        </CardBody></Card>
      )}
    </Page>
  );
}

function TenantPortalButton({ tenantId }: { tenantId: string }) {
  const { enterPortal } = useSession();
  const navigate = useNavigate();
  return <Button variant="secondary" size="sm" onClick={() => { enterPortal(tenantId); navigate('/portal'); }}><Store className="h-4 w-4" />View portal</Button>;
}

function LifecycleMenu({ status, tenantId, name }: { status: TenantStatus; tenantId: string; name: string }) {
  const { toast } = useSession();
  const act = (next: TenantStatus, msg: string, variant: 'success' | 'warning') => {
    simulation.setTenantStatus(tenantId, next);
    toast({ title: msg, description: `${name} is now ${next.replace('_', ' ')}.`, variant });
  };
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="primary" size="sm">Actions<ChevronDown className="h-3.5 w-3.5" /></Button>
      </MenuTrigger>
      <MenuContent>
        {status === 'pending_activation' && <MenuItem onSelect={() => act('active', 'Tenant activated', 'success')}>Activate tenant</MenuItem>}
        {(status === 'draft' || status === 'pending_configuration') && <MenuItem onSelect={() => act('pending_activation', 'Marked ready', 'success')}>Mark ready to activate</MenuItem>}
        {status === 'active' && <MenuItem destructive onSelect={() => act('suspended', 'Tenant suspended', 'warning')}>Suspend tenant</MenuItem>}
        {status === 'suspended' && <MenuItem onSelect={() => act('active', 'Tenant reactivated', 'success')}>Reactivate tenant</MenuItem>}
        {status === 'expired' && <MenuItem onSelect={() => act('active', 'Contract renewed', 'success')}>Renew & reactivate</MenuItem>}
        <MenuSeparator />
        {status !== 'archived' && <MenuItem destructive onSelect={() => act('archived', 'Tenant archived', 'warning')}>Archive tenant</MenuItem>}
      </MenuContent>
    </Menu>
  );
}

/* ------------------------------------------------------------- Overview */

function Overview({ summary: s, areaUnit, readings, activity, openReqs, activeVisitors, tenantId }: { summary: import('../../data/types').TenantSummary; areaUnit: 'sqft' | 'sqm'; readings: import('../../data/types').MeterReading[]; activity: import('../../data/types').ActivityEvent[]; openReqs: ServiceRequest[]; activeVisitors: Visitor[]; tenantId: string }) {
  const level = useLive((w) => alertLevelForTenant(w, tenantId));
  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Energy snapshot" subtitle="Current billing period" icon={<IconBox icon={Zap} tone="energy" size="sm" />} actions={<AlertLevelBadge level={level} size="sm" />} />
          <CardBody className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Current load" value={energy(s.currentLoadKw, 'kW').value} unit={energy(s.currentLoadKw, 'kW').unit} />
            <Stat label="Period usage" value={energy(s.periodKwh).value} unit={energy(s.periodKwh).unit} />
            <Stat label="Period charges" value={currency(s.periodCharges, { symbol: false, compact: true })} unit="PKR" />
            <Stat label="Sub-meters" value={String(s.meterCount)} unit={s.offlineMeters ? `${s.offlineMeters} offline` : 'all online'} />
            <div className="col-span-full">
              <TrendChart data={readings} series={[{ key: 'kwh', label: 'kWh' }]} height={160} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader title="Open service requests" subtitle={`${openReqs.length} open`} icon={<IconBox icon={Wrench} tone="service" size="sm" />} />
            <CardBody className="flex flex-col gap-2">
              {openReqs.length === 0 ? <p className="py-4 text-center text-[12px] text-subtle">No open requests.</p> : openReqs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[12.5px] text-muted">{r.title}</span>
                  <PriorityBadge priority={r.priority} size="sm" />
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Visitors inside" subtitle={`${activeVisitors.length} present`} icon={<IconBox icon={UserRound} tone="visitor" size="sm" />} />
            <CardBody className="flex flex-col gap-2">
              {activeVisitors.length === 0 ? <p className="py-4 text-center text-[12px] text-subtle">No visitors inside.</p> : activeVisitors.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[12.5px] text-muted">{v.fullName}</span>
                  <VisitorStatusBadge status={v.status} size="sm" />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Summary" />
          <CardBody>
            <DefList columns={2} items={[
              { label: 'Building', value: s.buildingName },
              { label: 'Floors', value: s.floorNames.join(', ') },
              { label: 'Offices', value: String(s.officeCount) },
              { label: 'Total area', value: area(s.totalAreaSqft, areaUnit) },
              { label: 'Open requests', value: String(s.openRequests) },
              { label: 'Active alerts', value: String(s.activeAlerts) },
            ]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <CardBody>
            <Timeline items={activity.slice(0, 6).map((a) => ({ id: a.id, icon: ACTIVITY_ICON[a.kind], tone: a.domain === 'energy' ? 'energy' : a.domain === 'visitor' ? 'visitor' : a.domain === 'service' ? 'service' : 'primary', title: a.title, detail: a.detail, meta: ago(a.ts) }))} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-subtle">{label}</p>
      <div className="mt-1.5"><MetricValue value={value} unit={unit} size="md" /></div>
    </div>
  );
}

/* --------------------------------------------------------------- Spaces */

function Spaces({ offices, meters, loading, areaUnit, totalArea }: { offices: OfficeSpace[]; meters: Meter[]; loading: boolean; areaUnit: 'sqft' | 'sqm'; totalArea: number }) {
  const meterFor = (id: string | null) => meters.find((m) => m.id === id);
  const columns: Column<OfficeSpace>[] = [
    { key: 'code', header: 'Office', cell: (o) => <span className="font-medium text-foreground">{o.code}</span>, sortValue: (o) => o.code },
    { key: 'label', header: 'Label', cell: (o) => o.label, hideBelow: 'sm' },
    { key: 'area', header: 'Area', align: 'right', cell: (o) => <span className="tnum">{area(o.areaSqft, areaUnit)}</span>, sortValue: (o) => o.areaSqft },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge tone={o.status === 'occupied' ? 'success' : 'neutral'} size="sm">{o.status}</StatusBadge> },
    { key: 'meter', header: 'Sub-meter', cell: (o) => { const m = meterFor(o.meterId); return m ? <span className="tnum text-muted">{m.serial}</span> : <span className="text-subtle">Not wired</span>; } },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Spaces" subtitle={`${offices.length} offices · ${area(totalArea, areaUnit)} total`} icon={<IconBox icon={Building2} tone="primary" size="sm" />} />
        <DataTable rows={offices} columns={columns} rowKey={(o) => o.id} loading={loading} emptyTitle="No offices assigned" />
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------- Energy */

function Energy({ meters, readings, loading, summary: s, tenantId }: { meters: Meter[]; readings: import('../../data/types').MeterReading[]; loading: boolean; summary: import('../../data/types').TenantSummary; tenantId: string }) {
  const live = useLive((w) => w.meters.filter((m) => m.tenantId === tenantId));
  const rows = live.length ? live : meters;
  const columns: Column<Meter>[] = [
    { key: 'serial', header: 'Serial', cell: (m) => <span className="tnum font-medium text-foreground">{m.serial}</span>, sortValue: (m) => m.serial },
    { key: 'name', header: 'Name', cell: (m) => m.name, hideBelow: 'md' },
    { key: 'load', header: 'Load', align: 'right', cell: (m) => <span className="tnum">{num(m.live.powerKw, 1)} kW</span>, sortValue: (m) => m.live.powerKw },
    { key: 'pf', header: 'PF', align: 'right', cell: (m) => <span className="tnum">{m.live.powerFactor.toFixed(2)}</span>, hideBelow: 'lg' },
    { key: 'total', header: 'Total kWh', align: 'right', cell: (m) => <span className="tnum">{num(m.totalKwh)}</span>, sortValue: (m) => m.totalKwh, hideBelow: 'xl' },
    { key: 'status', header: 'Status', cell: (m) => <MeterStatusBadge status={m.status} size="sm" /> },
  ];
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Consumption" subtitle="Daily, last 30 days" icon={<IconBox icon={Zap} tone="energy" size="sm" />} actions={<span className="tnum text-[12px] text-muted">{currency(s.periodCharges, { compact: true })} this period</span>} />
        <CardBody><TrendChart data={readings} series={[{ key: 'kwh', label: 'kWh' }, { key: 'peakKwh', label: 'Peak kWh' }]} height={200} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} /></CardBody>
      </Card>
      <Card>
        <CardHeader title="Sub-meters" subtitle="Tenant metering infrastructure" icon={<IconBox icon={Gauge} tone="energy" size="sm" />} />
        <DataTable rows={rows} columns={columns} rowKey={(m) => m.id} loading={loading} emptyTitle="No sub-meters" emptyDescription="This tenant has no metering configured yet." />
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- Visitors */

function Visitors({ visitors, loading }: { visitors: Visitor[]; loading: boolean }) {
  const columns: Column<Visitor>[] = [
    { key: 'name', header: 'Visitor', cell: (v) => <div><p className="font-medium text-foreground">{v.fullName}</p><p className="text-[11px] text-subtle">{v.company}</p></div>, sortValue: (v) => v.fullName },
    { key: 'purpose', header: 'Purpose', cell: (v) => v.purpose, hideBelow: 'md' },
    { key: 'arrival', header: 'Expected', cell: (v) => <span className="tnum">{fmtDate(v.visitDate)} · {fmtTime(v.expectedArrival)}</span>, sortValue: (v) => v.expectedArrival, hideBelow: 'sm' },
    { key: 'status', header: 'Status', cell: (v) => <VisitorStatusBadge status={v.status} size="sm" /> },
  ];
  return (
    <Card>
      <CardHeader title="Visitors" subtitle={`${visitors.length} records`} icon={<IconBox icon={UserRound} tone="visitor" size="sm" />} />
      <DataTable rows={visitors} columns={columns} rowKey={(v) => v.id} loading={loading} emptyTitle="No visitors" pageSize={10} />
    </Card>
  );
}

/* -------------------------------------------------------------- Service */

function ServiceTab({ requests, loading }: { requests: ServiceRequest[]; loading: boolean }) {
  const columns: Column<ServiceRequest>[] = [
    { key: 'ref', header: 'Ref', cell: (r) => <span className="tnum text-subtle">{r.reference}</span>, sortValue: (r) => r.reference, hideBelow: 'sm' },
    { key: 'title', header: 'Title', cell: (r) => <span className="font-medium text-foreground">{r.title}</span>, sortValue: (r) => r.title },
    { key: 'priority', header: 'Priority', cell: (r) => <PriorityBadge priority={r.priority} size="sm" />, hideBelow: 'md' },
    { key: 'status', header: 'Status', cell: (r) => <ServiceStatusBadge status={r.status} size="sm" /> },
    { key: 'updated', header: 'Updated', cell: (r) => <span className="tnum text-subtle">{ago(r.updatedAt)}</span>, sortValue: (r) => r.updatedAt, hideBelow: 'lg' },
  ];
  return (
    <Card>
      <CardHeader title="Service Center" subtitle={`${requests.length} requests`} icon={<IconBox icon={Wrench} tone="service" size="sm" />} />
      <DataTable rows={requests} columns={columns} rowKey={(r) => r.id} loading={loading} emptyTitle="No service requests" pageSize={10} />
    </Card>
  );
}

/* ---------------------------------------------------------------- Users */

function Users({ users, loading }: { users: TenantUser[]; loading: boolean }) {
  const columns: Column<TenantUser>[] = [
    { key: 'name', header: 'User', cell: (u) => <div><p className="font-medium text-foreground">{u.name}</p><p className="text-[11px] text-subtle">{u.email}</p></div>, sortValue: (u) => u.name },
    { key: 'role', header: 'Role', cell: (u) => <StatusBadge tone={u.role === 'primary' ? 'primary' : 'neutral'} size="sm" dot={false}>{USER_ROLE[u.role]}</StatusBadge>, sortValue: (u) => u.role },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge tone={u.status === 'active' ? 'success' : u.status === 'invited' ? 'info' : 'neutral'} size="sm">{u.status}</StatusBadge> },
    { key: 'last', header: 'Last active', cell: (u) => <span className="text-subtle">{u.lastActiveAt ? ago(u.lastActiveAt) : '—'}</span>, hideBelow: 'md' },
  ];
  return (
    <Card>
      <CardHeader title="Portal Users" subtitle={`${users.length} users`} icon={<IconBox icon={UserRound} tone="primary" size="sm" />} />
      <DataTable rows={users} columns={columns} rowKey={(u) => u.id} loading={loading} emptyTitle="No portal users" emptyDescription="Configure a primary user to enable portal access." />
    </Card>
  );
}

/* ----------------------------------------------------- Configuration */

function Configuration({ tenant, meters }: { tenant: import('../../data/types').Tenant; meters: Meter[] }) {
  const pct = Math.round(tenant.configScore * 100);
  const c = tenant.primaryContact;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Organization" icon={<IconBox icon={Building2} tone="primary" size="sm" />} />
        <CardBody>
          <DefList columns={2} items={[
            { label: 'Legal name', value: tenant.legalName, span: true },
            { label: 'Type', value: ORG_TYPE_LABEL[tenant.organizationType] },
            { label: 'Registration', value: tenant.registrationNo ?? '—' },
            { label: 'NTN / Tax ID', value: tenant.ntn ?? '—' },
            { label: 'Code', value: tenant.code },
            { label: 'Contract start', value: tenant.contractStart ? fmtDateFull(tenant.contractStart) : '—' },
            { label: 'Contract end', value: tenant.contractEnd ? fmtDateFull(tenant.contractEnd) : '—' },
          ]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Primary contact" icon={<IconBox icon={UserRound} tone="primary" size="sm" />} />
        <CardBody className="flex flex-col gap-1">
          <KeyValue label="Name" value={c.name} />
          <KeyValue label="Designation" value={c.designation} />
          <KeyValue label={<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>} value={c.email} />
          <KeyValue label={<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />Phone</span>} value={c.phone} mono />
          <Separator className="my-2" />
          <div>
            <div className="flex items-center justify-between text-[11.5px]"><span className="text-subtle">Configuration completeness</span><span className="tnum font-medium text-foreground">{pct}%</span></div>
            <ProgressBar value={pct} tone={pct === 100 ? 'success' : 'warning'} className="mt-1.5" />
          </div>
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Applicable rates & metering" subtitle="Rates are globally configured; metering is tenant-specific" icon={<IconBox icon={ActivityIcon} tone="energy" size="sm" />} />
        <CardBody>
          <DefList columns={3} items={[
            { label: 'Sub-meters', value: `${meters.length} configured` },
            { label: 'Offline', value: String(meters.filter((m) => m.status === 'offline').length) },
            { label: 'Rate schedule', value: 'FY26 Standard' },
          ]} />
        </CardBody>
      </Card>
    </div>
  );
}
