/**
 * Detail side panels for bays and cameras.
 *
 * Detail opens beside the work, never on top of it — the operator keeps the
 * map or the camera wall in view while they read and act.
 */

import {
  Camera as CameraIcon, Cctv, Clock, Download, HardDrive, Maximize2, Move,
  Pause, Play, RotateCcw, ScanLine, SkipBack, SkipForward, SquareArrowOutUpRight,
  Volume2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, duration, fmtDateTime, fmtTime, num } from '../../lib/utils';
import type { Camera, ParkingSpace } from '../../data/types';
import { simulation, useCamera, useVehicle, useWorld } from '../../store/live';
import { useSession } from '../../store/session';
import { Badge, Button, Meter, Separator, StatusPill } from '../ui/primitives';
import { DefList } from '../ui/data';
import { SidePanel, SidePanelContent, SidePanelHeader, Tooltip } from '../ui/overlay';
import { CameraFeed } from './CameraFeed';
import { PlateTag } from './atoms';
import { Timeline } from './feed';

/* ------------------------------------------------------- Bay detail panel */

export function SpaceDetailPanel({
  space,
  onClose,
  onOpenCamera,
}: {
  space: ParkingSpace | null;
  onClose: () => void;
  onOpenCamera?: (cameraId: string) => void;
}) {
  const navigate = useNavigate();
  const vehicle = useVehicle(space?.plate);
  const camera = useCamera(space?.cameraId);
  const world = useWorld();
  const { operator, toast } = useSession();

  if (!space) return null;
  const occupied = space.status === 'occupied';
  const siblings = camera?.spaceIds.map((id) => world.spaces[id]) ?? [];

  const override = () => {
    const next = occupied ? 'vacant' : 'occupied';
    const result = simulation.overrideSpace(space.id, next, `${operator.name} (${operator.id})`);
    toast({
      title: result.ok ? 'Bay state overridden' : 'Override rejected',
      description: result.message,
      variant: result.ok ? 'warning' : 'danger',
    });
  };

  return (
    <SidePanel open={Boolean(space)} onOpenChange={(o) => !o && onClose()}>
      <SidePanelContent width="470px">
        <SidePanelHeader
          title={space.code}
          subtitle={`${camera?.name ?? space.cameraId} · ${space.zoneId}`}
          badge={
            <Badge tone={occupied ? 'danger' : 'success'}>{occupied ? 'OCCUPIED' : 'VACANT'}</Badge>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-4">
            <CameraFeed
              seed={Number(space.code.replace(/\D/g, '')) || 3}
              state={camera?.health === 'offline' ? 'offline' : 'live'}
              label={space.cameraId}
              plate={space.plate}
              className="w-full"
            />
          </div>

          <div className="px-4 pb-4">
            <DefList
              items={[
                { label: 'Bay', value: <span className="font-mono">{space.code}</span> },
                { label: 'Class', value: <span className="capitalize">{space.bayClass}</span> },
                { label: 'Vehicle type', value: <span className="capitalize">{space.vehicleClass}</span> },
                { label: 'Floor', value: space.floorId },
                {
                  label: occupied ? 'Occupied for' : 'Vacant for',
                  value: <span className="tnum">{duration(Date.now() - space.since)}</span>,
                },
                { label: 'Since', value: <span className="tnum">{fmtTime(space.since)}</span> },
              ]}
            />
          </div>

          <Separator />

          {occupied && vehicle ? (
            <div className="p-4">
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
                Occupying vehicle
              </h4>
              <div className="flex items-center gap-3">
                <PlateTag plate={vehicle.plate} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{vehicle.ownerName}</p>
                  <p className="truncate text-[11.5px] text-subtle">
                    {vehicle.ownerType === 'employee' ? vehicle.department : vehicle.company} ·{' '}
                    {vehicle.make} · {vehicle.colour}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <DefList
                  items={[
                    { label: 'Owner type', value: <span className="capitalize">{vehicle.ownerType}</span> },
                    { label: 'Phone', value: vehicle.phone ?? '—' },
                    {
                      label: 'Entry time',
                      value: <span className="tnum">{vehicle.entryTime ? fmtDateTime(vehicle.entryTime) : '—'}</span>,
                    },
                    { label: 'Payment', value: <span className="capitalize">{vehicle.paymentStatus}</span> },
                  ]}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => navigate(`/search?plate=${vehicle.plate}`)}
              >
                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                Open full vehicle record
              </Button>
            </div>
          ) : (
            <div className="p-4">
              <div className="rounded-xl border border-vacant/25 bg-vacant/[0.06] px-4 py-5 text-center">
                <p className="text-[12.5px] font-medium text-vacant">Bay is vacant</p>
                <p className="mt-1 text-[11.5px] text-subtle">
                  Free for {duration(Date.now() - space.since)} · ready for assignment
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="p-4">
            <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
              Camera coverage — {camera?.id}
            </h4>
            <p className="mb-3 text-[11.5px] leading-relaxed text-subtle">
              This camera watches 6 bays, 3 on each side of the aisle. It reports red only when every
              one of them is occupied.
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {siblings.map((s) => (
                <Tooltip key={s.id} content={`${s.code} — ${s.status}`}>
                  <div
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md border text-[9px] font-medium',
                      s.status === 'occupied'
                        ? 'border-occupied/40 bg-occupied/15 text-occupied'
                        : 'border-vacant/40 bg-vacant/15 text-vacant',
                      s.id === space.id && 'ring-2 ring-primary ring-offset-1 ring-offset-surface',
                    )}
                  >
                    {s.code.split('-').pop()}
                  </div>
                </Tooltip>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <StatusPill tone={camera?.coverageStatus === 'red' ? 'danger' : 'success'}>
                {camera?.coverageStatus === 'red' ? 'All bays occupied' : `${camera?.occupiedCount ?? 0}/6 occupied`}
              </StatusPill>
              {onOpenCamera && camera && (
                <Button variant="ghost" size="xs" onClick={() => onOpenCamera(camera.id)}>
                  <Cctv className="h-3.5 w-3.5" />
                  Open camera
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={override}>
            <RotateCcw className="h-3.5 w-3.5" />
            Force {occupied ? 'vacant' : 'occupied'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}

/* ---------------------------------------------------- Camera detail panel */

export function CameraDetailPanel({
  camera,
  onClose,
}: {
  camera: Camera | null;
  onClose: () => void;
}) {
  const world = useWorld();
  const { operator, toast } = useSession();
  const [mode, setMode] = useState<'live' | 'playback'>('live');
  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(72);

  if (!camera) return null;
  const offline = camera.health === 'offline';
  const bays = camera.spaceIds.map((id) => world.spaces[id]).filter(Boolean);

  return (
    <SidePanel open={Boolean(camera)} onOpenChange={(o) => !o && onClose()}>
      <SidePanelContent width="560px">
        <SidePanelHeader
          title={camera.id}
          subtitle={camera.name}
          badge={
            <Badge tone={offline ? 'danger' : camera.health === 'degraded' ? 'warning' : 'success'}>
              {camera.health.toUpperCase()}
            </Badge>
          }
          actions={
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                toast({
                  title: 'Recording queued for download',
                  description: `${camera.id} · last 15 minutes · H.264 1080p`,
                  variant: 'info',
                })
              }
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative p-4">
            <CameraFeed
              seed={Number(camera.id.replace(/\D/g, '') || 11)}
              state={offline ? 'offline' : mode === 'playback' && !playing ? 'snapshot' : 'live'}
              label={`${camera.id} · ${mode === 'live' ? 'LIVE' : 'PLAYBACK'}`}
              lane={camera.role === 'lane'}
              className="w-full"
            />

            {/* PTZ + zoom overlay, only where the hardware supports it */}
            {camera.ptz && !offline && (
              <div className="absolute right-7 top-7 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/50 p-1 backdrop-blur">
                {[
                  { icon: Move, label: 'Pan / tilt' },
                  { icon: ZoomIn, label: 'Zoom in' },
                  { icon: ZoomOut, label: 'Zoom out' },
                ].map(({ icon: Icon, label }) => (
                  <Tooltip key={label} content={label} side="left">
                    <button
                      onClick={() => toast({ title: `${label} sent to ${camera.id}`, variant: 'info' })}
                      className="rounded p-1.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>

          {/* transport */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-inset px-3 py-2">
              <Button variant="ghost" size="icon-sm" onClick={() => setMode('playback')} aria-label="Rewind">
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setMode('live')} aria-label="Jump to live">
                <SkipForward className="h-3.5 w-3.5" />
              </Button>

              <div className="relative mx-2 h-1.5 flex-1 rounded-full bg-border">
                <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${position}%` }} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={position}
                  onChange={(e) => {
                    setPosition(Number(e.target.value));
                    setMode('playback');
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Playback position"
                />
                <span
                  className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-surface"
                  style={{ left: `${position}%` }}
                />
              </div>

              <span className="tnum shrink-0 text-[10.5px] text-subtle">
                {mode === 'live' ? 'LIVE' : `-${Math.round((100 - position) * 0.6)}m`}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Audio">
                <Volume2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Fullscreen">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast({ title: 'Snapshot captured', description: `${camera.id} · ${fmtTime(Date.now())}`, variant: 'success' })}
              >
                <CameraIcon className="h-3.5 w-3.5" />
                Snapshot
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast({ title: 'Clip export started', description: 'You will be notified when it is ready.', variant: 'info' })}
              >
                <Download className="h-3.5 w-3.5" />
                Export clip
              </Button>
              <Button
                variant={offline ? 'success' : 'outline'}
                size="sm"
                onClick={() => {
                  const r = simulation.toggleCamera(camera.id, `${operator.name} (${operator.id})`);
                  toast({ title: r.message, variant: offline ? 'success' : 'warning' });
                }}
              >
                {offline ? 'Restore camera' : 'Take offline'}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="p-4">
            <DefList
              columns={2}
              items={[
                { label: 'Role', value: <span className="capitalize">{camera.role}</span> },
                { label: 'Resolution', value: camera.resolution },
                { label: 'Frame rate', value: `${camera.fps} fps` },
                { label: 'IP address', value: <span className="font-mono">{camera.ipAddress}</span> },
                { label: 'Floor', value: camera.floorId },
                { label: 'PTZ', value: camera.ptz ? 'Supported' : 'Fixed' },
                {
                  label: 'Last heartbeat',
                  value: <span className="tnum">{fmtTime(camera.lastHeartbeat)}</span>,
                },
                { label: 'Recording', value: camera.recording ? 'Active' : 'Stopped' },
              ]}
            />

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-subtle">
                  <HardDrive className="h-3 w-3" />
                  NVR channel storage
                </span>
                <span className="tnum font-medium text-foreground">{camera.storagePct}%</span>
              </div>
              <Meter value={camera.storagePct} tone={camera.storagePct > 85 ? 'warning' : 'primary'} />
            </div>
          </div>

          {camera.role === 'bay' && (
            <>
              <Separator />
              <div className="p-4">
                <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
                  Monitored bays ({bays.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {bays.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'rounded-lg border px-2.5 py-2',
                        s.status === 'occupied'
                          ? 'border-occupied/35 bg-occupied/10'
                          : 'border-vacant/35 bg-vacant/10',
                      )}
                    >
                      <p className="font-mono text-[11px] font-semibold text-foreground">{s.code}</p>
                      <p
                        className={cn(
                          'mt-0.5 text-[10px] capitalize',
                          s.status === 'occupied' ? 'text-occupied' : 'text-vacant',
                        )}
                      >
                        {s.status}
                      </p>
                      {s.plate && <p className="mt-1 truncate font-mono text-[9.5px] text-subtle">{s.plate}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="p-4">
            <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
              Recent events
            </h4>
            <Timeline
              items={world.events
                .filter((e) => e.cameraId === camera.id || e.detail.includes(camera.id))
                .slice(0, 6)
                .map((e) => ({
                  id: e.id,
                  title: e.title,
                  detail: e.detail,
                  ts: e.ts,
                  tone: e.type === 'camera_offline' ? 'danger' : e.type === 'camera_restored' ? 'success' : 'neutral',
                  icon: e.type === 'recognition_failed' ? ScanLine : Clock,
                }))}
            />
          </div>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}

export function StorageSummary({ cameras }: { cameras: Camera[] }) {
  const avg = cameras.length ? cameras.reduce((s, c) => s + c.storagePct, 0) / cameras.length : 0;
  const recording = cameras.filter((c) => c.recording).length;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-subtle">
      <span className="tnum">
        <span className="font-medium text-foreground">{num(recording)}</span> of {num(cameras.length)} recording
      </span>
      <span className="tnum">
        NVR average <span className="font-medium text-foreground">{avg.toFixed(0)}%</span>
      </span>
    </div>
  );
}
