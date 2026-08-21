/**
 * Admin — Energy Overview (§13). Park-wide energy intelligence. Every chart
 * answers a specific operational question: how much are we drawing, when does
 * peak fall, who consumes most, and what is offline.
 */

import { Gauge, TrendingUp, Wallet, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page, StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { PageHeader, StatCard } from '../../../components/common';
import { Button, IconBox } from '../../../components/ui/primitives';
import { MeterStatusBadge } from '../../../components/status';
import { TrendChart, BarSeriesChart, DonutChart } from '../../../components/charts';
import { useLive } from '../../../data/live';
import { computeAdminKpis, aggregateReadings, tenantSummary } from '../../../data/selectors';
import { currency, energy, num } from '../../../lib/utils';

export default function EnergyOverview() {
  const navigate = useNavigate();
  const kpis = useLive(computeAdminKpis);
  const daily = useLive((w) => aggregateReadings(w, 'daily'));
  const monthly = useLive((w) => aggregateReadings(w, 'monthly'));
  const ranking = useLive((w) => w.tenants.filter((t) => t.status === 'active').map((t) => tenantSummary(w, t.id)).sort((a, b) => b.periodKwh - a.periodKwh).slice(0, 8));
  const offlineMeters = useLive((w) => w.meters.filter((m) => m.status === 'offline'));

  const monthPeak = monthly.reduce((s, m) => s + m.peakKwh, 0);
  const monthOff = monthly.reduce((s, m) => s + m.offPeakKwh, 0);

  return (
    <Page>
      <PageHeader title="Energy Overview" description="Consumption, demand and charges across the NASTP park." actions={<Button variant="secondary" size="sm" onClick={() => navigate('/admin/energy/meters')}><Gauge className="h-4 w-4" />Meters</Button>} />

      <StatGrid cols={4}>
        <StatCard label="Month Consumption" value={energy(kpis.totalConsumptionKwh).value} unit={energy(kpis.totalConsumptionKwh).unit} icon={Zap} tone="energy" caption="All active tenants" />
        <StatCard label="Current Load" value={energy(kpis.currentLoadKw, 'kW').value} unit={energy(kpis.currentLoadKw, 'kW').unit} icon={TrendingUp} tone="energy" spark={daily.slice(-14).map((d) => d.kwh)} sparkColor="var(--module-energy)" />
        <StatCard label="Peak Demand" value={num(kpis.peakDemandKw)} unit="kW" icon={Gauge} tone="warning" />
        <StatCard label="Month Charges" value={currency(kpis.totalChargesMonth, { compact: true })} icon={Wallet} tone="primary" onClick={() => navigate('/admin/energy/billing')} />
      </StatGrid>

      <StatGrid cols={4}>
        <StatCard label="Active Meters" value={num(kpis.metersTotal - kpis.offlineMeters)} icon={Gauge} tone="success" caption={`${kpis.metersTotal} total`} />
        <StatCard label="Offline Meters" value={num(kpis.offlineMeters)} icon={Gauge} tone={kpis.offlineMeters ? 'critical' : 'success'} onClick={() => navigate('/admin/energy/meters')} />
        <StatCard label="High Consumption" value={num(kpis.highConsumptionAlerts)} icon={Zap} tone={kpis.highConsumptionAlerts ? 'warning' : 'success'} caption="Active alerts" onClick={() => navigate('/admin/energy/alerts')} />
        <StatCard label="Peak Share" value={monthPeak + monthOff ? Math.round((monthPeak / (monthPeak + monthOff)) * 100) : 0} unit="%" icon={TrendingUp} tone="neutral" caption="of total consumption" />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader title="Consumption Trend" subtitle="Park-wide, last 30 days" icon={<IconBox icon={Zap} tone="energy" size="sm" />} />
          <CardBody>
            <TrendChart data={daily} series={[{ key: 'kwh', label: 'Consumption (kWh)' }, { key: 'peakKwh', label: 'Peak (kWh)' }]} height={240} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Peak vs Off-Peak" subtitle="Last 12 months" icon={<IconBox icon={TrendingUp} tone="energy" size="sm" />} />
          <CardBody>
            <DonutChart
              height={200}
              centreValue={`${Math.round((monthPeak / (monthPeak + monthOff || 1)) * 100)}%`}
              centreLabel="peak"
              data={[{ label: 'Peak', value: Math.round(monthPeak), color: 'var(--viz-2)' }, { label: 'Off-peak', value: Math.round(monthOff), color: 'var(--viz-1)' }]}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Highest Consuming Tenants" subtitle="This billing period" icon={<IconBox icon={TrendingUp} tone="primary" size="sm" />} actions={<Button variant="ghost" size="xs" onClick={() => navigate('/admin/energy/consumption')}>Details</Button>} />
          <CardBody>
            <BarSeriesChart data={ranking.map((r) => ({ label: r.tenant.code, kwh: r.periodKwh }))} series={[{ key: 'kwh', label: 'kWh' }]} horizontal height={260} valueFormatter={(v) => `${num(v)} kWh`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Offline Meters" subtitle={`${offlineMeters.length} not reporting`} icon={<IconBox icon={Gauge} tone={offlineMeters.length ? 'critical' : 'success'} size="sm" />} />
          <CardBody className="flex flex-col gap-2">
            {offlineMeters.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-subtle">Every meter is reporting.</p>
            ) : (
              offlineMeters.map((m) => (
                <button key={m.id} onClick={() => navigate('/admin/energy/meters')} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-left transition-colors hover:border-border-strong">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">{m.name}</p>
                    <p className="tnum truncate text-[11px] text-subtle">{m.serial}</p>
                  </div>
                  <MeterStatusBadge status={m.status} size="sm" />
                </button>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
