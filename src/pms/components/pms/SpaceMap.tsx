/**
 * The 2D plaza map.
 *
 * Geometry mirrors the physical site: bays are grouped into camera modules of
 * six — three on each side of an aisle — and the camera sits in the aisle
 * between them, carrying its own red/green coverage state. That grouping is
 * the whole reason the map is more useful than a flat grid: an operator can see
 * at a glance which camera has run out of free bays.
 *
 * Filters dim rather than remove, so the plaza never changes shape underfoot.
 */

import { Accessibility, Bike, Cctv, Star, Zap } from 'lucide-react';
import { memo, useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { Camera, CameraModule, ParkingSpace, Zone } from '../../data/types';
import { Tooltip } from '../ui/overlay';

export interface MapFilters {
  vehicleClasses: Array<'car' | 'motorcycle'>;
  statuses: Array<'vacant' | 'occupied'>;
  query: string;
}

const BAY_ICON = {
  ev: Zap,
  accessible: Accessibility,
  reserved: Star,
  standard: null,
} as const;

function matches(space: ParkingSpace, filters: MapFilters) {
  if (!filters.vehicleClasses.includes(space.vehicleClass)) return false;
  if (!filters.statuses.includes(space.status)) return false;
  if (filters.query) {
    const q = filters.query.trim().toUpperCase();
    if (q && !space.code.includes(q) && !(space.plate ?? '').includes(q)) return false;
  }
  return true;
}

/* ---------------------------------------------------------------- SpaceTile */

export const SpaceTile = memo(function SpaceTile({
  space,
  dimmed,
  selected,
  onSelect,
  size = 26,
}: {
  space: ParkingSpace;
  dimmed?: boolean;
  selected?: boolean;
  onSelect?: (space: ParkingSpace) => void;
  size?: number;
}) {
  const occupied = space.status === 'occupied';
  const Icon = BAY_ICON[space.bayClass];

  return (
    <Tooltip
      delay={120}
      content={
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] font-semibold text-foreground">{space.code}</span>
          <span className={occupied ? 'text-occupied' : 'text-vacant'}>
            {occupied ? 'Occupied' : 'Vacant'}
            {space.plate ? ` · ${space.plate}` : ''}
          </span>
          <span className="text-subtle">
            {space.bayClass !== 'standard' ? `${space.bayClass} bay · ` : ''}
            {space.cameraId}
          </span>
        </div>
      }
    >
      <button
        onClick={() => onSelect?.(space)}
        aria-label={`Bay ${space.code}, ${space.status}`}
        aria-pressed={selected}
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-[4px] border transition-all duration-200',
          'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
          occupied
            ? 'border-occupied/45 bg-occupied/18 hover:bg-occupied/30'
            : 'border-vacant/45 bg-vacant/16 hover:bg-vacant/28',
          dimmed && 'opacity-[0.16] saturate-0',
          selected && 'ring-2 ring-primary ring-offset-1 ring-offset-surface',
        )}
        style={{ width: size, height: size * 1.32 }}
      >
        {Icon && (
          <Icon
            className={cn('h-3 w-3', occupied ? 'text-occupied' : 'text-vacant')}
            strokeWidth={2.4}
          />
        )}
        {!Icon && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full', occupied ? 'bg-occupied' : 'bg-vacant')}
          />
        )}
      </button>
    </Tooltip>
  );
});

/* --------------------------------------------------------- CameraModuleBlock */

export const CameraModuleBlock = memo(function CameraModuleBlock({
  camera,
  spaces,
  filters,
  selectedId,
  onSelectSpace,
  onSelectCamera,
  tileSize,
}: {
  camera?: Camera;
  spaces: ParkingSpace[];
  filters: MapFilters;
  selectedId?: string;
  onSelectSpace?: (space: ParkingSpace) => void;
  onSelectCamera?: (camera: Camera) => void;
  tileSize: number;
}) {
  const north = spaces.filter((s) => s.side === 'north');
  const south = spaces.filter((s) => s.side === 'south');
  const red = camera?.coverageStatus === 'red';
  const unknown = camera?.coverageStatus === 'unknown';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors',
        red ? 'border-occupied/35 bg-occupied/[0.05]' : 'border-border-subtle bg-surface-inset/40',
        unknown && 'border-dashed border-offline/50 bg-offline/[0.04]',
      )}
    >
      <div className="flex gap-1">
        {north.map((s) => (
          <SpaceTile
            key={s.id}
            space={s}
            size={tileSize}
            dimmed={!matches(s, filters)}
            selected={selectedId === s.id}
            onSelect={onSelectSpace}
          />
        ))}
      </div>

      {/* the aisle, with the camera watching both rows */}
      <Tooltip
        delay={120}
        content={
          camera ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{camera.id}</span>
              <span className="text-subtle">{camera.name}</span>
              <span className={red ? 'text-occupied' : unknown ? 'text-muted' : 'text-vacant'}>
                {unknown
                  ? 'Coverage unknown — camera offline'
                  : red
                    ? 'All 6 monitored bays occupied'
                    : `${camera.occupiedCount}/6 occupied — bays available`}
              </span>
            </div>
          ) : null
        }
      >
        <button
          onClick={() => camera && onSelectCamera?.(camera)}
          aria-label={camera ? `Camera ${camera.id}` : 'Camera'}
          className={cn(
            'flex w-full items-center justify-center gap-1 rounded-[3px] py-0.5 transition-colors',
            'outline-none focus-visible:ring-2 focus-visible:ring-primary',
            red ? 'bg-occupied/15' : unknown ? 'bg-offline/15' : 'bg-vacant/10',
          )}
        >
          <Cctv
            className={cn('h-2.5 w-2.5', red ? 'text-occupied' : unknown ? 'text-offline' : 'text-vacant')}
            strokeWidth={2.2}
          />
          <span
            className={cn(
              'h-1 w-1 rounded-full',
              red ? 'bg-occupied' : unknown ? 'bg-offline' : 'bg-vacant',
              red && 'animate-[pulse-ring_2.4s_ease-in-out_infinite]',
            )}
          />
        </button>
      </Tooltip>

      <div className="flex gap-1">
        {south.map((s) => (
          <SpaceTile
            key={s.id}
            space={s}
            size={tileSize}
            dimmed={!matches(s, filters)}
            selected={selectedId === s.id}
            onSelect={onSelectSpace}
          />
        ))}
      </div>
    </div>
  );
});

/* --------------------------------------------------------------- ZoneBlock */

export function ZoneBlock({
  zone,
  modules,
  spaces,
  cameras,
  filters,
  selectedId,
  onSelectSpace,
  onSelectCamera,
  tileSize,
}: {
  zone: Zone;
  modules: CameraModule[];
  spaces: Record<string, ParkingSpace>;
  cameras: Record<string, Camera>;
  filters: MapFilters;
  selectedId?: string;
  onSelectSpace?: (space: ParkingSpace) => void;
  onSelectCamera?: (camera: Camera) => void;
  tileSize: number;
}) {
  const stats = useMemo(() => {
    let occupied = 0;
    let total = 0;
    let redCams = 0;
    for (const m of modules) {
      let mo = 0;
      for (const id of m.spaceIds) {
        total++;
        if (spaces[id]?.status === 'occupied') {
          occupied++;
          mo++;
        }
      }
      if (mo === m.spaceIds.length) redCams++;
    }
    return { occupied, total, redCams, pct: total ? (occupied / total) * 100 : 0 };
  }, [modules, spaces]);

  const isMoto = zone.vehicleClass === 'motorcycle';

  return (
    <section
      className={cn(
        'rounded-xl border bg-surface/60 p-3',
        isMoto ? 'border-info/25 bg-info-dim/20' : 'border-border',
      )}
    >
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isMoto && <Bike className="h-3.5 w-3.5 text-info" />}
          <h4 className="text-[12px] font-semibold tracking-[-0.01em] text-foreground">{zone.name}</h4>
          <span className="tnum rounded bg-surface-inset px-1.5 py-0.5 text-[10px] text-subtle">
            {stats.occupied}/{stats.total}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10.5px]">
          {stats.redCams > 0 && (
            <span className="flex items-center gap-1 text-occupied">
              <Cctv className="h-3 w-3" />
              {stats.redCams} full
            </span>
          )}
          <span className="tnum text-subtle">{stats.pct.toFixed(0)}% occupied</span>
        </div>
      </header>

      {/* Modules keep their true width and wrap — stretching them to fill the
          row would break the physical read of the aisle. */}
      <div className="flex flex-wrap gap-2">
        {modules.map((m) => (
          <CameraModuleBlock
            key={m.id}
            camera={cameras[m.cameraId]}
            spaces={m.spaceIds.map((id) => spaces[id])}
            filters={filters}
            selectedId={selectedId}
            onSelectSpace={onSelectSpace}
            onSelectCamera={onSelectCamera}
            tileSize={tileSize}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Legend */

export function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-subtle', className)}>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2 rounded-[2px] border border-vacant/50 bg-vacant/20" />
        Vacant
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2 rounded-[2px] border border-occupied/50 bg-occupied/20" />
        Occupied
      </span>
      <span className="flex items-center gap-1.5">
        <Cctv className="h-3 w-3 text-vacant" />
        Camera — bays available
      </span>
      <span className="flex items-center gap-1.5">
        <Cctv className="h-3 w-3 text-occupied" />
        Camera — all 6 occupied
      </span>
      <span className="flex items-center gap-1.5">
        <Zap className="h-3 w-3" /> EV
      </span>
      <span className="flex items-center gap-1.5">
        <Accessibility className="h-3 w-3" /> Accessible
      </span>
      <span className="flex items-center gap-1.5">
        <Star className="h-3 w-3" /> Reserved
      </span>
    </div>
  );
}
