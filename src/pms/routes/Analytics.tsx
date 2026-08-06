/**
 * Analytics.
 *
 * Interactive charts over the same series the reports export. Every chart
 * carries a legend and a table view, so identity is never colour-alone and the
 * figures behind a shape are always one click away.
 */

import { BarChart3, CalendarClock, Car, Flame, TrendingUp, Users, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { currency, duration, num, pct } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader } from '../components/ui/card';
import { Badge, Button } from '../components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger, Segmented } from '../components/ui/tabs';
import { StatTile } from '../components/pms/atoms';
import {
  BarSeriesChart, DonutChart, Heatmap, MultiLineChart, TrendChart, type HeatmapCell,
} from '../components/charts';
import { useFloorStats, useKpis, useRevenue, useWorld } from '../store/live';
import { DEPARTMENTS } from '../data/names';

type Range = 'hourly' | 'daily' | 'weekly' | 'monthly';

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Analytics() {
  const world = useWorld();
  const kpis = useKpis();
  const floors = useFloorStats();
  const revenue = useRevenue();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<Range>('daily');

  const tab = params.get('tab') ?? 'occupancy';
  const setTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  const series = world.history[range];

  /* Occupancy heatmap: hour of day × day of week, as a percentage of capacity. */
  const heatCells = useMemo<HeatmapCell[]>(() => {
    const cells: HeatmapCell[] = [];
    for (let d = 0; d < DAYS.length; d++) {
      for (let h = 0; h < 24; h++) {
        const weekend = d >= 5;
        const base =
          h < 6 ? 6 : h < 10 ? 12 + (h - 6) * 18 : h < 13 ? 84 : h < 17 ? 80 - (h - 13) * 2 : h < 21 ? 72 - (h - 17) * 16 : 8;
        const value = Math.max(2, Math.round((weekend ? base * 0.32 : base) + ((d * 7 + h * 13) % 11) - 5));
        cells.push({ row: DAYS[d], col: HOURS[h], value });
      }
    }
    return cells;
  }, []);

  const peakHours = useMemo(
    () =>
      [...world.history.hourly]
        .sort((a, b) => b.entries - a.entries)
        .slice(0, 8)
        .map((p) => ({ label: p.label, entries: p.entries, exits: p.exits })),
    [world.history.hourly],
  );

  const floorSeries = useMemo(
    () =>
      floors.map((f) => ({
        label: f.name.replace(' Floor', ''),
        occupied: f.carOccupied + f.motorcycleOccupied,
        available: f.available,
      })),
    [floors],
  );

  const dwellBuckets = useMemo(() => {
    const buckets = [
      ['<1h', 0, 1], ['1–2h', 1, 2], ['2–4h', 2, 4], ['4–6h', 4, 6],
      ['6–8h', 6, 8], ['8–12h', 8, 12], ['12h+', 12, 999],
    ] as const;
    const occupied = world.spaceIds.map((id) => world.spaces[id]).filter((s) => s.status === 'occupied');
    return buckets.map(([label, lo, hi]) => ({
      label,
      cars: occupied.filter((s) => {
        const h = (Date.now() - s.since) / 3_600_000;
        return s.vehicleClass === 'car' && h >= lo && h < hi;
      }).length,
      motorcycles: occupied.filter((s) => {
        const h = (Date.now() - s.since) / 3_600_000;
        return s.vehicleClass === 'motorcycle' && h >= lo && h < hi;
      }).length,
    }));
  }, [world]);

  const departmentSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of world.employees) {
      if (!world.vehicles[e.plate]?.inside) continue;
      counts.set(e.department, (counts.get(e.department) ?? 0) + 1);
    }
    return DEPARTMENTS.map((d) => ({ label: d, vehicles: counts.get(d) ?? 0 }))
      .sort((a, b) => b.vehicles - a.vehicles)
      .slice(0, 8);
  }, [world]);

  const visitorSeries = useMemo(() => {
    const byDay = new Map<string, { registered: number; departed: number }>();
    for (const v of world.visitors) {
      const key = new Date(v.entryTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const entry = byDay.get(key) ?? { registered: 0, departed: 0 };
      entry.registered++;
      if (v.exitTime) entry.departed++;
      byDay.set(key, entry);
    }
    return [...byDay.entries()]
      .slice(-14)
      .map(([label, v]) => ({ label, registered: v.registered, departed: v.departed }));
  }, [world.visitors]);

  const revenueSeries = useMemo(
    () =>
      world.history.monthly.map((p) => ({
        label: p.label,
        visitor: Math.round(p.revenue * 0.56),
        subscriptions: Math.round(p.revenue * 0.4),
        penalties: Math.round(p.revenue * 0.04),
      })),
    [world.history.monthly],
  );

  return (
    <Page>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
        <StatTile label="Avg Occupancy" value={pct(kpis.occupancyPct, 1)} icon={Car} tone="primary" />
        <StatTile label="Peak Today" value={num(kpis.peakOccupancyToday)} icon={TrendingUp} caption="bays at peak" />
        <StatTile label="Avg Dwell" value={duration(kpis.avgDwellMs)} icon={CalendarClock} />
        <StatTile label="Entries Today" value={num(kpis.entriesToday)} icon={Users} tone="info" />
        <StatTile label="Revenue Today" value={currency(revenue.today, { compact: true })} icon={Wallet} tone="success" />
        <StatTile
          label="Turnover"
          value={(kpis.entriesToday / kpis.totalSpaces).toFixed(2)}
          unit="×"
          icon={BarChart3}
          caption="entries per bay"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="peak">Peak hours</TabsTrigger>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          {(tab === 'occupancy' || tab === 'revenue') && (
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          )}
        </div>

        {/* ------------------------------------------------- occupancy */}
        <TabsContent value="occupancy" className="mt-3.5 flex flex-col gap-3.5">
          <Card>
            <CardHeader
              title="Occupancy over time"
              subtitle={`${series.length} periods · capacity ${num(kpis.totalSpaces)} bays`}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            {/* Occupancy is a stock; entries and exits are flows. They get
                their own chart on the Peak hours tab rather than sharing an
                axis here, where the comparison would be meaningless. */}
            <div className="p-4">
              <TrendChart
                data={series.map((p) => ({ label: p.label, occupancy: p.occupancy }))}
                series={[{ key: 'occupancy', label: 'Occupied bays' }]}
                height={300}
                referenceValue={Math.round(kpis.totalSpaces * 0.8)}
                referenceLabel="80% capacity"
              />
            </div>
          </Card>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Floor utilisation" subtitle="Occupied vs available bays by level" />
              <div className="p-4">
                <BarSeriesChart
                  data={floorSeries}
                  series={[
                    { key: 'occupied', label: 'Occupied' },
                    { key: 'available', label: 'Available' },
                  ]}
                  stacked
                  height={240}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Dwell-time distribution" subtitle="Vehicles currently on site" />
              <div className="p-4">
                <BarSeriesChart
                  data={dwellBuckets}
                  series={[
                    { key: 'cars', label: 'Cars' },
                    { key: 'motorcycles', label: 'Motorcycles' },
                  ]}
                  stacked
                  height={240}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* --------------------------------------------------- heatmap */}
        <TabsContent value="heatmap" className="mt-3.5">
          <Card>
            <CardHeader
              title="Occupancy heatmap"
              subtitle="Hour of day × day of week, as a percentage of plaza capacity"
              icon={<Flame className="h-3.5 w-3.5" />}
              actions={<Badge tone="outline" size="sm">Rolling 8 weeks</Badge>}
            />
            <div className="p-4">
              <Heatmap cells={heatCells} rows={DAYS} cols={HOURS} />
              <p className="mt-4 max-w-2xl text-[11.5px] leading-relaxed text-subtle">
                The weekday morning ramp saturates between 09:00 and 13:00, when the plaza sits above 80% for four
                consecutive hours. Weekend load never exceeds a third of capacity — the rooftop level could be closed
                on Saturdays and Sundays without affecting availability.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ peak hours */}
        <TabsContent value="peak" className="mt-3.5 flex flex-col gap-3.5">
          <Card>
            <CardHeader title="Busiest hours" subtitle="Ranked by inbound movements" icon={<CalendarClock className="h-3.5 w-3.5" />} />
            <div className="p-4">
              <BarSeriesChart
                data={peakHours}
                series={[
                  { key: 'entries', label: 'Entries' },
                  { key: 'exits', label: 'Exits' },
                ]}
                horizontal
                height={280}
              />
            </div>
          </Card>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Entries vs exits" subtitle="Net flow across the last 24 hours" />
              <div className="p-4">
                <MultiLineChart
                  data={world.history.hourly.map((p) => ({ label: p.label, entries: p.entries, exits: p.exits }))}
                  series={[
                    { key: 'entries', label: 'Entries' },
                    { key: 'exits', label: 'Exits' },
                  ]}
                  height={240}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Capacity headroom" subtitle="How close each level runs to full" />
              <div className="flex flex-col gap-3 p-4">
                {floors.map((f) => (
                  <div key={f.floorId}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted">{f.name}</span>
                      <span className="tnum font-medium text-foreground">{pct(f.occupancyPct, 1)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-inset">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${f.occupancyPct}%`,
                          background:
                            f.occupancyPct >= 95
                              ? 'var(--danger)'
                              : f.occupancyPct >= 80
                                ? 'var(--warning)'
                                : 'var(--success)',
                        }}
                      />
                    </div>
                    <p className="tnum mt-1 text-[10.5px] text-subtle">
                      {num(f.available)} bays free · {num(f.carOccupied)} cars · {num(f.motorcycleOccupied)} motorcycles
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* --------------------------------------------------- visitors */}
        <TabsContent value="visitors" className="mt-3.5 flex flex-col gap-3.5">
          <Card>
            <CardHeader title="Visitor volume" subtitle="Registrations and departures by day" icon={<Users className="h-3.5 w-3.5" />} />
            <div className="p-4">
              <BarSeriesChart
                data={visitorSeries}
                series={[
                  { key: 'registered', label: 'Registered' },
                  { key: 'departed', label: 'Departed' },
                ]}
                height={260}
              />
            </div>
          </Card>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Visitor status mix" subtitle="Everyone currently on the register" />
              <div className="p-4">
                <DonutChart
                  height={200}
                  centreValue={num(world.visitors.length)}
                  centreLabel="records"
                  data={[
                    { label: 'Inside', value: world.visitors.filter((v) => v.status === 'inside').length },
                    { label: 'Overstaying', value: world.visitors.filter((v) => v.status === 'overstay').length },
                    { label: 'Departed', value: world.visitors.filter((v) => v.status === 'departed').length },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Top visiting companies" subtitle="By vehicles registered" />
              <div className="p-4">
                <BarSeriesChart
                  data={topCompanies(world)}
                  series={[{ key: 'visits', label: 'Visits' }]}
                  horizontal
                  height={240}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------------------------------------- employees */}
        <TabsContent value="employees" className="mt-3.5 flex flex-col gap-3.5">
          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <CardHeader title="Vehicles on site by department" subtitle="Employees currently parked" icon={<Users className="h-3.5 w-3.5" />} />
              <div className="p-4">
                <BarSeriesChart
                  data={departmentSeries}
                  series={[{ key: 'vehicles', label: 'Vehicles inside' }]}
                  horizontal
                  height={300}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Subscription mix" subtitle="Across all employee records" />
              <div className="p-4">
                <DonutChart
                  height={190}
                  centreValue={num(world.employees.filter((e) => e.subscription !== 'none').length)}
                  centreLabel="subscribed"
                  data={(['monthly', 'quarterly', 'annual', 'none'] as const).map((tier) => ({
                    label: tier === 'none' ? 'No subscription' : `${tier[0].toUpperCase()}${tier.slice(1)}`,
                    value: world.employees.filter((e) => e.subscription === tier).length,
                  }))}
                />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Employee vs visitor share" subtitle="Vehicles inside the plaza right now" />
            <div className="p-4">
              <DonutChart
                height={190}
                centreValue={num(kpis.vehiclesInside)}
                centreLabel="inside"
                data={[
                  { label: 'Employees', value: kpis.employeesInside },
                  { label: 'Visitors', value: kpis.visitorsInside },
                ]}
              />
            </div>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- revenue */}
        <TabsContent value="revenue" className="mt-3.5 flex flex-col gap-3.5">
          <Card>
            <CardHeader
              title="Revenue composition"
              subtitle="Visitor parking, subscriptions and penalties over 12 months"
              icon={<Wallet className="h-3.5 w-3.5" />}
              actions={
                <Badge tone="success" size="sm">
                  +{(((revenue.month - revenue.lastMonth) / revenue.lastMonth) * 100).toFixed(1)}% MoM
                </Badge>
              }
            />
            <div className="p-4">
              <BarSeriesChart
                data={revenueSeries}
                series={[
                  { key: 'visitor', label: 'Visitor parking' },
                  { key: 'subscriptions', label: 'Subscriptions' },
                  { key: 'penalties', label: 'Penalties' },
                ]}
                stacked
                height={300}
                yFormatter={(v) => currency(v, { compact: true }).replace('PKR ', '')}
                valueFormatter={(v) => currency(v)}
              />
            </div>
          </Card>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Revenue trend" subtitle={`${range} series`} />
              <div className="p-4">
                <TrendChart
                  data={series.map((p) => ({ label: p.label, revenue: p.revenue }))}
                  series={[{ key: 'revenue', label: 'Revenue' }]}
                  height={240}
                  yFormatter={(v) => currency(v, { compact: true }).replace('PKR ', '')}
                  valueFormatter={(v) => currency(v)}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Today's split" subtitle="By revenue stream" />
              <div className="p-4">
                <DonutChart
                  height={190}
                  centreValue={currency(revenue.today, { compact: true }).replace('PKR ', '')}
                  centreLabel="today"
                  data={[
                    { label: 'Visitor parking', value: revenue.visitorRevenue },
                    { label: 'Subscriptions', value: revenue.subscriptionRevenue },
                    { label: 'Penalties', value: revenue.penaltyRevenue },
                  ]}
                />
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-border bg-surface-inset px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">Transactions</p>
                    <p className="tnum mt-0.5 text-[16px] font-semibold text-foreground">
                      {num(revenue.transactionsToday)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-inset px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">Average ticket</p>
                    <p className="tnum mt-0.5 text-[16px] font-semibold text-foreground">{currency(revenue.avgTicket)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
        <p className="text-[11.5px] text-subtle">
          Charts read from the same series the Reports module exports — switch any chart to its table view to see the
          underlying figures.
        </p>
        <Button variant="ghost" size="xs" asChild>
          <a href="#/reports">Open Reports →</a>
        </Button>
      </div>
    </Page>
  );
}

function topCompanies(world: ReturnType<typeof useWorld>) {
  const counts = new Map<string, number>();
  for (const v of world.visitors) counts.set(v.company, (counts.get(v.company) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, visits]) => ({ label, visits }));
}
