/**
 * Admin — Ecosystem Operations Dashboard (§8).
 *
 * Not a generic KPI grid. Top: the global operational summary. Main-left:
 * energy intelligence. Main-right: an "Operational Attention" action center
 * that answers *what needs attention right now* — the highest-signal items
 * across energy, visitors and the service center, ranked by urgency. Lower:
 * live tenant operations. Reads the live world synchronously.
 */

import {
  AlarmClock, ArrowRight, Bell, Building2, DoorOpen, Gauge, TriangleAlert, UserPlus, Wrench, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page, StatGrid } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { StatCard, PageHeader, Timeline } from '../../components/common';
import { Button, IconBox, StatusBadge, TenantMark } from '../../components/ui/primitives';
import { TrendChart, BarSeriesChart } from '../../components/charts';
import { useLive } from '../../data/live';
import { computeAdminKpis, aggregateReadings, tenantSummary } from '../../data/selectors';
import { ago, compact, currency, energy, fmtTime, num } from '../../lib/utils';
import { ACTIVITY_ICON } from '../../lib/activityMeta';
import { CATEGORY_ICON } from '../../components/status';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const kpis = useLive(computeAdminKpis);
  const daily = useLive((w) => aggregateReadings(w, 'daily'));
  const ranking = useLive((w) => w.tenants.filter((t) => t.status === 'active').map((t) => tenantSummary(w, t.id)).sort((a, b) => b.periodKwh - a.periodKwh).slice(0, 6));
  const attention = useLive(buildAttention);
  const activity = useLive((w) => w.activity.slice(0, 8));
  const upcoming = useLive((w) => w.visitors.filter((v) => v.status === 'scheduled').sort((a, b) => a.expectedArrival - b.expectedArrival).slice(0, 5));
  const recentTenants = useLive((w) => [...w.tenants].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4).map((t) => tenantSummary(w, t.id)));

  const consumptionSpark = daily.slice(-14).map((d) => d.kwh);
  const chargeSpark = daily.slice(-14).map((d) => d.kwh * 45);

  return (
    <Page>
      <PageHeader
        title="Ecosystem Operations"
        description="Live command view across tenants, energy, visitors and the service center."
        actions={<Button variant="primary" size="sm" onClick={() => navigate('/admin/tenants/new')}><UserPlus className="h-4 w-4" />Add Tenant</Button>}
      />

      {/* TOP — global operational summary */}
      <StatGrid cols={4}>
        <StatCard label="Active Tenants" value={num(kpis.tenantsActive)} icon={Building2} tone="primary" caption={`${kpis.tenantsPending} pending · ${kpis.tenantsSuspended} suspended`} onClick={() => navigate('/admin/tenants')} />
        <StatCard label="Current Load" value={energy(kpis.currentLoadKw, 'kW').value} unit={energy(kpis.currentLoadKw, 'kW').unit} icon={Zap} tone="energy" spark={consumptionSpark} sparkColor="var(--module-energy)" caption={`Peak ${num(kpis.peakDemandKw)} kW`} onClick={() => navigate('/admin/energy')} />
        <StatCard label="Visitors Inside" value={num(kpis.visitorsInside)} icon={DoorOpen} tone="visitor" caption={`${kpis.visitorsScheduledToday} scheduled today`} onClick={() => navigate('/admin/visitors/inside')} />
        <StatCard label="Open Requests" value={num(kpis.requestsOpen)} icon={Wrench} tone="service" caption={`${kpis.requestsCritical} critical · ${kpis.requestsOverdue} overdue`} onClick={() => navigate('/admin/service')} />
      </StatGrid>

      <StatGrid cols={4}>
        <StatCard label="Month Consumption" value={energy(kpis.totalConsumptionKwh).value} unit={energy(kpis.totalConsumptionKwh).unit} icon={Gauge} tone="neutral" caption="All active tenants" />
        <StatCard label="Month Charges" value={currency(kpis.totalChargesMonth, { compact: true })} icon={Zap} tone="energy" spark={chargeSpark} sparkColor="var(--module-energy)" />
        <StatCard label="Overstaying" value={num(kpis.visitorsOverstaying)} icon={AlarmClock} tone={kpis.visitorsOverstaying ? 'critical' : 'success'} caption={kpis.visitorsOverstaying ? 'Needs attention' : 'None right now'} onClick={() => navigate('/admin/visitors/overstaying')} />
        <StatCard label="Offline Meters" value={num(kpis.offlineMeters)} icon={Gauge} tone={kpis.offlineMeters ? 'critical' : 'success'} caption={`${kpis.metersTotal} total`} onClick={() => navigate('/admin/energy/meters')} />
      </StatGrid>

      {/* MAIN — energy intelligence + operational attention */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Consumption & Peak Demand" subtitle="Park-wide, last 30 days" icon={<IconBox icon={Zap} tone="energy" size="sm" />} actions={<Button variant="ghost" size="xs" onClick={() => navigate('/admin/energy')}>Energy<ArrowRight className="h-3.5 w-3.5" /></Button>} />
            <CardBody>
              <TrendChart
                data={daily}
                series={[{ key: 'kwh', label: 'Consumption (kWh)' }]}
                unit="kWh"
                height={220}
                valueFormatter={(v) => `${num(v)} kWh`}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Highest Consuming Tenants" subtitle="This billing period" icon={<IconBox icon={Building2} tone="primary" size="sm" />} />
            <CardBody>
              <BarSeriesChart
                data={ranking.map((r) => ({ label: r.tenant.code, kwh: r.periodKwh }))}
                series={[{ key: 'kwh', label: 'kWh' }]}
                horizontal
                height={200}
                valueFormatter={(v) => `${num(v)} kWh`}
              />
            </CardBody>
          </Card>
        </div>

        {/* Operational attention — what needs attention right now */}
        <Card className="min-h-0">
          <CardHeader
            title="Operational Attention"
            subtitle={`${attention.length} item${attention.length === 1 ? '' : 's'} need review`}
            icon={<IconBox icon={TriangleAlert} tone={attention.length ? 'warning' : 'success'} size="sm" />}
          />
          <div className="flex-1 overflow-y-auto p-2.5">
            {attention.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <IconBox icon={Bell} tone="success" size="lg" />
                <p className="text-[13px] font-medium text-foreground">Nothing needs attention</p>
                <p className="text-[12px] text-subtle">All tenants nominal across every domain.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {attention.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => navigate(item.href)} className="flex w-full items-start gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-raised">
                      <IconBox icon={item.icon} tone={item.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-medium text-foreground">{item.title}</p>
                          <StatusBadge tone={item.tone} size="sm" dot={false}>{item.tag}</StatusBadge>
                        </div>
                        <p className="mt-0.5 truncate text-[11.5px] text-muted">{item.detail}</p>
                        <p className="mt-1 text-[10.5px] text-subtle">{item.tenant} · {ago(item.ts)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* LOWER — tenant operations */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Recent Activity" subtitle="Across all tenants" />
          <CardBody>
            <Timeline
              items={activity.map((a) => ({
                id: a.id,
                icon: ACTIVITY_ICON[a.kind] ?? Bell,
                tone: a.domain === 'energy' ? 'energy' : a.domain === 'visitor' ? 'visitor' : a.domain === 'service' ? 'service' : 'primary',
                title: a.title,
                detail: a.detail,
                meta: ago(a.ts),
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upcoming Visitors" subtitle="Next arrivals" icon={<IconBox icon={DoorOpen} tone="visitor" size="sm" />} actions={<Button variant="ghost" size="xs" onClick={() => navigate('/admin/visitors/scheduled')}>All</Button>} />
          <CardBody className="flex flex-col gap-1">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-subtle">No upcoming visitors.</p>
            ) : (
              upcoming.map((v) => (
                <VisitorRow key={v.id} name={v.fullName} company={v.company} time={fmtTime(v.expectedArrival)} />
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Onboarding" subtitle="Newest tenants" icon={<IconBox icon={Building2} tone="primary" size="sm" />} actions={<Button variant="ghost" size="xs" onClick={() => navigate('/admin/tenants')}>All</Button>} />
          <CardBody className="flex flex-col gap-2">
            {recentTenants.map((r) => (
              <button key={r.tenant.id} onClick={() => navigate(`/admin/tenants/${r.tenant.id}`)} className="flex items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-surface-raised">
                <TenantMark name={r.tenant.name} hue={r.tenant.brandHue} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-foreground">{r.tenant.name}</p>
                  <p className="truncate text-[11px] text-subtle">{r.buildingName} · {ago(r.tenant.createdAt)}</p>
                </div>
                <StatusBadge tone={{ active: 'success', suspended: 'critical', draft: 'neutral', pending_configuration: 'warning', pending_activation: 'info', expired: 'neutral', archived: 'neutral' }[r.tenant.status] as never} size="sm">
                  {r.tenant.status.replace('_', ' ')}
                </StatusBadge>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      <p className="pb-2 text-center text-[11px] text-subtle">
        Live values update every few seconds · {compact(kpis.metersTotal)} meters monitored across the park
      </p>
    </Page>
  );
}

function VisitorRow({ name, company, time }: { name: string; company?: string; time: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-foreground">{name}</p>
        {company && <p className="truncate text-[11px] text-subtle">{company}</p>}
      </div>
      <span className="tnum shrink-0 rounded-md bg-surface-inset px-2 py-1 text-[11px] font-medium text-muted">{time}</span>
    </div>
  );
}

/* --------------------------------------------------- attention builder */

interface AttentionItem {
  id: string;
  icon: typeof Zap;
  tone: 'critical' | 'warning' | 'energy' | 'visitor' | 'service';
  tag: string;
  title: string;
  detail: string;
  tenant: string;
  ts: number;
  href: string;
  rank: number;
}

function buildAttention(w: import('../../data/world').World): AttentionItem[] {
  const items: AttentionItem[] = [];
  const tenantName = (id: string) => w.tenantById[id]?.name ?? '—';

  for (const r of w.requests.filter((x) => x.priority === 'critical' && !['closed', 'confirmed', 'cancelled'].includes(x.status))) {
    items.push({ id: `req-${r.id}`, icon: CATEGORY_ICON[r.category], tone: 'critical', tag: 'Critical', title: r.title, detail: `${r.reference} · ${r.category.replace('_', ' ')}`, tenant: tenantName(r.tenantId), ts: r.updatedAt, href: `/admin/service?open=${r.id}`, rank: 0 });
  }
  for (const v of w.visitors.filter((x) => x.status === 'overstaying')) {
    items.push({ id: `vis-${v.id}`, icon: AlarmClock, tone: 'warning', tag: 'Overstay', title: `${v.fullName} overstaying`, detail: v.company ?? v.purpose, tenant: tenantName(v.tenantId), ts: v.expectedDeparture, href: '/admin/visitors/overstaying', rank: 1 });
  }
  for (const m of w.meters.filter((x) => x.status === 'offline' && x.tenantId)) {
    items.push({ id: `mtr-${m.id}`, icon: Gauge, tone: 'critical', tag: 'Offline', title: `${m.name} offline`, detail: `Serial ${m.serial}`, tenant: tenantName(m.tenantId!), ts: m.lastReadingAt, href: '/admin/energy/meters', rank: 0 });
  }
  for (const a of w.alerts.filter((x) => x.status === 'active' && (x.severity === 'warning' || x.severity === 'critical') && x.kind !== 'meter_offline')) {
    items.push({ id: `al-${a.id}`, icon: Zap, tone: 'energy', tag: a.severity === 'critical' ? 'Critical' : 'High', title: a.title, detail: a.description, tenant: tenantName(a.tenantId), ts: a.ts, href: '/admin/energy/alerts', rank: 2 });
  }
  return items.sort((a, b) => a.rank - b.rank || b.ts - a.ts).slice(0, 12);
}
