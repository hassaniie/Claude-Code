/**
 * Operations command centre.
 *
 * Layout follows the operator's scan order: global KPIs across the top, then
 * the plaza gauge and floor cards (the "where"), then the live feed and alerts
 * (the "what's happening"), then trend and revenue (the "how are we doing").
 * Nothing here is more than one click from the thing it describes.
 */

import {
  Activity, AlertTriangle, ArrowRight, Banknote, Bike, Car, Cctv, CircleParking,
  CreditCard, DoorOpen, LogIn, LogOut, ScanLine, ShieldCheck, TrendingUp, Users,
  UserSquare, Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currency, duration, num, pct } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader, SectionHeader } from '../components/ui/card';
import { Badge, Button, Meter, StatusPill } from '../components/ui/primitives';
import { Segmented } from '../components/ui/tabs';
import { EmptyState } from '../components/ui/data';
import { AnimatedNumber, RadialGauge, StatTile } from '../components/pms/atoms';
import { AlertCard, FloorCard } from '../components/pms/cards';
import { ActivityFeed } from '../components/pms/feed';
import { DonutChart, TrendChart } from '../components/charts';
import {
  simulation, useActiveAlerts, useEvents, useFloorStats, useHealth, useKpis,
  useRevenue, useWorld,
} from '../store/live';
import { useSession } from '../store/session';
import type { FloorId } from '../data/types';

type Range = 'hourly' | 'daily' | 'weekly' | 'monthly';

const RANGE_LABEL: Record<Range, string> = {
  hourly: 'Last 24 hours',
  daily: 'Last 30 days',
  weekly: 'Last 12 weeks',
  monthly: 'Last 12 months',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const kpis = useKpis();
  const floors = useFloorStats();
  const alerts = useActiveAlerts();
  const events = useEvents(50);
  const revenue = useRevenue();
  const health = useHealth();
  const world = useWorld();
  const { operator, toast } = useSession();
  const [range, setRange] = useState<Range>('hourly');

  const history = world.history[range];
  const occupancySpark = useMemo(() => world.history.hourly.map((p) => p.occupancy), [world.history.hourly]);
  const revenueSpark = useMemo(() => world.history.hourly.map((p) => p.revenue), [world.history.hourly]);
  const entriesSpark = useMemo(() => world.history.hourly.map((p) => p.entries), [world.history.hourly]);

  const trendData = useMemo(
    () =>
      history.map((p) => ({
        label: p.label,
        occupancy: p.occupancy,
        entries: p.entries,
        exits: p.exits,
      })),
    [history],
  );

  const projection =
    kpis.minutesUntilFull === null
      ? kpis.fillRatePerHour < -1
        ? 'Emptying — no capacity risk'
        : 'Stable — no capacity risk'
      : kpis.minutesUntilFull > 600
        ? 'Over 10 hours at current rate'
        : `~${duration(kpis.minutesUntilFull * 60_000)} at current rate`;

  const goFloor = (floorId: FloorId) => navigate(`/plaza?floor=${floorId}`);

  return (
    <Page>
      {/* ------------------------------------------------------ global KPIs */}
      <section>
        <SectionHeader
          title="Live plaza status"
          description={`${operator.site} · ${num(kpis.totalSpaces)} monitored bays across 4 levels`}
          actions={
            <StatusPill tone={health.connection === 'connected' ? 'success' : 'warning'} pulse>
              {health.connection === 'connected' ? 'Live' : health.connection}
            </StatusPill>
          }
        />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <StatTile
            label="Total Spaces" value={num(kpis.totalSpaces)} icon={CircleParking}
            caption={`${num(kpis.carSpaces)} car · ${num(kpis.motorcycleSpaces)} moto`}
            onClick={() => navigate('/plaza')}
          />
          <StatTile
            label="Occupied" value={<AnimatedNumber value={kpis.occupied} />} icon={Car} tone="danger"
            caption={pct(kpis.occupancyPct, 1)}
            onClick={() => navigate('/plaza?status=occupied')}
          />
          <StatTile
            label="Available" value={<AnimatedNumber value={kpis.available} />} icon={CircleParking} tone="success"
            caption={`${pct(100 - kpis.occupancyPct, 1)} free`}
            onClick={() => navigate('/plaza?status=vacant')}
          />
          <StatTile
            label="Occupancy" value={kpis.occupancyPct.toFixed(1)} unit="%" icon={TrendingUp}
            tone={kpis.occupancyPct >= 90 ? 'danger' : kpis.occupancyPct >= 80 ? 'warning' : 'success'}
            spark={occupancySpark}
          />
          <StatTile
            label="Entries Today" value={<AnimatedNumber value={kpis.entriesToday} />} icon={LogIn} tone="info"
            spark={entriesSpark}
            onClick={() => navigate('/gates')}
          />
          <StatTile
            label="Exits Today" value={<AnimatedNumber value={kpis.exitsToday} />} icon={LogOut}
            caption={`net +${num(kpis.entriesToday - kpis.exitsToday)}`}
            onClick={() => navigate('/gates')}
          />
          <StatTile
            label="Vehicles Inside" value={<AnimatedNumber value={kpis.vehiclesInside} />} icon={Activity} tone="primary"
            caption={`avg dwell ${duration(kpis.avgDwellMs)}`}
          />
          <StatTile
            label="Motorcycles" value={<AnimatedNumber value={kpis.motorcyclesOccupied} />} icon={Bike} tone="info"
            caption={`of ${num(kpis.motorcycleSpaces)} bays`}
            onClick={() => navigate('/plaza?class=motorcycle')}
          />
          <StatTile
            label="Employees Inside" value={<AnimatedNumber value={kpis.employeesInside} />} icon={Users}
            onClick={() => navigate('/employees')}
          />
          <StatTile
            label="Visitors Inside" value={<AnimatedNumber value={kpis.visitorsInside} />} icon={UserSquare}
            onClick={() => navigate('/visitors')}
          />
          <StatTile
            label="Revenue Today" value={currency(revenue.today, { compact: true })} icon={Banknote} tone="success"
            spark={revenueSpark}
            onClick={() => navigate('/analytics?tab=revenue')}
          />
          <StatTile
            label="Subscribers" value={num(kpis.monthlySubscribers)} icon={CreditCard}
            caption="active monthly plans"
            onClick={() => navigate('/employees')}
          />
          <StatTile
            label="Failed Reads" value={<AnimatedNumber value={kpis.failedRecognitions} />} icon={ScanLine}
            tone={kpis.failedRecognitions > 15 ? 'warning' : 'neutral'}
            caption="ANPR today"
            onClick={() => navigate('/gates')}
          />
          <StatTile
            label="Active Alerts" value={<AnimatedNumber value={kpis.activeAlerts} />} icon={AlertTriangle}
            tone={kpis.criticalAlerts ? 'danger' : kpis.activeAlerts ? 'warning' : 'success'}
            caption={`${kpis.criticalAlerts} critical`}
            onClick={() => navigate('/alerts')}
          />
          <StatTile
            label="Offline Cameras" value={num(kpis.offlineCameras)} icon={Cctv}
            tone={kpis.offlineCameras ? 'danger' : 'success'}
            caption={`of ${num(kpis.totalCameras)} · ${kpis.redCameras} at capacity`}
            onClick={() => navigate('/cctv')}
          />
          <StatTile
            label="Barriers Open" value={`${kpis.barriersOpen}/${kpis.barriersTotal}`} icon={ShieldCheck}
            tone={kpis.barriersOpen ? 'warning' : 'neutral'}
            onClick={() => navigate('/barriers')}
          />
        </div>
      </section>

      {/* ------------------------------------------- gauge + floor overview */}
      <section className="grid gap-3.5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="items-center justify-center p-5">
          <CardHeader
            title="Parking Occupancy"
            subtitle="All levels, live"
            className="w-full border-0 px-0 pb-4 pt-0"
            actions={
              <Badge tone={kpis.occupancyPct >= 90 ? 'danger' : kpis.occupancyPct >= 80 ? 'warning' : 'success'}>
                {kpis.occupancyPct >= 90 ? 'Critical' : kpis.occupancyPct >= 80 ? 'High load' : 'Nominal'}
              </Badge>
            }
          />
          <RadialGauge value={kpis.occupancyPct} size={208} label="Occupied" />

          <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-vacant/25 bg-vacant/[0.07] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle">Available</p>
              <p className="tnum mt-0.5 text-[19px] font-semibold text-vacant">{num(kpis.available)}</p>
            </div>
            <div className="rounded-lg border border-occupied/25 bg-occupied/[0.07] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle">Occupied</p>
              <p className="tnum mt-0.5 text-[19px] font-semibold text-occupied">{num(kpis.occupied)}</p>
            </div>
          </div>

          <div className="mt-2.5 w-full rounded-lg border border-border bg-surface-inset px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-subtle">
                Predicted time until full
              </span>
            </div>
            <p className="mt-1 text-[13px] font-semibold text-foreground">{projection}</p>
            <p className="tnum mt-0.5 text-[11px] text-subtle">
              fill rate {kpis.fillRatePerHour >= 0 ? '+' : ''}
              {kpis.fillRatePerHour.toFixed(1)} bays/hr · peak today {num(kpis.peakOccupancyToday)}
            </p>
          </div>

          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => navigate('/plaza')}>
            Open plaza map
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>

        <div className="flex flex-col gap-3.5">
          <SectionHeader
            title="Floor overview"
            description="Click any level to open its map"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/plaza')}>
                All floors <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {floors.map((f) => (
              <FloorCard key={f.floorId} stats={f} onClick={() => goFloor(f.floorId)} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ feed + alerts */}
      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-h-[420px]">
          <CardHeader
            title="Live activity"
            subtitle="Every plaza event as it is reported"
            icon={<Activity className="h-3.5 w-3.5" />}
            actions={
              <Badge tone="neutral" size="sm">
                {events.length} recent
              </Badge>
            }
          />
          <div className="min-h-0 flex-1 pt-2.5">
            <ActivityFeed
              events={events}
              limit={26}
              onSelect={(e) => e.plate && navigate(`/search?plate=${e.plate}`)}
            />
          </div>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader
            title="Alerts"
            subtitle={`${alerts.length} active · ${alerts.filter((a) => a.severity === 'critical').length} critical`}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/alerts')}>
                View all
              </Button>
            }
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {alerts.length === 0 ? (
              <EmptyState
                title="No active alerts"
                description="Every monitored subsystem is reporting normally."
                icon={<ShieldCheck className="h-5 w-5 text-success" />}
              />
            ) : (
              <div className="flex flex-col gap-2" role="list">
                {alerts.slice(0, 6).map((a) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    compact
                    onAcknowledge={(id) => {
                      simulation.acknowledgeAlert(id, `${operator.name} (${operator.id})`);
                      toast({ title: 'Alert acknowledged', variant: 'success' });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------- trend + revenue */}
      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            title="Occupancy trend"
            subtitle={RANGE_LABEL[range]}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            actions={
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
            }
          />
          {/*
            Two charts, not one with two axes: occupancy is a stock (bays held
            at a moment) and entries/exits are flows (movements per period).
            Sharing a y-scale would make the comparison meaningless.
          */}
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-medium text-muted">Occupied bays</p>
              <TrendChart
                data={trendData}
                series={[{ key: 'occupancy', label: 'Occupied bays' }]}
                height={222}
                referenceValue={Math.round(kpis.totalSpaces * 0.8)}
                referenceLabel="80% capacity"
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-muted">Movements per period</p>
              <TrendChart
                data={trendData}
                series={[
                  { key: 'entries', label: 'Entries' },
                  { key: 'exits', label: 'Exits' },
                ]}
                height={222}
                fill={false}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue" subtitle="Today and month to date" icon={<Wallet className="h-3.5 w-3.5" />} />
          <div className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-border bg-surface-inset px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle">Today</p>
                <p className="tnum mt-1 text-[18px] font-semibold text-foreground">{currency(revenue.today)}</p>
                <p className="tnum mt-0.5 text-[10.5px] text-subtle">
                  vs {currency(revenue.yesterday, { compact: true })} yesterday
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-inset px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle">Month</p>
                <p className="tnum mt-1 text-[18px] font-semibold text-foreground">
                  {currency(revenue.month, { compact: true })}
                </p>
                <p className="tnum mt-0.5 text-[10.5px] text-success">
                  +{(((revenue.month - revenue.lastMonth) / revenue.lastMonth) * 100).toFixed(1)}% vs last
                </p>
              </div>
            </div>

            <DonutChart
              height={168}
              centreValue={currency(revenue.today, { compact: true }).replace('PKR ', '')}
              centreLabel="today"
              data={[
                { label: 'Visitor parking', value: revenue.visitorRevenue },
                { label: 'Subscriptions', value: revenue.subscriptionRevenue },
                { label: 'Penalties', value: revenue.penaltyRevenue },
              ]}
            />

            <div className="border-t border-border-subtle pt-3">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-subtle">Transactions today</span>
                <span className="tnum font-medium text-foreground">{num(revenue.transactionsToday)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                <span className="text-subtle">Average ticket</span>
                <span className="tnum font-medium text-foreground">{currency(revenue.avgTicket)}</span>
              </div>
              <Meter className="mt-3" value={(revenue.month / 7_000_000) * 100} tone="success" />
              <p className="tnum mt-1.5 text-[10.5px] text-subtle">
                {((revenue.month / 7_000_000) * 100).toFixed(1)}% of the PKR 7.0M monthly target
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------- gate summary */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {world.lanes.map((lane) => {
          const barrier = world.barriers.find((b) => b.id === lane.barrierId);
          return (
            <Card key={lane.id} interactive onClick={() => navigate('/gates')} className="gap-2.5 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                  <DoorOpen className="h-3.5 w-3.5 text-subtle" />
                  {lane.name.split(' — ')[0]}
                </span>
                <Badge tone={barrier?.status === 'open' ? 'success' : 'neutral'} size="sm">
                  {barrier?.status.toUpperCase() ?? '—'}
                </Badge>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">In queue</p>
                  <p className="tnum text-[20px] font-semibold text-foreground">{lane.queue.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">Throughput</p>
                  <p className="tnum text-[13px] font-medium text-muted">{lane.throughputPerHour}/hr</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-subtle">
                <span
                  className={
                    lane.recognition === 'failed'
                      ? 'text-danger'
                      : lane.recognition === 'matched'
                        ? 'text-success'
                        : 'text-muted'
                  }
                >
                  ANPR {lane.recognition}
                </span>
                {lane.lastPlate && <span className="font-mono">· {lane.lastPlate}</span>}
              </div>
            </Card>
          );
        })}
      </section>
    </Page>
  );
}
