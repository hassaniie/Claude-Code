/**
 * Parking Management API client.
 *
 * Every screen talks to the plaza through this module and nothing else. Today
 * it resolves against the in-process simulation with realistic latency and an
 * injectable failure rate; swapping to a real backend means replacing the
 * bodies of these methods with `fetch` calls — the signatures, the error
 * shape and the `AsyncResult` envelope consumers branch on all stay put.
 */

import {
  computeKpis, floorStats, simulation, type World,
} from './world';
import type {
  Alert, Camera, Employee, FloorId, FloorStats, Lane, OccupancyPoint,
  ParkingSpace, PlazaKpis, Vehicle, Visitor,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    readonly retryable = true,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Tunable transport behaviour — the Settings screen writes to this. */
export const transport = {
  /** Simulated round-trip, milliseconds. */
  minLatency: 180,
  maxLatency: 520,
  /** 0–1. Raise this to exercise error and retry states. */
  failureRate: 0,
  enabled: true,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function call<T>(endpoint: string, resolver: (world: World) => T): Promise<T> {
  const latency =
    transport.minLatency + Math.random() * (transport.maxLatency - transport.minLatency);
  await sleep(latency);

  if (!transport.enabled) {
    throw new ApiError('Parking API link is disabled', 503, endpoint);
  }
  if (Math.random() < transport.failureRate) {
    const world = simulation.getState();
    world.health.apiErrors24h += 1;
    throw new ApiError(`Upstream timeout while reading ${endpoint}`, 504, endpoint);
  }
  return resolver(simulation.getState());
}

/* ------------------------------------------------------------------ queries */

export interface SpaceQuery {
  floorId?: FloorId;
  vehicleClass?: 'car' | 'motorcycle';
  status?: 'vacant' | 'occupied';
  zoneId?: string;
  search?: string;
}

export interface VehicleSearchResult extends Vehicle {
  /** Bays this vehicle has previously used, most recent first. */
  history: Array<{ ts: number; spaceCode: string; floorId: FloorId; durationMs: number; charge: number }>;
  cameras: string[];
}

export interface ReportRow {
  [key: string]: string | number;
}

export const parkingApi = {
  /* --- plaza ------------------------------------------------------------- */

  getKpis: () => call<PlazaKpis>('/plaza/kpis', (w) => computeKpis(w)),

  getFloors: () => call<FloorStats[]>('/plaza/floors', (w) => floorStats(w)),

  getSpaces: (query: SpaceQuery = {}) =>
    call<ParkingSpace[]>('/plaza/spaces', (w) => {
      const ids = query.floorId ? w.spaceIdsByFloor[query.floorId] : w.spaceIds;
      const term = query.search?.trim().toUpperCase();
      return ids
        .map((id) => w.spaces[id])
        .filter((s) => {
          if (query.vehicleClass && s.vehicleClass !== query.vehicleClass) return false;
          if (query.status && s.status !== query.status) return false;
          if (query.zoneId && s.zoneId !== query.zoneId) return false;
          if (term && !s.code.includes(term) && !(s.plate ?? '').includes(term)) return false;
          return true;
        });
    }),

  getCameras: (floorId?: FloorId) =>
    call<Camera[]>('/cctv/cameras', (w) =>
      w.cameraIds.map((id) => w.cameras[id]).filter((c) => !floorId || c.floorId === floorId),
    ),

  getLanes: () => call<Lane[]>('/gates/lanes', (w) => w.lanes),

  getBarriers: () => call('/gates/barriers', (w) => w.barriers),

  getAlerts: () => call<Alert[]>('/alerts', (w) => w.alerts),

  getEvents: (limit = 60) => call('/events', (w) => w.events.slice(0, limit)),

  getHealth: () => call('/system/health', (w) => w.health),

  getRevenue: () => call('/finance/revenue', (w) => w.revenue),

  getHistory: (range: 'hourly' | 'daily' | 'weekly' | 'monthly') =>
    call<OccupancyPoint[]>(`/analytics/occupancy/${range}`, (w) => w.history[range]),

  /* --- people ------------------------------------------------------------ */

  getEmployees: (search = '') =>
    call<Employee[]>('/employees', (w) => {
      const term = search.trim().toLowerCase();
      if (!term) return w.employees;
      return w.employees.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.plate.toLowerCase().includes(term) ||
          e.department.toLowerCase().includes(term) ||
          e.id.toLowerCase().includes(term),
      );
    }),

  getVisitors: (search = '') =>
    call<Visitor[]>('/visitors', (w) => {
      const term = search.trim().toLowerCase();
      if (!term) return w.visitors;
      return w.visitors.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          v.plate.toLowerCase().includes(term) ||
          v.company.toLowerCase().includes(term) ||
          v.ticket.toLowerCase().includes(term),
      );
    }),

  /* --- vehicle search ---------------------------------------------------- */

  searchVehicles: (query: string) =>
    call<VehicleSearchResult[]>('/vehicles/search', (w) => {
      const term = query.trim().toUpperCase();
      if (term.length < 2) return [];
      const matches = Object.values(w.vehicles)
        .filter(
          (v) =>
            v.plate.includes(term) ||
            v.ownerName.toUpperCase().includes(term) ||
            (v.company ?? '').toUpperCase().includes(term),
        )
        .sort((a, b) => {
          if (a.inside !== b.inside) return a.inside ? -1 : 1;
          const ai = a.plate.indexOf(term);
          const bi = b.plate.indexOf(term);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .slice(0, 24);

      return matches.map((v) => enrichVehicle(w, v));
    }),

  getVehicle: (plate: string) =>
    call<VehicleSearchResult | null>(`/vehicles/${plate}`, (w) => {
      const v = w.vehicles[plate.toUpperCase()];
      return v ? enrichVehicle(w, v) : null;
    }),

  /* --- commands ---------------------------------------------------------- */

  commandBarrier: (barrierId: string, command: 'open' | 'close' | 'emergency' | 'auto', operator: string) =>
    call(`/gates/barriers/${barrierId}/${command}`, () =>
      simulation.commandBarrier(barrierId, command, operator),
    ),

  registerVisitor: (input: Parameters<typeof simulation.registerVisitor>[0]) =>
    call('/visitors/register', () => simulation.registerVisitor(input)),

  overridePlate: (laneId: string, plate: string, operator: string) =>
    call(`/gates/lanes/${laneId}/override`, () => simulation.overridePlate(laneId, plate, operator)),

  overrideSpace: (spaceId: string, status: 'vacant' | 'occupied', operator: string) =>
    call(`/plaza/spaces/${spaceId}`, () => simulation.overrideSpace(spaceId, status, operator)),
};

function enrichVehicle(w: World, v: Vehicle): VehicleSearchResult {
  // Prior visits: real API returns these from the visit ledger.
  const seedBase = v.snapshotSeed;
  const visits = w.visitors.filter((x) => x.plate === v.plate && x.exitTime);
  const history = visits.slice(0, 8).map((x) => ({
    ts: x.entryTime,
    spaceCode: x.spaceCode ?? '—',
    floorId: (x.floorId ?? 'ground') as FloorId,
    durationMs: (x.exitTime ?? x.entryTime) - x.entryTime,
    charge: x.charges,
  }));

  if (!history.length && v.entryTime) {
    const floors: FloorId[] = ['ground', 'first', 'second', 'rooftop'];
    for (let i = 1; i <= 5; i++) {
      const ts = v.entryTime - i * 86_400_000 - ((seedBase * i) % 5) * 3_600_000;
      history.push({
        ts,
        spaceCode: `${floors[(seedBase + i) % 4][0].toUpperCase()}-${'ABC'[(seedBase + i) % 3]}-${String(((seedBase * i) % 198) + 1).padStart(3, '0')}`,
        floorId: floors[(seedBase + i) % 4],
        durationMs: (2 + ((seedBase + i) % 6)) * 3_600_000,
        charge: v.ownerType === 'visitor' ? 60 * (2 + ((seedBase + i) % 6)) : 0,
      });
    }
  }

  const cameras: string[] = [];
  if (v.spaceId) {
    const space = w.spaces[v.spaceId];
    if (space) cameras.push(space.cameraId);
  }
  cameras.push('CAM-ENT01', 'CAM-EXT01');

  return { ...v, history, cameras };
}
