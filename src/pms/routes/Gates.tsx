/**
 * Entry / Exit — live lane monitoring.
 *
 * One column per lane, each carrying everything needed to clear a vehicle:
 * the ANPR read with its confidence, the capture, the queue behind it, the
 * barrier state, and the four controls. When a read fails, the visitor
 * registration flow is one click away — that is the whole point of this screen.
 */

import {
  ArrowRight, Car, CheckCircle2, CircleAlert, Clock, LogIn, LogOut, ScanLine,
  Siren, Timer, UserPlus, Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, ago, duration, fmtTimeSec, num } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader, SectionHeader } from '../components/ui/card';
import { Badge, Button, Separator, StatusPill } from '../components/ui/primitives';
import { Input } from '../components/ui/form';
import { EmptyState } from '../components/ui/data';
import { StatTile, PlateTag, LiveDot } from '../components/pms/atoms';
import { CameraFeed } from '../components/pms/CameraFeed';
import { BarrierCard } from '../components/pms/cards';
import { ActivityFeed } from '../components/pms/feed';
import { VisitorRegistrationDialog } from '../components/pms/VisitorRegistration';
import { simulation, useBarriers, useEvents, useKpis, useLanes, useWorld } from '../store/live';
import { useSession } from '../store/session';
import type { Lane, RecognitionStatus } from '../data/types';

const RECOGNITION: Record<RecognitionStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  idle: { label: 'Idle — no vehicle at loop', tone: 'neutral' },
  reading: { label: 'Reading plate…', tone: 'info' },
  matched: { label: 'Plate matched', tone: 'success' },
  failed: { label: 'Recognition failed', tone: 'danger' },
};

export default function Gates() {
  const lanes = useLanes();
  const barriers = useBarriers();
  const kpis = useKpis();
  const events = useEvents(60);
  const world = useWorld();
  const { operator, toast } = useSession();
  const [registerFor, setRegisterFor] = useState<Lane | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const operatorLabel = `${operator.name} (${operator.id})`;
  const entryLanes = lanes.filter((l) => l.direction === 'entry');
  const exitLanes = lanes.filter((l) => l.direction === 'exit');

  const queueTotal = lanes.reduce((s, l) => s + l.queue.length, 0);
  const avgProcessing = lanes.reduce((s, l) => s + l.avgProcessingSec, 0) / (lanes.length || 1);

  const gateEvents = useMemo(
    () =>
      events.filter((e) =>
        ['vehicle_entered', 'vehicle_exited', 'barrier_opened', 'barrier_closed', 'recognition_failed', 'visitor_registered'].includes(
          e.type,
        ),
      ),
    [events],
  );

  const command = (barrierId: string, cmd: 'open' | 'close' | 'emergency' | 'auto') => {
    const result = simulation.commandBarrier(barrierId, cmd, operatorLabel);
    toast({
      title: result.ok ? 'Command sent' : 'Command rejected',
      description: result.message,
      variant: result.ok ? (cmd === 'emergency' ? 'danger' : 'success') : 'danger',
    });
  };

  const submitOverride = (lane: Lane) => {
    const plate = overrides[lane.id]?.trim();
    if (!plate) return;
    const result = simulation.overridePlate(lane.id, plate, operatorLabel);
    toast({ title: result.message, variant: result.ok ? 'success' : 'danger' });
    setOverrides((o) => ({ ...o, [lane.id]: '' }));
  };

  return (
    <Page>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Entries Today" value={num(kpis.entriesToday)} icon={LogIn} tone="info" />
        <StatTile label="Exits Today" value={num(kpis.exitsToday)} icon={LogOut} />
        <StatTile label="In Queue" value={num(queueTotal)} icon={Users} tone={queueTotal > 8 ? 'warning' : 'neutral'} />
        <StatTile
          label="Avg Processing"
          value={avgProcessing.toFixed(1)}
          unit="s"
          icon={Timer}
        />
        <StatTile
          label="Failed Reads"
          value={num(kpis.failedRecognitions)}
          icon={ScanLine}
          tone={kpis.failedRecognitions > 15 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Barriers Open"
          value={`${kpis.barriersOpen}/${kpis.barriersTotal}`}
          icon={Siren}
          tone={kpis.barriersOpen ? 'warning' : 'neutral'}
        />
      </div>

      <SectionHeader
        title="Entry lanes"
        description="Inbound traffic — ANPR reads, queue and barrier control"
        actions={<LiveDot tone="success" label="Streaming" />}
      />
      <div className="grid gap-3.5 xl:grid-cols-2">
        {entryLanes.map((lane) => (
          <LaneCard
            key={lane.id}
            lane={lane}
            barrier={barriers.find((b) => b.id === lane.barrierId)!}
            onCommand={command}
            onRegister={() => setRegisterFor(lane)}
            overrideValue={overrides[lane.id] ?? ''}
            onOverrideChange={(v) => setOverrides((o) => ({ ...o, [lane.id]: v }))}
            onOverrideSubmit={() => submitOverride(lane)}
          />
        ))}
      </div>

      <SectionHeader title="Exit lanes" description="Outbound traffic — payment validation and release" />
      <div className="grid gap-3.5 xl:grid-cols-2">
        {exitLanes.map((lane) => (
          <LaneCard
            key={lane.id}
            lane={lane}
            barrier={barriers.find((b) => b.id === lane.barrierId)!}
            onCommand={command}
            onRegister={() => setRegisterFor(lane)}
            overrideValue={overrides[lane.id] ?? ''}
            onOverrideChange={(v) => setOverrides((o) => ({ ...o, [lane.id]: v }))}
            onOverrideSubmit={() => submitOverride(lane)}
          />
        ))}
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <SectionHeader title="Barrier control" description="Direct commands to every gate on site" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {barriers.map((b) => (
              <BarrierCard key={b.id} barrier={b} onCommand={(cmd) => command(b.id, cmd)} />
            ))}
          </div>
        </div>

        <Card className="min-h-[440px]">
          <CardHeader
            title="Gate activity"
            subtitle="Entries, exits, barrier cycles and failed reads"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <div className="min-h-0 flex-1 pt-2.5">
            <ActivityFeed events={gateEvents} showFilter={false} limit={30} emptyLabel="No gate activity yet" />
          </div>
        </Card>
      </div>

      <VisitorRegistrationDialog
        open={Boolean(registerFor)}
        onOpenChange={(o) => !o && setRegisterFor(null)}
        laneName={registerFor?.name}
        prefillPlate={registerFor?.lastPlate}
        snapshotSeed={registerFor?.snapshotSeed ?? 42}
        onRegistered={() => setRegisterFor(null)}
      />

      {world.health.connection !== 'connected' && (
        <div className="rounded-xl border border-warning/30 bg-warning-dim/40 px-4 py-3">
          <p className="text-[12px] text-foreground">
            Lane telemetry is {world.health.connection}. Barrier commands may not be acknowledged — verify each
            action against the physical gate before waving a vehicle through.
          </p>
        </div>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------- lane */

function LaneCard({
  lane,
  barrier,
  onCommand,
  onRegister,
  overrideValue,
  onOverrideChange,
  onOverrideSubmit,
}: {
  lane: Lane;
  barrier: ReturnType<typeof useBarriers>[number];
  onCommand: (barrierId: string, cmd: 'open' | 'close' | 'emergency' | 'auto') => void;
  onRegister: () => void;
  overrideValue: string;
  onOverrideChange: (v: string) => void;
  onOverrideSubmit: () => void;
}) {
  const rec = RECOGNITION[lane.recognition];
  const failed = lane.recognition === 'failed';

  return (
    <Card className={cn('overflow-hidden', failed && 'border-danger/40')}>
      <CardHeader
        title={lane.name}
        subtitle={`${lane.cameraId} · throughput ${lane.throughputPerHour}/hr · avg ${lane.avgProcessingSec.toFixed(1)}s`}
        icon={lane.direction === 'entry' ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
        actions={
          <StatusPill tone={rec.tone} pulse={lane.recognition === 'reading' || failed}>
            {rec.label}
          </StatusPill>
        }
      />

      <div className="grid gap-3 p-3.5 md:grid-cols-[minmax(0,1fr)_190px]">
        <div className="flex flex-col gap-3">
          <CameraFeed
            seed={lane.snapshotSeed}
            state={lane.recognition === 'reading' ? 'live' : 'live'}
            label={`${lane.cameraId} · LIVE`}
            plate={lane.lastPlate}
            lane
            timestamp={lane.lastPlateTs}
            className="w-full"
          />

          <div
            className={cn(
              'rounded-xl border px-3 py-2.5',
              failed ? 'border-danger/35 bg-danger-dim/40' : 'border-border bg-surface-inset',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
                Latest captured plate
              </span>
              <span className="tnum text-[10.5px] text-subtle">
                {lane.lastPlateTs ? fmtTimeSec(lane.lastPlateTs) : '—'}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              {lane.lastPlate ? (
                <PlateTag plate={lane.lastPlate} size="lg" />
              ) : (
                <span className="text-[12.5px] text-disabled">Awaiting first read</span>
              )}
              {lane.lastConfidence !== undefined && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-subtle">Confidence</span>
                    <span
                      className={cn(
                        'tnum font-medium',
                        lane.lastConfidence > 0.9 ? 'text-success' : lane.lastConfidence > 0.72 ? 'text-warning' : 'text-danger',
                      )}
                    >
                      {(lane.lastConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-500',
                        lane.lastConfidence > 0.9 ? 'bg-success' : lane.lastConfidence > 0.72 ? 'bg-warning' : 'bg-danger',
                      )}
                      style={{ width: `${lane.lastConfidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {failed && (
              <div className="mt-3 border-t border-danger/25 pt-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] text-danger">
                  <CircleAlert className="h-3.5 w-3.5" />
                  Plate could not be read — admit manually or register as a visitor.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="flex min-w-[190px] flex-1 gap-1.5">
                    <Input
                      value={overrideValue}
                      onChange={(e) => onOverrideChange(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && onOverrideSubmit()}
                      placeholder="Type plate…"
                      className="h-8 font-mono uppercase"
                    />
                    <Button size="sm" variant="secondary" onClick={onOverrideSubmit} disabled={!overrideValue.trim()}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                  </div>
                  <Button size="sm" variant="primary" onClick={onRegister}>
                    <UserPlus className="h-3.5 w-3.5" />
                    Register visitor
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* queue */}
        <div className="flex flex-col rounded-xl border border-border bg-surface-inset p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">Queue</span>
            <Badge tone={lane.queue.length > 3 ? 'warning' : 'neutral'} size="sm">
              {lane.queue.length}
            </Badge>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {lane.queue.length === 0 ? (
              <EmptyState title="Lane clear" description="No vehicles waiting." className="px-2 py-6" />
            ) : (
              lane.queue.map((q, i) => (
                <div
                  key={`${q.plate}-${q.arrivedAt}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2 py-1.5',
                    i === 0 ? 'border-primary/35 bg-primary-muted' : 'border-border bg-surface',
                  )}
                >
                  <span className="tnum w-4 shrink-0 text-[10px] font-semibold text-subtle">{i + 1}</span>
                  <Car className="h-3 w-3 shrink-0 text-subtle" />
                  <span className="truncate font-mono text-[10.5px] text-foreground">{q.plate}</span>
                  <span className="tnum ml-auto shrink-0 text-[9.5px] text-subtle">
                    {duration(Date.now() - q.arrivedAt)}
                  </span>
                </div>
              ))
            )}
          </div>

          <Separator className="my-2.5" />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-subtle">Barrier</span>
              <Badge tone={barrier?.status === 'open' ? 'success' : 'neutral'} size="sm">
                {barrier?.status ?? '—'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-subtle">Mode</span>
              <span className="font-medium uppercase text-foreground">{barrier?.mode}</span>
            </div>
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-subtle">Last action</span>
              <span className="tnum text-muted">{barrier ? ago(barrier.lastActionTs) : '—'}</span>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <Button size="xs" variant="success" onClick={() => onCommand(barrier.id, 'open')}>
              Open
            </Button>
            <Button size="xs" variant="secondary" onClick={() => onCommand(barrier.id, 'close')}>
              Close
            </Button>
            <Button size="xs" variant="danger" onClick={() => onCommand(barrier.id, 'emergency')}>
              Emergency
            </Button>
            <Button size="xs" variant="outline" onClick={() => onCommand(barrier.id, 'auto')}>
              Auto
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle px-3.5 py-2 text-[10.5px] text-subtle">
        <span className="tnum">
          {lane.direction === 'entry' ? 'Inbound' : 'Outbound'} · {lane.id}
        </span>
        <span className="inline-flex items-center gap-1">
          Next vehicle <ArrowRight className="h-3 w-3" />
          {lane.queue[0]?.plate ?? 'none'}
        </span>
      </div>
    </Card>
  );
}
