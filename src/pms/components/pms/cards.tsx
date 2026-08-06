/**
 * Domain cards — floors, alerts, barriers, cameras.
 *
 * Each one is a self-contained read of a single piece of infrastructure, with
 * its controls on the card rather than behind a menu: on an operations floor,
 * a hidden action is an action that doesn't happen.
 */

import {
  AlertTriangle, ArrowUpRight, Ban, Bike, Car, Cctv, ChevronRight, CircleAlert,
  HardDrive, Lock, LockOpen, Radio, RefreshCw, ShieldAlert, Siren, TriangleAlert,
  Unlock, Video, VideoOff, Wifi, WifiOff, Zap,
} from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { ago, cn, duration, num, pct } from '../../lib/utils';
import type { Alert, Barrier, Camera, FloorStats } from '../../data/types';
import { Badge, Button, Meter, StatusPill, type PillTone } from '../ui/primitives';
import { Card } from '../ui/card';
import { Tooltip } from '../ui/overlay';
import { Delta, LiveDot } from './atoms';
import { CameraFeed } from './CameraFeed';

/* ------------------------------------------------------------------ Floor */

const FLOOR_TONE: Record<FloorStats['status'], PillTone> = {
  normal: 'success',
  filling: 'warning',
  critical: 'danger',
  full: 'danger',
};

const FLOOR_LABEL: Record<FloorStats['status'], string> = {
  normal: 'Normal',
  filling: 'Filling',
  critical: 'Critical',
  full: 'Full',
};

export const FloorCard = memo(function FloorCard({
  stats,
  onClick,
  className,
}: {
  stats: FloorStats;
  onClick?: () => void;
  className?: string;
}) {
  const carPct = (stats.carOccupied / stats.carCapacity) * 100;
  const motoPct = (stats.motorcycleOccupied / stats.motorcycleCapacity) * 100;

  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={cn('group gap-3 p-4', className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{stats.name}</h3>
          <p className="tnum mt-0.5 text-[11px] text-subtle">
            {num(stats.carCapacity + stats.motorcycleCapacity)} bays
          </p>
        </div>
        <StatusPill tone={FLOOR_TONE[stats.status]} pulse={stats.status === 'full' || stats.status === 'critical'}>
          {FLOOR_LABEL[stats.status]}
        </StatusPill>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="tnum text-[26px] font-semibold leading-none tracking-[-0.035em] text-foreground">
            {stats.occupancyPct.toFixed(1)}
          </span>
          <span className="text-[13px] text-subtle">%</span>
        </div>
        <Delta value={stats.trend} suffix=" bays/10m" showZero />
      </div>

      <Meter
        segments={[
          { value: (stats.carOccupied / (stats.carCapacity + stats.motorcycleCapacity)) * 100, tone: FLOOR_TONE[stats.status], label: 'Cars' },
          { value: (stats.motorcycleOccupied / (stats.carCapacity + stats.motorcycleCapacity)) * 100, tone: 'info', label: 'Motorcycles' },
        ]}
        value={stats.occupancyPct}
        height={5}
      />

      <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-2.5">
        <Stat label="Available" value={num(stats.available)} tone={stats.available === 0 ? 'danger' : undefined} />
        <Stat label="Occupied" value={num(stats.carOccupied + stats.motorcycleOccupied)} />
        <Stat
          label={<span className="inline-flex items-center gap-1"><Bike className="h-2.5 w-2.5" />Motos</span>}
          value={`${stats.motorcycleOccupied}/${stats.motorcycleCapacity}`}
        />
      </div>

      <div className="flex items-center justify-between text-[10.5px] text-subtle">
        <span className="tnum flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><Car className="h-3 w-3" />{pct(carPct, 0)}</span>
          <span className="inline-flex items-center gap-1"><Bike className="h-3 w-3" />{pct(motoPct, 0)}</span>
        </span>
        {onClick && (
          <span className="inline-flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Open floor <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </Card>
  );
});

function Stat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: PillTone }) {
  return (
    <div>
      <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-subtle">{label}</p>
      <p
        className={cn(
          'tnum mt-0.5 text-[13px] font-semibold text-foreground',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Alert */

const ALERT_ICON: Record<string, typeof AlertTriangle> = {
  occupancy_80: TriangleAlert,
  parking_full: Ban,
  floor_full: Ban,
  camera_offline: VideoOff,
  recognition_failed: CircleAlert,
  barrier_offline: ShieldAlert,
  api_failure: WifiOff,
  communication_failure: Radio,
  emergency_mode: Siren,
};

const SEVERITY_TONE: Record<Alert['severity'], PillTone> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

export const AlertCard = memo(function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onOpen,
  compact,
  className,
}: {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onOpen?: (alert: Alert) => void;
  compact?: boolean;
  className?: string;
}) {
  const Icon = ALERT_ICON[alert.type] ?? AlertTriangle;
  const tone = SEVERITY_TONE[alert.severity];

  return (
    <div
      className={cn(
        'group relative flex gap-3 overflow-hidden rounded-xl border bg-surface transition-colors',
        compact ? 'px-3 py-2.5' : 'p-3.5',
        alert.resolved
          ? 'border-border opacity-55'
          : tone === 'danger'
            ? 'border-danger/30 bg-danger-dim/25'
            : tone === 'warning'
              ? 'border-warning/25 bg-warning-dim/20'
              : 'border-info/25 bg-info-dim/20',
        className,
      )}
      role="listitem"
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-[2.5px]',
          tone === 'danger' ? 'bg-danger' : tone === 'warning' ? 'bg-warning' : 'bg-info',
          alert.resolved && 'opacity-40',
        )}
      />
      <span
        className={cn(
          'ml-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          tone === 'danger' ? 'bg-danger/15 text-danger' : tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-foreground">{alert.title}</p>
          <span className="tnum shrink-0 text-[10.5px] text-subtle">{ago(alert.ts)}</span>
        </div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{alert.message}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="outline" size="sm">{alert.source}</Badge>
          {alert.resolved ? (
            <Badge tone="success" size="sm">Resolved</Badge>
          ) : alert.acknowledged ? (
            <Badge tone="neutral" size="sm">Ack · {alert.acknowledgedBy ?? 'operator'}</Badge>
          ) : null}

          <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {onOpen && (
              <Button variant="ghost" size="xs" onClick={() => onOpen(alert)}>
                Details
              </Button>
            )}
            {!alert.acknowledged && !alert.resolved && onAcknowledge && (
              <Button variant="secondary" size="xs" onClick={() => onAcknowledge(alert.id)}>
                Acknowledge
              </Button>
            )}
            {!alert.resolved && onResolve && (
              <Button variant="ghost" size="xs" onClick={() => onResolve(alert.id)}>
                Resolve
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ---------------------------------------------------------------- Barrier */

const BARRIER_TONE: Record<Barrier['status'], PillTone> = {
  open: 'success',
  closed: 'neutral',
  moving: 'info',
  fault: 'danger',
};

export const BarrierCard = memo(function BarrierCard({
  barrier,
  onCommand,
  busy,
  className,
}: {
  barrier: Barrier;
  onCommand: (command: 'open' | 'close' | 'emergency' | 'auto') => void;
  busy?: boolean;
  className?: string;
}) {
  const emergency = barrier.mode === 'emergency';

  return (
    <Card className={cn('gap-0 overflow-hidden', emergency && 'border-danger/45', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              barrier.status === 'open' ? 'bg-success-dim text-success' : 'bg-surface-raised text-muted',
            )}
          >
            {barrier.status === 'open' ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{barrier.name}</h3>
            <p className="text-[11px] text-subtle">
              {barrier.laneId} · {barrier.direction === 'entry' ? 'Entry' : 'Exit'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill tone={BARRIER_TONE[barrier.status]} pulse={barrier.status === 'open' || barrier.status === 'fault'}>
            {barrier.status.toUpperCase()}
          </StatusPill>
          <Badge tone={emergency ? 'danger' : barrier.mode === 'auto' ? 'primary' : 'neutral'} size="sm">
            {emergency ? 'EMERGENCY' : barrier.mode === 'auto' ? 'AUTO' : 'MANUAL'}
          </Badge>
        </div>
      </div>

      {/* Barrier arm — animated so the state is legible from across the room. */}
      <div className="relative h-14 overflow-hidden bg-surface-inset px-4">
        <div className="absolute bottom-3 left-4 h-8 w-2.5 rounded-sm bg-border-strong" />
        <div
          className={cn(
            'absolute bottom-[38px] left-[26px] h-1.5 w-[calc(100%-46px)] origin-left rounded-full transition-transform duration-700',
            barrier.status === 'fault' ? 'bg-danger' : barrier.status === 'open' ? 'bg-success' : 'bg-danger/80',
          )}
          style={{
            transform: barrier.status === 'open' ? 'rotate(-72deg)' : 'rotate(0deg)',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          <span
            className="absolute inset-0 rounded-full opacity-45"
            style={{
              backgroundImage:
                'repeating-linear-gradient(115deg, rgba(255,255,255,0.85) 0 6px, transparent 6px 12px)',
            }}
          />
        </div>
        <span className="absolute bottom-2 right-4 text-[9.5px] uppercase tracking-[0.14em] text-subtle">
          {barrier.direction === 'entry' ? 'inbound lane' : 'outbound lane'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-[11px]">
        <Field label="Last action" value={barrier.lastAction} />
        <Field label="Last operator" value={barrier.lastOperator} />
        <Field label="Cycles today" value={num(barrier.cyclesToday)} mono />
        <Field
          label="Link"
          value={
            <span className="inline-flex items-center gap-1">
              {barrier.connection === 'healthy' ? (
                <Wifi className="h-3 w-3 text-success" />
              ) : barrier.connection === 'degraded' ? (
                <Wifi className="h-3 w-3 text-warning" />
              ) : (
                <WifiOff className="h-3 w-3 text-danger" />
              )}
              <span className="tnum">{barrier.latencyMs} ms</span>
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-4 gap-1.5 border-t border-border-subtle px-3 py-2.5">
        <Button size="sm" variant="success" onClick={() => onCommand('open')} disabled={busy || barrier.status === 'open'}>
          <Unlock className="h-3.5 w-3.5" />
          Open
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onCommand('close')} disabled={busy || barrier.status === 'closed'}>
          <Lock className="h-3.5 w-3.5" />
          Close
        </Button>
        <Button size="sm" variant="danger" onClick={() => onCommand('emergency')} disabled={busy || emergency}>
          <Siren className="h-3.5 w-3.5" />
          Emerg.
        </Button>
        <Button size="sm" variant="outline" onClick={() => onCommand('auto')} disabled={busy || barrier.mode === 'auto'}>
          <RefreshCw className="h-3.5 w-3.5" />
          Auto
        </Button>
      </div>
    </Card>
  );
});

function Field({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-subtle">{label}</p>
      <p className={cn('mt-0.5 truncate text-[11.5px] text-foreground', mono && 'tnum font-mono')}>{value}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- Camera */

export const CameraCard = memo(function CameraCard({
  camera,
  onOpen,
  onToggle,
  className,
}: {
  camera: Camera;
  onOpen?: (camera: Camera) => void;
  onToggle?: (camera: Camera) => void;
  className?: string;
}) {
  const offline = camera.health === 'offline';
  const red = camera.coverageStatus === 'red';

  return (
    <Card className={cn('gap-0 overflow-hidden', offline && 'border-danger/30', className)}>
      <CameraFeed
        seed={Number(camera.id.replace(/\D/g, '') || 7) + camera.floorId.length}
        state={offline ? 'offline' : camera.health === 'degraded' ? 'degraded' : 'live'}
        label={camera.id}
        lane={camera.role === 'lane'}
        onExpand={onOpen ? () => onOpen(camera) : undefined}
      />

      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-foreground">{camera.name}</p>
          <p className="tnum mt-0.5 truncate text-[10.5px] text-subtle">
            {camera.resolution} · {camera.fps}fps · {camera.ipAddress}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {offline ? (
            <Badge tone="danger" size="sm">OFFLINE</Badge>
          ) : camera.health === 'degraded' ? (
            <Badge tone="warning" size="sm">DEGRADED</Badge>
          ) : (
            <Badge tone="success" size="sm">ONLINE</Badge>
          )}
          {camera.role === 'bay' && (
            <Tooltip content={red ? 'All 6 monitored bays occupied' : `${camera.occupiedCount}/6 bays occupied`}>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                  red ? 'bg-occupied/15 text-occupied' : 'bg-vacant/15 text-vacant',
                )}
              >
                <Cctv className="h-2.5 w-2.5" />
                {camera.occupiedCount}/6
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2">
        <div className="flex items-center gap-3 text-[10px] text-subtle">
          <span className="inline-flex items-center gap-1">
            {camera.recording ? <Video className="h-3 w-3 text-danger" /> : <VideoOff className="h-3 w-3" />}
            {camera.recording ? 'Recording' : 'Stopped'}
          </span>
          <Tooltip content={`NVR channel ${camera.storagePct}% consumed`}>
            <span className={cn('tnum inline-flex items-center gap-1', camera.storagePct > 85 && 'text-warning')}>
              <HardDrive className="h-3 w-3" />
              {camera.storagePct}%
            </span>
          </Tooltip>
          {camera.ptz && <Badge tone="outline" size="sm">PTZ</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {onToggle && (
            <Button variant="ghost" size="xs" onClick={() => onToggle(camera)}>
              {offline ? 'Restore' : 'Disable'}
            </Button>
          )}
          {onOpen && (
            <Button variant="ghost" size="xs" onClick={() => onOpen(camera)}>
              Open <ArrowUpRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

/* ------------------------------------------------------------ Health strip */

export function ConnectionStrip({
  state,
  lastSync,
  latencyMs,
  onRetry,
  className,
}: {
  state: 'connected' | 'degraded' | 'reconnecting' | 'offline';
  lastSync: number;
  latencyMs: number;
  onRetry?: () => void;
  className?: string;
}) {
  const tone: PillTone =
    state === 'connected' ? 'success' : state === 'degraded' ? 'warning' : state === 'reconnecting' ? 'info' : 'danger';

  const copy = {
    connected: 'Live link healthy',
    degraded: 'Link degraded — responses are slow',
    reconnecting: 'Reconnecting to plaza controller…',
    offline: 'Link lost — showing last known state',
  }[state];

  if (state === 'connected') {
    return (
      <div className={cn('flex items-center gap-2 text-[11px] text-subtle', className)}>
        <LiveDot tone="success" />
        <span className="tnum">
          Synced {ago(lastSync)} · {latencyMs}ms
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
        tone === 'danger' ? 'border-danger/35 bg-danger-dim/40' : 'border-warning/30 bg-warning-dim/30',
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-2">
        <Zap className={cn('h-3.5 w-3.5', tone === 'danger' ? 'text-danger' : 'text-warning')} />
        <span className="text-[11.5px] text-foreground">{copy}</span>
        <span className="tnum text-[11px] text-subtle">· last sync {ago(lastSync)}</span>
      </div>
      {onRetry && (
        <Button size="xs" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-3 w-3" />
          Retry now
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Dwell chip */

export function DwellChip({ since, className }: { since: number; className?: string }) {
  const ms = Date.now() - since;
  const long = ms > 8 * 3600_000;
  return (
    <span
      className={cn(
        'tnum inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium',
        long ? 'bg-warning-dim text-warning' : 'bg-surface-inset text-muted',
        className,
      )}
    >
      {duration(ms)}
    </span>
  );
}
