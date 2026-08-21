/**
 * Tenant Portal — Demand & Load (§17). Current and maximum demand, the demand
 * trend over the selected range, and the daily load curve.
 */

import { Gauge } from 'lucide-react';
import { useState } from 'react';
import { StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { StatCard } from '../../../components/common';
import { IconBox } from '../../../components/ui/primitives';
import { TrendChart } from '../../../components/charts';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import { tenantPortalSnapshot } from '../../../data/selectors';
import { RangeControl, sliceReadings, type RangeKey } from '../../energyShared';
import { num } from '../../../lib/utils';

export default function PortalEnergyDemand() {
  const { tenantId } = useSession();
  const [range, setRange] = useState<RangeKey>('last7');
  const snap = useLive((w) => tenantPortalSnapshot(w, tenantId));
  const bundle = useLive((w) => w.readings[tenantId] ?? { hourly: [], daily: [], monthly: [] });
  const { data } = sliceReadings(bundle, range);
  const maxInRange = data.reduce((m, d) => Math.max(m, d.demandKw), 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-muted">Demand reflects the peak load sustained over each interval.</p>
        <RangeControl value={range} onChange={setRange} />
      </div>

      <StatGrid cols={3}>
        <StatCard label="Current Demand" value={num(snap.currentDemandKw, 1)} unit="kW" icon={Gauge} tone="energy" />
        <StatCard label="Max in Range" value={num(maxInRange, 1)} unit="kW" icon={Gauge} tone="warning" />
        <StatCard label="Peak Demand (all time)" value={num(snap.peakDemandKw, 1)} unit="kW" icon={Gauge} tone="critical" caption="Sanctioned load reference" />
      </StatGrid>

      <Card>
        <CardHeader title="Demand over time" subtitle="Maximum demand per interval" icon={<IconBox icon={Gauge} tone="energy" size="sm" />} />
        <CardBody>
          <TrendChart data={data} series={[{ key: 'demandKw', label: 'Demand (kW)' }]} height={260} unit="kW" valueFormatter={(v) => `${num(v, 1)} kW`} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Load curve" subtitle="Consumption by hour, last 24 hours" icon={<IconBox icon={Gauge} tone="energy" size="sm" />} />
        <CardBody>
          <TrendChart data={bundle.hourly} series={[{ key: 'kwh', label: 'Load (kW)' }]} height={220} unit="kW" valueFormatter={(v) => `${num(v, 1)} kW`} />
        </CardBody>
      </Card>
    </>
  );
}
