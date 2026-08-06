/**
 * Parking Plaza — the heart of the module.
 *
 * Three views over the same live data: a 2D map that mirrors the physical
 * geometry, a grouped list for scanning, and a table for filtering and export.
 * Floor, filters and selection survive switching between them, and they are all
 * reflected in the URL so a supervisor can send someone straight to a bay.
 */

import {
  Bike, Car, Cctv, CircleParking, Download, LayoutGrid, List, RefreshCw,
  Table2, TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn, downloadBlob, duration, num, pct } from '../lib/utils';
import { PageFull, Toolbar } from '../components/ui/page';
import { Card } from '../components/ui/card';
import { Badge, Button, Meter, StatusPill } from '../components/ui/primitives';
import { FilterChips, Segmented } from '../components/ui/tabs';
import { SearchInput } from '../components/ui/form';
import { DataTable, EmptyState, type Column } from '../components/ui/data';
import { MapLegend, ZoneBlock } from '../components/pms/SpaceMap';
import { CameraDetailPanel, SpaceDetailPanel } from '../components/pms/panels';
import { DwellChip } from '../components/pms/cards';
import { PlateTag } from '../components/pms/atoms';
import { useWorld } from '../store/live';
import { useSession } from '../store/session';
import type { Camera, FloorId, ParkingSpace } from '../data/types';

type ViewMode = '2d' | 'list' | 'table';

const FLOOR_ORDER: FloorId[] = ['ground', 'first', 'second', 'rooftop'];

export default function Plaza() {
  const world = useWorld();
  const { toast } = useSession();
  const [params, setParams] = useSearchParams();

  const [view, setView] = useState<ViewMode>('2d');
  const [floorId, setFloorId] = useState<FloorId>((params.get('floor') as FloorId) || 'ground');
  const [classes, setClasses] = useState<Array<'car' | 'motorcycle'>>(() => {
    const c = params.get('class');
    return c === 'motorcycle' ? ['motorcycle'] : c === 'car' ? ['car'] : ['car', 'motorcycle'];
  });
  const [statuses, setStatuses] = useState<Array<'vacant' | 'occupied'>>(() => {
    const s = params.get('status');
    return s === 'vacant' ? ['vacant'] : s === 'occupied' ? ['occupied'] : ['vacant', 'occupied'];
  });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ParkingSpace | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [tileSize, setTileSize] = useState(24);

  // Keep the floor in the URL so a bay can be linked to directly.
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('floor', floorId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  // 1 / 2 / 3 switch view; F cycles floors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '1') setView('2d');
      if (e.key === '2') setView('list');
      if (e.key === '3') setView('table');
      if (e.key.toLowerCase() === 'f') {
        setFloorId((f) => FLOOR_ORDER[(FLOOR_ORDER.indexOf(f) + 1) % FLOOR_ORDER.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const floor = world.floors.find((f) => f.id === floorId)!;
  const zones = floor.zoneIds.map((id) => world.zones[id]);

  const floorSpaces = useMemo(
    () => world.spaceIdsByFloor[floorId].map((id) => world.spaces[id]),
    [world, floorId],
  );

  const stats = useMemo(() => {
    let occupied = 0;
    let cars = 0;
    let motos = 0;
    let motoOccupied = 0;
    for (const s of floorSpaces) {
      if (s.vehicleClass === 'car') cars++;
      else motos++;
      if (s.status === 'occupied') {
        occupied++;
        if (s.vehicleClass === 'motorcycle') motoOccupied++;
      }
    }
    return {
      occupied,
      cars,
      motos,
      motoOccupied,
      total: floorSpaces.length,
      pct: floorSpaces.length ? (occupied / floorSpaces.length) * 100 : 0,
    };
  }, [floorSpaces]);

  const filters = { vehicleClasses: classes, statuses, query };

  const filtered = useMemo(
    () =>
      floorSpaces.filter((s) => {
        if (!classes.includes(s.vehicleClass)) return false;
        if (!statuses.includes(s.status)) return false;
        if (query) {
          const q = query.trim().toUpperCase();
          if (!s.code.includes(q) && !(s.plate ?? '').includes(q)) return false;
        }
        return true;
      }),
    [floorSpaces, classes, statuses, query],
  );

  const counts = useMemo(() => {
    let vacant = 0;
    let occupied = 0;
    let cars = 0;
    let motos = 0;
    for (const s of floorSpaces) {
      if (s.status === 'vacant') vacant++;
      else occupied++;
      if (s.vehicleClass === 'car') cars++;
      else motos++;
    }
    return { vacant, occupied, cars, motos };
  }, [floorSpaces]);

  const exportCsv = () => {
    const header = 'bay,floor,zone,type,class,status,plate,since_minutes,camera\n';
    const body = filtered
      .map((s) =>
        [
          s.code, s.floorId, s.zoneId, s.vehicleClass, s.bayClass, s.status,
          s.plate ?? '', Math.round((Date.now() - s.since) / 60000), s.cameraId,
        ].join(','),
      )
      .join('\n');
    downloadBlob(new Blob([header + body], { type: 'text/csv' }), `plaza-${floorId}-${Date.now()}.csv`);
    toast({ title: 'Export ready', description: `${filtered.length} bays written to CSV`, variant: 'success' });
  };

  const columns: Column<ParkingSpace>[] = [
    {
      key: 'code', header: 'Bay', width: '110px',
      cell: (s) => <span className="font-mono text-[12px] font-medium text-foreground">{s.code}</span>,
      sortValue: (s) => s.code,
    },
    {
      key: 'status', header: 'Status', width: '110px',
      cell: (s) => (
        <Badge tone={s.status === 'occupied' ? 'danger' : 'success'} size="sm">
          {s.status.toUpperCase()}
        </Badge>
      ),
      sortValue: (s) => s.status,
    },
    {
      key: 'plate', header: 'Plate', width: '120px',
      cell: (s) => (s.plate ? <PlateTag plate={s.plate} size="sm" /> : <span className="text-disabled">—</span>),
      sortValue: (s) => s.plate ?? '',
    },
    {
      key: 'class', header: 'Type', width: '110px', hideBelow: 'sm',
      cell: (s) => (
        <span className="inline-flex items-center gap-1.5 capitalize">
          {s.vehicleClass === 'car' ? <Car className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
          {s.vehicleClass}
        </span>
      ),
      sortValue: (s) => s.vehicleClass,
    },
    {
      key: 'bay', header: 'Bay class', width: '110px', hideBelow: 'lg',
      cell: (s) => <span className="capitalize">{s.bayClass}</span>,
      sortValue: (s) => s.bayClass,
    },
    {
      key: 'zone', header: 'Zone', width: '110px', hideBelow: 'md',
      cell: (s) => world.zones[s.zoneId]?.name ?? s.zoneId,
      sortValue: (s) => s.zoneId,
    },
    {
      key: 'dwell', header: 'Duration', width: '100px', align: 'right',
      cell: (s) => <DwellChip since={s.since} />,
      sortValue: (s) => s.since,
    },
    {
      key: 'camera', header: 'Camera', width: '120px', hideBelow: 'xl',
      cell: (s) => {
        const cam = world.cameras[s.cameraId];
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCamera(cam);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted transition-colors hover:text-primary"
          >
            <Cctv
              className={cn(
                'h-3 w-3',
                cam?.coverageStatus === 'red' ? 'text-occupied' : 'text-vacant',
              )}
            />
            {s.cameraId}
          </button>
        );
      },
      sortValue: (s) => s.cameraId,
    },
  ];

  return (
    <PageFull>
      {/* ------------------------------------------------------ floor rail */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {world.floors.map((f) => {
          const ids = world.spaceIdsByFloor[f.id];
          let occ = 0;
          for (const id of ids) if (world.spaces[id].status === 'occupied') occ++;
          const p = (occ / ids.length) * 100;
          const active = f.id === floorId;
          return (
            <button
              key={f.id}
              onClick={() => setFloorId(f.id)}
              className={cn(
                'edge-light group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200',
                active
                  ? 'border-primary/50 bg-primary-muted shadow-[var(--shadow-md)]'
                  : 'border-border bg-surface hover:border-border-strong hover:bg-surface-raised',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">{f.name}</p>
                  <p className="tnum mt-0.5 text-[10.5px] text-subtle">
                    {num(ids.length - occ)} free · {num(ids.length)} bays
                  </p>
                </div>
                <span className="tnum text-[17px] font-semibold tracking-[-0.03em] text-foreground">
                  {p.toFixed(0)}%
                </span>
              </div>
              <Meter
                className="mt-2.5"
                value={p}
                tone={p >= 95 ? 'danger' : p >= 80 ? 'warning' : 'success'}
                height={4}
              />
            </button>
          );
        })}
      </div>

      {/* -------------------------------------------------------- toolbar */}
      <Toolbar className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: '2d', label: '2D Map', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5" /> },
            { value: 'table', label: 'Table', icon: <Table2 className="h-3.5 w-3.5" /> },
          ]}
        />

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Bay code or plate…"
          size="sm"
          className="w-[190px]"
        />

        <FilterChips
          values={classes}
          onChange={(v) => setClasses(v.length ? v : ['car', 'motorcycle'])}
          options={[
            { value: 'car', label: 'Cars', count: counts.cars },
            { value: 'motorcycle', label: 'Motorcycles', count: counts.motos },
          ]}
        />

        <FilterChips
          values={statuses}
          onChange={(v) => setStatuses(v.length ? v : ['vacant', 'occupied'])}
          options={[
            { value: 'vacant', label: 'Vacant', dot: 'var(--state-vacant)', count: counts.vacant },
            { value: 'occupied', label: 'Occupied', dot: 'var(--state-occupied)', count: counts.occupied },
          ]}
        />

        <div className="ml-auto flex items-center gap-2">
          {view === '2d' && (
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="text-[10.5px] text-subtle">Zoom</span>
              <input
                type="range"
                min={16}
                max={38}
                value={tileSize}
                onChange={(e) => setTileSize(Number(e.target.value))}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-border accent-[var(--primary)]"
                aria-label="Map zoom"
              />
            </div>
          )}
          <StatusPill tone={stats.pct >= 95 ? 'danger' : stats.pct >= 80 ? 'warning' : 'success'}>
            {filtered.length === floorSpaces.length
              ? `${num(stats.occupied)}/${num(stats.total)} occupied`
              : `${num(filtered.length)} matching`}
          </StatusPill>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </Toolbar>

      {/* ----------------------------------------------------------- views */}
      {view === '2d' && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
            <MapLegend />
            <p className="tnum text-[11px] text-subtle">
              {floor.name} · {num(stats.cars)} car bays · {num(stats.motos)} motorcycle bays ·{' '}
              {pct(stats.pct, 1)} occupied
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2 pr-1">
            {zones.map((zone) => (
              <ZoneBlock
                key={zone.id}
                zone={zone}
                modules={zone.moduleIds.map((id) => world.modules[id])}
                spaces={world.spaces}
                cameras={world.cameras}
                filters={filters}
                selectedId={selected?.id}
                onSelectSpace={setSelected}
                onSelectCamera={setCamera}
                tileSize={tileSize}
              />
            ))}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <Card className="p-0">
              <EmptyState
                title="No bays match these filters"
                description="Widen the filters or clear the search to see the rest of this floor."
                icon={<CircleParking className="h-5 w-5" />}
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setClasses(['car', 'motorcycle']);
                      setStatuses(['vacant', 'occupied']);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {zones.map((zone) => {
                const zoneSpaces = filtered.filter((s) => s.zoneId === zone.id);
                if (!zoneSpaces.length) return null;
                return (
                  <Card key={zone.id} className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
                      <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
                        {zone.vehicleClass === 'motorcycle' ? (
                          <Bike className="h-3.5 w-3.5 text-info" />
                        ) : (
                          <Car className="h-3.5 w-3.5 text-subtle" />
                        )}
                        {zone.name}
                      </h3>
                      <span className="tnum text-[11px] text-subtle">{zoneSpaces.length} bays</span>
                    </div>
                    <ul className="divide-y divide-border-subtle">
                      {zoneSpaces.map((s) => (
                        <li
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-raised"
                        >
                          <span
                            className={cn(
                              'h-6 w-1 shrink-0 rounded-full',
                              s.status === 'occupied' ? 'bg-occupied' : 'bg-vacant',
                            )}
                          />
                          <span className="w-[92px] shrink-0 font-mono text-[12px] font-medium text-foreground">
                            {s.code}
                          </span>
                          <Badge tone={s.status === 'occupied' ? 'danger' : 'success'} size="sm">
                            {s.status}
                          </Badge>
                          {s.plate ? (
                            <PlateTag plate={s.plate} size="sm" />
                          ) : (
                            <span className="text-[11.5px] text-disabled">no vehicle</span>
                          )}
                          {s.bayClass !== 'standard' && (
                            <Badge tone="outline" size="sm">
                              {s.bayClass}
                            </Badge>
                          )}
                          <span className="ml-auto flex items-center gap-3">
                            <DwellChip since={s.since} />
                            <span className="hidden font-mono text-[10.5px] text-subtle sm:inline">{s.cameraId}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'table' && (
        <Card className="min-h-0 flex-1 overflow-hidden">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(s) => s.id}
            onRowClick={setSelected}
            selectedKey={selected?.id}
            pageSize={50}
            emptyTitle="No bays match these filters"
            emptyDescription="Adjust the class, status or search filters above."
            className="h-full"
          />
        </Card>
      )}

      {/* Capacity warning stays visible in every view. */}
      {stats.pct >= 95 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger-dim/50 px-3.5 py-2.5">
          <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />
          <p className="text-[12px] text-foreground">
            <span className="font-semibold">{floor.name} is at {pct(stats.pct, 1)}.</span>{' '}
            <span className="text-muted">
              {stats.total - stats.occupied} bays remain — consider diverting arrivals to a higher level.
            </span>
          </p>
          <span className="tnum ml-auto text-[11px] text-subtle">
            avg dwell {duration(
              floorSpaces
                .filter((s) => s.status === 'occupied')
                .reduce((acc, s, _, arr) => acc + (Date.now() - s.since) / arr.length, 0),
            )}
          </span>
        </div>
      )}

      <SpaceDetailPanel
        space={selected}
        onClose={() => setSelected(null)}
        onOpenCamera={(id) => {
          setSelected(null);
          setCamera(world.cameras[id]);
        }}
      />
      <CameraDetailPanel camera={camera} onClose={() => setCamera(null)} />
    </PageFull>
  );
}
