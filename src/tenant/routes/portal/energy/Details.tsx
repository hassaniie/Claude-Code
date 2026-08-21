/**
 * Tenant Portal — Energy Details (§17). Progressive disclosure: information is
 * layered into Summary → Consumption → Demand & Load → Electrical Parameters →
 * Historical, so the advanced electrical metrics never crowd the overview.
 */

import { Activity, Gauge, Layers, Table2, Zap } from 'lucide-react';
import { useState } from 'react';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { StatGrid } from '../../../components/ui/page';
import { StatCard } from '../../../components/common';
import { IconBox } from '../../../components/ui/primitives';
import { Segmented } from '../../../components/ui/tabs';
import { TrendChart } from '../../../components/charts';
import { DefList, DataTable, type Column } from '../../../components/ui/data';
import { MeterStatusBadge } from '../../../components/status';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import { tenantPortalSnapshot } from '../../../data/selectors';
import { energy, num } from '../../../lib/utils';
import type { Meter, MeterReading } from '../../../data/types';

type Section = 'summary' | 'consumption' | 'demand' | 'electrical' | 'historical';

export default function PortalEnergyDetails() {
  const { tenantId } = useSession();
  const [section, setSection] = useState<Section>('summary');
  const snap = useLive((w) => tenantPortalSnapshot(w, tenantId));
  const bundle = useLive((w) => w.readings[tenantId] ?? { hourly: [], daily: [], monthly: [] });
  const meters = useLive((w) => w.meters.filter((m) => m.tenantId === tenantId));

  return (
    <>
      <div className="overflow-x-auto">
        <Segmented
          value={section}
          onChange={setSection}
          options={[
            { value: 'summary', label: 'Summary', icon: <Layers className="h-3.5 w-3.5" /> },
            { value: 'consumption', label: 'Consumption', icon: <Zap className="h-3.5 w-3.5" /> },
            { value: 'demand', label: 'Demand & Load', icon: <Gauge className="h-3.5 w-3.5" /> },
            { value: 'electrical', label: 'Electrical', icon: <Activity className="h-3.5 w-3.5" /> },
            { value: 'historical', label: 'Historical', icon: <Table2 className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      {section === 'summary' && (
        <StatGrid cols={4}>
          <StatCard label="Current Load" value={energy(snap.currentLoadKw, 'kW').value} unit={energy(snap.currentLoadKw, 'kW').unit} icon={Zap} tone="energy" />
          <StatCard label="Period Usage" value={energy(snap.periodKwh).value} unit={energy(snap.periodKwh).unit} icon={Zap} tone="primary" />
          <StatCard label="Peak Demand" value={num(snap.peakDemandKw, 1)} unit="kW" icon={Gauge} tone="warning" />
          <StatCard label="Meters" value={`${snap.activeMeters}/${snap.totalMeters}`} icon={Gauge} tone="success" />
        </StatGrid>
      )}

      {section === 'consumption' && (
        <Card>
          <CardHeader title="Consumption" subtitle="Last 30 days" icon={<IconBox icon={Zap} tone="energy" size="sm" />} />
          <CardBody><TrendChart data={bundle.daily} series={[{ key: 'kwh', label: 'kWh' }]} height={280} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} /></CardBody>
        </Card>
      )}

      {section === 'demand' && (
        <Card>
          <CardHeader title="Demand & Load" subtitle="Last 30 days" icon={<IconBox icon={Gauge} tone="energy" size="sm" />} />
          <CardBody><TrendChart data={bundle.daily} series={[{ key: 'demandKw', label: 'Demand (kW)' }]} height={280} unit="kW" fill={false} valueFormatter={(v) => `${num(v, 1)} kW`} /></CardBody>
        </Card>
      )}

      {section === 'electrical' && (
        <div className="flex flex-col gap-4">
          {meters.length === 0 ? (
            <Card><CardBody><p className="py-6 text-center text-[12.5px] text-subtle">No sub-meters configured.</p></CardBody></Card>
          ) : meters.map((m) => <ElectricalCard key={m.id} meter={m} />)}
        </div>
      )}

      {section === 'historical' && <Historical monthly={bundle.monthly} />}
    </>
  );
}

function ElectricalCard({ meter: m }: { meter: Meter }) {
  return (
    <Card>
      <CardHeader title={m.name} subtitle={`Serial ${m.serial}`} icon={<IconBox icon={Activity} tone="energy" size="sm" />} actions={<MeterStatusBadge status={m.status} size="sm" />} />
      <CardBody>
        <DefList columns={3} items={[
          { label: 'Active power', value: `${num(m.live.powerKw, 1)} kW` },
          { label: 'Apparent power', value: `${num(m.live.apparentKva, 1)} kVA` },
          { label: 'Reactive power', value: `${num(m.live.reactiveKvar, 1)} kVAr` },
          { label: 'Voltage', value: `${num(m.live.voltage, 1)} V` },
          { label: 'Current', value: `${num(m.live.current, 1)} A` },
          { label: 'Power factor', value: m.live.powerFactor.toFixed(3) },
          { label: 'Frequency', value: `${m.live.frequency.toFixed(2)} Hz` },
          { label: 'Max demand', value: `${num(m.live.maxDemandKw, 1)} kW` },
          { label: 'Cumulative import', value: `${num(m.totalKwh)} kWh` },
        ]} />
      </CardBody>
    </Card>
  );
}

function Historical({ monthly }: { monthly: MeterReading[] }) {
  const columns: Column<MeterReading>[] = [
    { key: 'label', header: 'Month', cell: (r) => <span className="font-medium text-foreground">{r.label}</span> },
    { key: 'kwh', header: 'Consumption', align: 'right', cell: (r) => <span className="tnum">{num(r.kwh)} kWh</span>, sortValue: (r) => r.kwh },
    { key: 'peak', header: 'Peak', align: 'right', cell: (r) => <span className="tnum">{num(r.peakKwh)} kWh</span>, hideBelow: 'sm' },
    { key: 'off', header: 'Off-peak', align: 'right', cell: (r) => <span className="tnum">{num(r.offPeakKwh)} kWh</span>, hideBelow: 'md' },
    { key: 'demand', header: 'Max demand', align: 'right', cell: (r) => <span className="tnum">{num(r.demandKw, 1)} kW</span> },
    { key: 'pf', header: 'Avg PF', align: 'right', cell: (r) => <span className="tnum">{r.powerFactor.toFixed(2)}</span>, hideBelow: 'lg' },
  ];
  return (
    <Card>
      <CardHeader title="Historical Data" subtitle="Monthly, last 12 months" icon={<IconBox icon={Table2} tone="primary" size="sm" />} />
      <DataTable rows={[...monthly].reverse()} columns={columns} rowKey={(r) => String(r.ts)} />
    </Card>
  );
}
