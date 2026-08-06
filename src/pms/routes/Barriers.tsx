/**
 * Barrier control.
 *
 * Every gate on one screen, with its live state, mode, link health and the
 * four commands. The plaza-wide emergency release is deliberately separated
 * and confirmed — it is the one action here that cannot be undone quietly.
 */

import {
  Activity, CircleAlert, Lock, LockOpen, RefreshCw, ShieldCheck, Siren, Wifi,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ago, cn, num } from '../lib/utils';
import { Page, Toolbar } from '../components/ui/page';
import { Card, CardHeader, SectionHeader } from '../components/ui/card';
import { Badge, Button, Meter, StatusPill } from '../components/ui/primitives';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '../components/ui/overlay';
import { StatTile } from '../components/pms/atoms';
import { BarrierCard } from '../components/pms/cards';
import { ActivityFeed } from '../components/pms/feed';
import { simulation, useBarriers, useEvents, useLanes } from '../store/live';
import { useSession } from '../store/session';

export default function Barriers() {
  const barriers = useBarriers();
  const lanes = useLanes();
  const events = useEvents(80);
  const { operator, toast } = useSession();
  const [confirmEmergency, setConfirmEmergency] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const operatorLabel = `${operator.name} (${operator.id})`;

  const stats = useMemo(() => {
    const open = barriers.filter((b) => b.status === 'open').length;
    const emergency = barriers.filter((b) => b.mode === 'emergency').length;
    const manual = barriers.filter((b) => b.mode === 'manual').length;
    const degraded = barriers.filter((b) => b.connection !== 'healthy').length;
    const cycles = barriers.reduce((s, b) => s + b.cyclesToday, 0);
    const latency = barriers.reduce((s, b) => s + b.latencyMs, 0) / (barriers.length || 1);
    return { open, emergency, manual, degraded, cycles, latency };
  }, [barriers]);

  const command = (barrierId: string, cmd: 'open' | 'close' | 'emergency' | 'auto') => {
    setBusy(barrierId);
    // The real controller ACKs asynchronously; hold the buttons until it does.
    setTimeout(() => {
      const result = simulation.commandBarrier(barrierId, cmd, operatorLabel);
      toast({
        title: result.ok ? 'Command acknowledged' : 'Command rejected',
        description: result.message,
        variant: result.ok ? (cmd === 'emergency' ? 'danger' : 'success') : 'danger',
      });
      setBusy(null);
    }, 320);
  };

  const barrierEvents = useMemo(
    () => events.filter((e) => ['barrier_opened', 'barrier_closed', 'emergency_mode', 'operator_action'].includes(e.type)),
    [events],
  );

  return (
    <Page>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
        <StatTile label="Barriers" value={num(barriers.length)} icon={ShieldCheck} caption="2 entry · 2 exit" />
        <StatTile label="Open Now" value={num(stats.open)} icon={LockOpen} tone={stats.open ? 'warning' : 'success'} />
        <StatTile label="Manual Mode" value={num(stats.manual)} icon={Lock} tone={stats.manual ? 'warning' : 'neutral'} />
        <StatTile
          label="Emergency"
          value={num(stats.emergency)}
          icon={Siren}
          tone={stats.emergency ? 'danger' : 'neutral'}
        />
        <StatTile label="Cycles Today" value={num(stats.cycles)} icon={Activity} tone="info" />
        <StatTile
          label="Link Latency"
          value={stats.latency.toFixed(0)}
          unit="ms"
          icon={Wifi}
          tone={stats.latency > 120 ? 'warning' : 'success'}
        />
      </div>

      {stats.emergency > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-danger-dim/60 px-4 py-3">
          <Siren className="h-4.5 w-4.5 shrink-0 animate-[pulse-ring_2s_ease-in-out_infinite] text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-foreground">
              {stats.emergency} barrier{stats.emergency > 1 ? 's are' : ' is'} in emergency release
            </p>
            <p className="text-[11.5px] text-muted">
              Vehicles are passing without validation and no charges are being captured. Return each lane to
              automatic once the incident is clear.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              barriers.filter((b) => b.mode === 'emergency').forEach((b) => simulation.commandBarrier(b.id, 'auto', operatorLabel));
              toast({ title: 'All lanes returned to automatic', variant: 'success' });
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Return all to auto
          </Button>
        </div>
      )}

      <SectionHeader
        title="Gate control"
        description="Direct commands are logged against your operator ID"
        actions={
          <Button variant="danger" size="sm" onClick={() => setConfirmEmergency(true)}>
            <Siren className="h-3.5 w-3.5" />
            Plaza-wide emergency release
          </Button>
        }
      />

      <div className="grid gap-3.5 lg:grid-cols-2 2xl:grid-cols-4">
        {barriers.map((b) => (
          <BarrierCard key={b.id} barrier={b} busy={busy === b.id} onCommand={(cmd) => command(b.id, cmd)} />
        ))}
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader
            title="Controller health"
            subtitle="Link quality and firmware across the gate network"
            icon={<Wifi className="h-3.5 w-3.5" />}
          />
          <div className="divide-y divide-border-subtle">
            {barriers.map((b) => {
              const lane = lanes.find((l) => l.id === b.laneId);
              const quality = b.connection === 'healthy' ? 100 - b.latencyMs / 3 : b.connection === 'degraded' ? 55 : 12;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[12.5px] font-medium text-foreground">{b.name}</p>
                    <p className="tnum text-[10.5px] text-subtle">
                      {b.id} · firmware {b.firmware} · {lane?.name ?? b.laneId}
                    </p>
                  </div>
                  <div className="w-32">
                    <Meter
                      value={Math.max(6, quality)}
                      tone={b.connection === 'healthy' ? 'success' : b.connection === 'degraded' ? 'warning' : 'danger'}
                    />
                  </div>
                  <span className="tnum w-16 text-right text-[11.5px] text-muted">{b.latencyMs} ms</span>
                  <Badge
                    tone={b.connection === 'healthy' ? 'success' : b.connection === 'degraded' ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {b.connection}
                  </Badge>
                  <span className="tnum w-24 text-right text-[10.5px] text-subtle">{ago(b.lastActionTs)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border-subtle px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-subtle">
              <span className="inline-flex items-center gap-1.5">
                <CircleAlert className="h-3.5 w-3.5" />
                Commands time out after 5 s and are retried twice
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Every action is written to the audit log
              </span>
            </div>
          </div>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader title="Barrier log" subtitle="Cycles, overrides and mode changes" icon={<Activity className="h-3.5 w-3.5" />} />
          <div className="min-h-0 flex-1 pt-2.5">
            <ActivityFeed events={barrierEvents} showFilter={false} limit={30} emptyLabel="No barrier activity yet" />
          </div>
        </Card>
      </div>

      {/* Emergency release is the one destructive action here — confirm it. */}
      <Dialog open={confirmEmergency} onOpenChange={setConfirmEmergency}>
        <DialogContent size="sm">
          <DialogHeader
            icon={<Siren className="h-4 w-4 text-danger" />}
            title="Engage plaza-wide emergency release?"
            description="Every barrier on site will open and be held open until you return the lanes to automatic."
          />
          <DialogBody>
            <ul className="flex flex-col gap-2 text-[12px] text-muted">
              {[
                'All four barriers open immediately, in both directions.',
                'Vehicles pass without ANPR validation or payment capture.',
                'A critical alert is raised and the action is logged against your ID.',
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className={cn('mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger')} />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg border border-border bg-surface-inset px-3 py-2.5">
              <p className="text-[11.5px] text-subtle">
                Authorising operator
                <span className="ml-1.5 font-medium text-foreground">
                  {operator.name} · {operator.role} · {operator.id}
                </span>
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmEmergency(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                simulation.emergencyAll(operatorLabel);
                setConfirmEmergency(false);
                toast({
                  title: 'Emergency release engaged',
                  description: 'All barriers are held open.',
                  variant: 'danger',
                });
              }}
            >
              <Siren className="h-3.5 w-3.5" />
              Engage emergency release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toolbar className="text-[11px] text-subtle">
        <StatusPill tone={stats.degraded ? 'warning' : 'success'}>
          {stats.degraded ? `${stats.degraded} controller link(s) degraded` : 'All controller links healthy'}
        </StatusPill>
      </Toolbar>
    </Page>
  );
}
