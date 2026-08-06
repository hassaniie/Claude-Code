/**
 * Vehicle Search.
 *
 * Instant lookup by plate, owner or company, with the full visit record beside
 * the results — image, video, presence, payment, previous visits, and the
 * cameras that saw the vehicle. This is the screen security uses while someone
 * is standing at the desk, so it is optimised for one thing: typing three
 * characters and getting the answer.
 */

import {
  Building2, Car, Camera as CameraIcon, CircleParking, Clock, CreditCard,
  Download, History, LogIn, LogOut, MapPin, Phone, Play, ScanLine, Search,
  ShieldCheck, Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn, currency, duration, fmtDateTime } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader } from '../components/ui/card';
import { Badge, Button, Separator, Skeleton, StatusPill } from '../components/ui/primitives';
import { SearchInput } from '../components/ui/form';
import { DefList, EmptyState, ErrorState } from '../components/ui/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PlateTag } from '../components/pms/atoms';
import { CameraFeed } from '../components/pms/CameraFeed';
import { Timeline } from '../components/pms/feed';
import { parkingApi, type VehicleSearchResult } from '../data/api';
import { useAsync, useDebounced } from '../hooks/useAsync';
import { useWorldSelector, arrayEqual } from '../store/live';
import { useSession } from '../store/session';

export default function VehicleSearch() {
  const [params, setParams] = useSearchParams();
  const { toast } = useSession();
  const [query, setQuery] = useState(params.get('plate') ?? '');
  const [selectedPlate, setSelectedPlate] = useState<string | null>(params.get('plate'));
  const debounced = useDebounced(query, 240);

  const results = useAsync(() => parkingApi.searchVehicles(debounced), {
    deps: [debounced],
    enabled: debounced.trim().length >= 2,
    retries: 2,
  });

  const detail = useAsync(() => parkingApi.getVehicle(selectedPlate!), {
    deps: [selectedPlate],
    enabled: Boolean(selectedPlate),
    retries: 2,
  });

  // First result auto-selects, so a plate search lands straight on the record.
  useEffect(() => {
    if (results.status === 'success' && results.data?.length && !selectedPlate) {
      setSelectedPlate(results.data[0].plate);
    }
  }, [results.status, results.data, selectedPlate]);

  useEffect(() => {
    if (!selectedPlate) return;
    const next = new URLSearchParams(params);
    next.set('plate', selectedPlate);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlate]);

  const vehicle = detail.data ?? undefined;

  // Suggestions for the cold-start state: the newest arrivals still on site.
  const recent = useWorldSelector(
    (w) =>
      w.events
        .filter((e) => e.type === 'vehicle_entered' && e.plate)
        .slice(0, 6)
        .map((e) => w.vehicles[e.plate!])
        .filter((v): v is NonNullable<typeof v> => Boolean(v?.inside)),
    arrayEqual,
  );

  return (
    <Page className="h-full min-h-0">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setSelectedPlate(null);
              }}
              autoFocus
              size="lg"
              placeholder="Search by number plate, owner name or company — e.g. ICT-4821"
            />
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-subtle">
            <ScanLine className="h-3.5 w-3.5" />
            Live index across employees, visitors and unregistered vehicles
          </div>
        </div>

        {query.trim().length > 0 && query.trim().length < 2 && (
          <p className="mt-2 text-[11.5px] text-warning">Type at least two characters to search.</p>
        )}
      </Card>

      <div className="grid min-h-0 flex-1 gap-3.5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* --------------------------------------------------- result list */}
        <Card className="min-h-0 overflow-hidden">
          <CardHeader
            title="Results"
            compact
            subtitle={
              results.status === 'success'
                ? `${results.data?.length ?? 0} match${(results.data?.length ?? 0) === 1 ? '' : 'es'}`
                : undefined
            }
            actions={results.isRefreshing ? <Skeleton className="h-3 w-10" /> : undefined}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {debounced.trim().length < 2 ? (
              <div className="p-3">
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="Search the plaza"
                  description="Enter a plate, an owner's name or a company to find any vehicle recorded at this site."
                  className="py-8"
                />
                {recent.length > 0 && (
                  <>
                    <p className="mb-1.5 mt-1 px-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
                      Recent arrivals
                    </p>
                    <ul className="flex flex-col gap-1">
                      {recent.map((v) => (
                        <li key={v.plate}>
                          <button
                            onClick={() => {
                              setQuery(v.plate);
                              setSelectedPlate(v.plate);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-raised"
                          >
                            <PlateTag plate={v.plate} size="xs" />
                            <span className="truncate text-[11.5px] text-muted">{v.ownerName}</span>
                            <span className="ml-auto shrink-0 font-mono text-[10.5px] text-subtle">
                              {v.spaceCode}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : results.status === 'loading' ? (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[62px] w-full" />
                ))}
              </div>
            ) : results.status === 'error' ? (
              <ErrorState message={results.error ?? ''} onRetry={results.refetch} compact className="m-3" />
            ) : !results.data?.length ? (
              <EmptyState
                title={`No vehicle matches “${debounced}”`}
                description="Check the plate format, or register the vehicle as a visitor if it is new to the site."
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {results.data.map((v) => (
                  <li key={v.plate}>
                    <button
                      onClick={() => setSelectedPlate(v.plate)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                        selectedPlate === v.plate ? 'bg-primary-muted' : 'hover:bg-surface-raised',
                      )}
                    >
                      <span
                        className={cn(
                          'h-9 w-1 shrink-0 rounded-full',
                          v.inside ? 'bg-success' : 'bg-border-strong',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <PlateTag plate={v.plate} size="sm" />
                          <Badge tone={v.ownerType === 'employee' ? 'primary' : 'neutral'} size="sm">
                            {v.ownerType}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-[12px] text-foreground">{v.ownerName}</p>
                        <p className="truncate text-[10.5px] text-subtle">
                          {v.inside ? `Inside · ${v.spaceCode}` : 'Outside'} · {v.make}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------------- detail */}
        <div className="min-h-0 overflow-y-auto pr-0.5">
          {!selectedPlate ? (
            <Card className="h-full">
              <EmptyState
                icon={<Car className="h-5 w-5" />}
                title="No vehicle selected"
                description="Pick a result to see its live status, visit history, snapshots and associated cameras."
              />
            </Card>
          ) : detail.status === 'loading' ? (
            <VehicleSkeleton />
          ) : detail.status === 'error' ? (
            <ErrorState message={detail.error ?? ''} onRetry={detail.refetch} />
          ) : !vehicle ? (
            <Card className="h-full">
              <EmptyState title="Vehicle record not found" description="It may have been purged by the retention policy." />
            </Card>
          ) : (
            <VehicleDetail vehicle={vehicle} onExport={() =>
              toast({ title: 'Visit record exported', description: `${vehicle.plate} · PDF queued`, variant: 'success' })
            } />
          )}
        </div>
      </div>
    </Page>
  );
}

/* --------------------------------------------------------------- detail */

function VehicleDetail({
  vehicle,
  onExport,
}: {
  vehicle: VehicleSearchResult;
  onExport: () => void;
}) {
  const dwellMs = vehicle.entryTime
    ? (vehicle.inside ? Date.now() : vehicle.exitTime ?? Date.now()) - vehicle.entryTime
    : 0;

  const timeline = useMemo(() => {
    const items = [];
    if (vehicle.entryTime) {
      items.push({
        id: 'entry',
        title: 'Vehicle entered',
        detail: `Recognised at entry lane · confidence ${(vehicle.confidence * 100).toFixed(1)}%`,
        ts: vehicle.entryTime,
        tone: 'success' as const,
        icon: LogIn,
      });
      items.push({
        id: 'assigned',
        title: 'Bay assigned',
        detail: vehicle.spaceCode ? `Directed to ${vehicle.spaceCode}` : 'Free choice of bay',
        ts: vehicle.entryTime + 90_000,
        tone: 'info' as const,
        icon: CircleParking,
      });
    }
    if (vehicle.exitTime) {
      items.push({
        id: 'payment',
        title: 'Payment completed',
        detail: `${vehicle.paymentStatus === 'subscription' ? 'Covered by subscription' : 'Paid at exit terminal'}`,
        ts: vehicle.exitTime - 60_000,
        tone: 'success' as const,
        icon: CreditCard,
      });
      items.push({
        id: 'exit',
        title: 'Vehicle exited',
        detail: `Duration ${duration(dwellMs)}`,
        ts: vehicle.exitTime,
        tone: 'neutral' as const,
        icon: LogOut,
      });
    }
    return items.sort((a, b) => b.ts - a.ts);
  }, [vehicle, dwellMs]);

  return (
    <div className="flex flex-col gap-3.5">
      {/* header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <PlateTag plate={vehicle.plate} size="lg" />
            <div>
              <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-foreground">{vehicle.ownerName}</h2>
              <p className="mt-0.5 text-[12px] text-subtle">
                {vehicle.make} · {vehicle.colour} ·{' '}
                <span className="capitalize">{vehicle.vehicleClass}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone={vehicle.inside ? 'success' : 'neutral'} pulse={vehicle.inside}>
              {vehicle.inside ? 'Inside plaza' : 'Outside'}
            </StatusPill>
            <Button variant="secondary" size="sm" onClick={onExport}>
              <Download className="h-3.5 w-3.5" />
              Export record
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric label="Current floor" value={vehicle.floorId ?? '—'} icon={MapPin} />
          <Metric label="Parking slot" value={vehicle.spaceCode ?? '—'} icon={CircleParking} mono />
          <Metric label="Duration" value={vehicle.entryTime ? duration(dwellMs) : '—'} icon={Clock} />
          <Metric
            label="Payment"
            value={vehicle.paymentStatus}
            icon={CreditCard}
            tone={
              vehicle.paymentStatus === 'unpaid' ? 'danger' : vehicle.paymentStatus === 'paid' ? 'success' : 'neutral'
            }
          />
        </div>
      </Card>

      {/* media + record */}
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader title="Capture" compact subtitle="ANPR still and lane video" icon={<CameraIcon className="h-3.5 w-3.5" />} />
          <div className="flex flex-col gap-2 p-3">
            <div className="relative">
              <CameraFeed
                seed={vehicle.snapshotSeed}
                state="snapshot"
                label="Entry capture"
                plate={vehicle.plate}
                lane
                timestamp={vehicle.entryTime}
              />
              <Badge tone="neutral" size="sm" className="absolute right-2 top-2">
                {(vehicle.confidence * 100).toFixed(1)}% match
              </Badge>
            </div>
            <div className="relative">
              <CameraFeed seed={vehicle.snapshotSeed + 3} state="live" label="Lane video" lane />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur">
                  <Play className="ml-0.5 h-4 w-4 text-white" />
                </span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <CameraFeed
                  key={i}
                  seed={vehicle.snapshotSeed + i * 7}
                  state="snapshot"
                  showOverlay={false}
                  className="w-full"
                />
              ))}
            </div>
            <p className="text-center text-[10.5px] text-subtle">Snapshots — last 3 sightings</p>
          </div>
        </Card>

        <Card className="min-h-0">
          <Tabs defaultValue="record">
            <div className="border-b border-border-subtle px-3 py-2.5">
              <TabsList>
                <TabsTrigger value="record">Record</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="visits">Previous visits</TabsTrigger>
                <TabsTrigger value="cameras">Cameras</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="record" className="p-4">
              <DefList
                columns={2}
                items={[
                  { label: 'Number plate', value: <span className="font-mono">{vehicle.plate}</span> },
                  { label: 'Classification', value: <span className="capitalize">{vehicle.ownerType}</span> },
                  { label: 'Owner name', value: vehicle.ownerName },
                  { label: 'Employee ID', value: vehicle.ownerId ?? '—' },
                  { label: 'Department', value: vehicle.department ?? '—' },
                  { label: 'Company', value: vehicle.company ?? '—' },
                  { label: 'Phone', value: vehicle.phone ?? '—' },
                  {
                    label: 'Subscription',
                    value: vehicle.subscription && vehicle.subscription !== 'none' ? (
                      <Badge tone="success" size="sm">{vehicle.subscription}</Badge>
                    ) : (
                      <span className="text-subtle">None</span>
                    ),
                  },
                  {
                    label: 'Entry time',
                    value: <span className="tnum">{vehicle.entryTime ? fmtDateTime(vehicle.entryTime) : '—'}</span>,
                  },
                  {
                    label: 'Exit time',
                    value: (
                      <span className="tnum">
                        {vehicle.exitTime ? fmtDateTime(vehicle.exitTime) : vehicle.inside ? 'Still inside' : '—'}
                      </span>
                    ),
                  },
                  { label: 'Vehicle class', value: <span className="capitalize">{vehicle.vehicleClass}</span> },
                  { label: 'Colour', value: vehicle.colour },
                ]}
              />

              <Separator className="my-4" />

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm">
                  <Phone className="h-3.5 w-3.5" />
                  Call owner
                </Button>
                <Button variant="secondary" size="sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Flag for security
                </Button>
                <Button variant="secondary" size="sm">
                  <Building2 className="h-3.5 w-3.5" />
                  Notify host
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="p-4">
              {timeline.length ? (
                <Timeline items={timeline} />
              ) : (
                <EmptyState title="No visit in progress" description="This vehicle has no open or recent visit on record." />
              )}
            </TabsContent>

            <TabsContent value="visits" className="p-0">
              {vehicle.history.length === 0 ? (
                <EmptyState
                  icon={<History className="h-5 w-5" />}
                  title="No previous visits"
                  description="This is the first time this plate has been recorded at the plaza."
                />
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date', 'Bay', 'Floor', 'Duration', 'Charge'].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            'px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-subtle',
                            i > 2 && 'text-right',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.history.map((h, i) => (
                      <tr key={i} className="border-b border-border-subtle last:border-0">
                        <td className="tnum px-4 py-2.5 text-[12px] text-muted">{fmtDateTime(h.ts)}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-foreground">{h.spaceCode}</td>
                        <td className="px-4 py-2.5 text-[12px] capitalize text-muted">{h.floorId}</td>
                        <td className="tnum px-4 py-2.5 text-right text-[12px] text-muted">{duration(h.durationMs)}</td>
                        <td className="tnum px-4 py-2.5 text-right text-[12px] text-foreground">
                          {h.charge ? currency(h.charge) : <span className="text-subtle">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="cameras" className="p-4">
              <p className="mb-3 text-[11.5px] text-subtle">
                Cameras that recorded this vehicle during its current or most recent visit.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {vehicle.cameras.map((id, i) => (
                  <div key={id} className="overflow-hidden rounded-xl border border-border">
                    <CameraFeed
                      seed={vehicle.snapshotSeed + i * 11}
                      state="live"
                      label={id}
                      lane={id.includes('ENT') || id.includes('EXT')}
                      plate={i === 0 ? vehicle.plate : undefined}
                    />
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-mono text-[11.5px] text-foreground">{id}</span>
                      <Button variant="ghost" size="xs">
                        <Video className="h-3 w-3" />
                        Playback
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  mono,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof MapPin;
  mono?: boolean;
  tone?: 'success' | 'danger' | 'neutral';
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-inset px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-subtle">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-[13.5px] font-semibold capitalize text-foreground',
          mono && 'font-mono',
          tone === 'danger' && 'text-danger',
          tone === 'success' && 'text-success',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function VehicleSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[62px]" />
          ))}
        </div>
      </Card>
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Skeleton className="h-[380px]" />
        <Skeleton className="h-[380px]" />
      </div>
    </div>
  );
}
