/**
 * Tenant Portal — Energy Consumption (§17). Consumption over time with flexible
 * date ranges, a peak/off-peak breakdown, and a table view for accessibility.
 */

import { Zap } from 'lucide-react';
import { useState } from 'react';
import { StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { StatCard } from '../../../components/common';
import { IconBox } from '../../../components/ui/primitives';
import { TrendChart, BarSeriesChart } from '../../../components/charts';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import { RangeControl, sliceReadings, sumField, type RangeKey } from '../../energyShared';
import { num } from '../../../lib/utils';

export default function PortalEnergyConsumption() {
  const { tenantId } = useSession();
  const [range, setRange] = useState<RangeKey>('last30');
  const bundle = useLive((w) => w.readings[tenantId] ?? { hourly: [], daily: [], monthly: [] });
  const { data, granularity } = sliceReadings(bundle, range);

  const total = sumField(data, 'kwh');
  const peak = sumField(data, 'peakKwh');
  const off = sumField(data, 'offPeakKwh');
  const avg = data.length ? Math.round(total / data.length) : 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-muted">Metered consumption, {granularity} granularity</p>
        <RangeControl value={range} onChange={setRange} />
      </div>

      <StatGrid cols={4}>
        <StatCard label="Total Consumption" value={num(total)} unit="kWh" icon={Zap} tone="energy" />
        <StatCard label="Peak" value={num(peak)} unit="kWh" icon={Zap} tone="warning" caption={`${total ? Math.round((peak / total) * 100) : 0}% of total`} />
        <StatCard label="Off-Peak" value={num(off)} unit="kWh" icon={Zap} tone="primary" caption={`${total ? Math.round((off / total) * 100) : 0}% of total`} />
        <StatCard label={`Average / ${granularity}`} value={num(avg)} unit="kWh" icon={Zap} tone="neutral" />
      </StatGrid>

      <Card>
        <CardHeader title="Consumption breakdown" subtitle="Peak and off-peak, stacked" icon={<IconBox icon={Zap} tone="energy" size="sm" />} />
        <CardBody>
          <TrendChart data={data} series={[{ key: 'peakKwh', label: 'Peak (kWh)', color: 'var(--viz-2)' }, { key: 'offPeakKwh', label: 'Off-peak (kWh)', color: 'var(--viz-1)' }]} stacked height={260} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Usage per interval" subtitle="Total consumption" icon={<IconBox icon={Zap} tone="energy" size="sm" />} />
        <CardBody>
          <BarSeriesChart data={data} series={[{ key: 'kwh', label: 'kWh' }]} height={220} valueFormatter={(v) => `${num(v)} kWh`} />
        </CardBody>
      </Card>
    </>
  );
}
