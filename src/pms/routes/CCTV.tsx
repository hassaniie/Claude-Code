/**
 * CCTV wall.
 *
 * A camera wall that stays usable at 168 channels: floor and health filters,
 * a density control, and pagination so the browser is never asked to decode
 * everything at once. Selecting a tile opens the full player beside the wall.
 */

import {
  Cctv, ChevronLeft, ChevronRight, Grid2x2, Grid3x3, HardDrive, LayoutGrid,
  RefreshCw, Search, Video, VideoOff,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, num } from '../lib/utils';
import { PageFull, Toolbar } from '../components/ui/page';
import { Card } from '../components/ui/card';
import { Badge, Button, Meter, StatusPill } from '../components/ui/primitives';
import { SearchInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/form';
import { EmptyState } from '../components/ui/data';
import { Segmented } from '../components/ui/tabs';
import { StatTile } from '../components/pms/atoms';
import { CameraCard } from '../components/pms/cards';
import { CameraDetailPanel } from '../components/pms/panels';
import { useCameras, useKpis, simulation } from '../store/live';
import { useSession } from '../store/session';
import type { Camera, FloorId } from '../data/types';

type Density = '3' | '4' | '6';
type HealthFilter = 'all' | 'online' | 'offline' | 'degraded' | 'red';

const PAGE_SIZE: Record<Density, number> = { '3': 9, '4': 16, '6': 24 };

export default function CCTV() {
  const cameras = useCameras('all');
  const kpis = useKpis();
  const { operator, toast } = useSession();

  const [floor, setFloor] = useState<FloorId | 'all' | 'perimeter'>('all');
  const [health, setHealth] = useState<HealthFilter>('all');
  const [query, setQuery] = useState('');
  const [density, setDensity] = useState<Density>('4');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Camera | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return cameras.filter((c) => {
      if (floor === 'perimeter' ? c.zoneId !== 'perimeter' : floor !== 'all' && (c.floorId !== floor || c.zoneId === 'perimeter'))
        return false;
      if (health === 'red' && c.coverageStatus !== 'red') return false;
      if (health !== 'all' && health !== 'red' && c.health !== health) return false;
      if (q && !c.id.includes(q) && !c.name.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [cameras, floor, health, query]);

  const pageSize = PAGE_SIZE[density];
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const storageAvg = cameras.length
    ? cameras.reduce((s, c) => s + c.storagePct, 0) / cameras.length
    : 0;
  const recording = cameras.filter((c) => c.recording).length;

  return (
    <PageFull>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <StatTile label="Cameras" value={num(cameras.length)} icon={Cctv} caption="across 4 levels + perimeter" />
        <StatTile label="Recording" value={num(recording)} icon={Video} tone="success" />
        <StatTile
          label="Offline"
          value={num(kpis.offlineCameras)}
          icon={VideoOff}
          tone={kpis.offlineCameras ? 'danger' : 'success'}
        />
        <StatTile
          label="At Capacity"
          value={num(kpis.redCameras)}
          icon={Cctv}
          tone={kpis.redCameras > 20 ? 'warning' : 'neutral'}
          caption="all 6 bays occupied"
        />
        <StatTile
          label="NVR Storage"
          value={storageAvg.toFixed(0)}
          unit="%"
          icon={HardDrive}
          tone={storageAvg > 85 ? 'warning' : 'neutral'}
          caption="average across channels"
        />
      </div>

      <Toolbar className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Camera ID or name…" size="sm" className="w-[200px]" />

        <Select value={floor} onValueChange={(v) => { setFloor(v as typeof floor); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            <SelectItem value="ground">Ground Floor</SelectItem>
            <SelectItem value="first">First Floor</SelectItem>
            <SelectItem value="second">Second Floor</SelectItem>
            <SelectItem value="rooftop">Rooftop</SelectItem>
            <SelectItem value="perimeter">Lanes &amp; perimeter</SelectItem>
          </SelectContent>
        </Select>

        <Select value={health} onValueChange={(v) => { setHealth(v as HealthFilter); setPage(0); }}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All health states</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="red">Coverage full (red)</SelectItem>
          </SelectContent>
        </Select>

        <Segmented
          size="sm"
          value={density}
          onChange={(v) => { setDensity(v); setPage(0); }}
          options={[
            { value: '3', label: '', icon: <Grid2x2 className="h-3.5 w-3.5" /> },
            { value: '4', label: '', icon: <Grid3x3 className="h-3.5 w-3.5" /> },
            { value: '6', label: '', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
          ]}
        />

        <StatusPill tone={kpis.offlineCameras ? 'danger' : 'success'} pulse={Boolean(kpis.offlineCameras)}>
          {num(filtered.length)} shown
        </StatusPill>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({ title: 'Health sweep started', description: 'Polling all NVR channels for heartbeats.', variant: 'info' })
            }
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Health sweep
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="tnum px-1 text-[11.5px] text-muted">
              {current + 1} / {pageCount}
            </span>
            <Button variant="ghost" size="icon-sm" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Toolbar>

      {kpis.offlineCameras > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger-dim/40 px-3.5 py-2.5">
          <VideoOff className="h-4 w-4 shrink-0 text-danger" />
          <p className="text-[12px] text-foreground">
            <span className="font-semibold">{kpis.offlineCameras} camera{kpis.offlineCameras > 1 ? 's are' : ' is'} offline.</span>{' '}
            <span className="text-muted">Bays they monitor report coverage as unknown until the feed returns.</span>
          </p>
          <Button
            size="xs"
            variant="secondary"
            className="ml-auto"
            onClick={() => { setHealth('offline'); setPage(0); }}
          >
            Show offline only
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No cameras match these filters"
              description="Try a different floor or health state, or clear the search."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setQuery(''); setFloor('all'); setHealth('all'); }}
                >
                  Reset filters
                </Button>
              }
            />
          </Card>
        ) : (
          <div
            className={cn(
              'grid gap-3',
              density === '3' && 'sm:grid-cols-2 lg:grid-cols-3',
              density === '4' && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              density === '6' && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6',
            )}
          >
            {visible.map((c) => (
              <CameraCard
                key={c.id}
                camera={c}
                onOpen={setSelected}
                onToggle={(cam) => {
                  const r = simulation.toggleCamera(cam.id, `${operator.name} (${operator.id})`);
                  toast({ title: r.message, variant: cam.health === 'offline' ? 'success' : 'warning' });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11.5px] text-subtle">
            <HardDrive className="h-3.5 w-3.5" />
            NVR utilisation
          </span>
          <div className="w-40">
            <Meter value={storageAvg} tone={storageAvg > 85 ? 'warning' : 'primary'} />
          </div>
          <span className="tnum text-[11.5px] font-medium text-foreground">{storageAvg.toFixed(1)}%</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" size="sm">
            {cameras.filter((c) => c.health === 'online').length} online
          </Badge>
          <Badge tone="warning" size="sm">
            {cameras.filter((c) => c.health === 'degraded').length} degraded
          </Badge>
          <Badge tone="danger" size="sm">
            {cameras.filter((c) => c.health === 'offline').length} offline
          </Badge>
          <span className="text-[11px] text-subtle">Retention 30 days · H.264 · motion-triggered</span>
        </div>
      </div>

      <CameraDetailPanel camera={selected} onClose={() => setSelected(null)} />
    </PageFull>
  );
}
