/**
 * Tenant Portal — Energy Overview (§17). Answers the tenant's core questions:
 * current consumption, load and demand; period usage and charges; how it
 * compares. Date ranges drive the charts. No raw electrical metrics here —
 * those live under Energy Details.
 */

import { Bell, Gauge, TrendingUp, Wallet, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { StatCard } from '../../../components/common';
import { IconBox } from '../../../components/ui/primitives';
import { TrendChart, DonutChart } from '../../../components/charts';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import { tenantPortalSnapshot } from '../../../data/selectors';
import { RangeControl, sliceReadings, sumField, type RangeKey } from '../../energyShared';
import { currency, energy, num } from '../../../lib/utils';

export default function PortalEnergyOverview() {
  const { tenantId } = useSession();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>('last30');
  const snap = useLive((w) => tenantPortalSnapshot(w, tenantId));
  const bundle = useLive((w) => w.readings[tenantId] ?? { hourly: [], daily: [], monthly: [] });
  const { data } = sliceReadings(bundle, range);

  const peak = sumField(data, 'peakKwh');
  const off = sumField(data, 'offPeakKwh');

  return (
    <>
      <StatGrid cols={4}>
        <StatCard label="Current Load" value={energy(snap.currentLoadKw, 'kW').value} unit={energy(snap.currentLoadKw, 'kW').unit} icon={Zap} tone="energy" spark={bundle.daily.slice(-14).map((d) => d.kwh)} sparkColor="var(--module-energy)" />
        <StatCard label="Current Demand" value={num(snap.currentDemandKw, 1)} unit="kW" icon={Gauge} tone="energy" caption={`Peak ${num(snap.peakDemandKw)} kW`} />
        <StatCard label="Period Usage" value={energy(snap.periodKwh).value} unit={energy(snap.periodKwh).unit} icon={TrendingUp} tone="primary" caption="This billing period" />
        <StatCard label="Period Charges" value={currency(snap.periodCharges, { compact: true })} icon={Wallet} tone="primary" onClick={() => navigate('/portal/energy/billing')} />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader
            title="Consumption over time"
            subtitle="Your metered usage"
            icon={<IconBox icon={Zap} tone="energy" size="sm" />}
            actions={<RangeControl value={range} onChange={setRange} />}
          />
          <CardBody>
            <TrendChart data={data} series={[{ key: 'kwh', label: 'Consumption (kWh)' }]} height={240} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} />
          </CardBody>
        </Card>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Peak vs Off-Peak" subtitle="For the selected range" icon={<IconBox icon={TrendingUp} tone="energy" size="sm" />} />
            <CardBody>
              <DonutChart height={180} centreValue={`${peak + off ? Math.round((peak / (peak + off)) * 100) : 0}%`} centreLabel="peak" data={[{ label: 'Peak', value: peak, color: 'var(--viz-2)' }, { label: 'Off-peak', value: off, color: 'var(--viz-1)' }]} />
            </CardBody>
          </Card>
          <div className="grid grid-cols-2 gap-3.5">
            <StatCard label="Active Meters" value={`${snap.activeMeters}/${snap.totalMeters}`} icon={Gauge} tone={snap.activeMeters < snap.totalMeters ? 'warning' : 'success'} />
            <StatCard label="Alerts" value={num(snap.activeAlerts)} icon={Bell} tone={snap.activeAlerts ? 'warning' : 'success'} onClick={() => navigate('/portal/energy/alerts')} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader title="Demand over time" subtitle="Maximum demand per interval" icon={<IconBox icon={Gauge} tone="energy" size="sm" />} />
        <CardBody>
          <TrendChart data={data} series={[{ key: 'demandKw', label: 'Demand (kW)' }]} height={200} unit="kW" fill={false} valueFormatter={(v) => `${num(v, 1)} kW`} />
        </CardBody>
      </Card>
    </>
  );
}
