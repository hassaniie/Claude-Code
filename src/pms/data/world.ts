/**
 * The plaza world: generation + live simulation.
 *
 * This module stands in for the Parking Management APIs. It builds a complete,
 * internally consistent plaza from a fixed seed, then mutates it on a timer the
 * way a real site does — vehicles arrive and leave, bays flip, cameras drop,
 * ANPR misreads a plate, revenue accrues.
 *
 * Everything the UI needs is derived from this state, so replacing it with a
 * real transport means reimplementing `PlazaSimulation`'s public surface
 * (`getState`, `subscribe`, and the operator commands) against HTTP + sockets.
 */

import {
  BIKE_MAKES, CAR_MAKES, COLOURS, COMPANIES, DEPARTMENTS, DESIGNATIONS,
  FIRST_NAMES, LAST_NAMES, PLATE_PREFIXES, PURPOSES,
} from './names';
import { chance, float, gaussian, int, mulberry32, pick, shuffle, type Rng } from './rng';
import type {
  ActivityEvent, Alert, AlertSeverity, AlertType, Barrier, Camera, CameraModule,
  ConnectionState, Employee, EventType, Floor, FloorId, FloorStats, Lane,
  OccupancyPoint, ParkingSpace, PlazaKpis, RevenueSnapshot, SubscriptionTier,
  SystemHealth, Vehicle, Visitor, Zone,
} from './types';

const SEED = 20260806;

/** Each camera watches 6 bays: 3 on one side of the aisle, 3 opposite. */
export const BAYS_PER_CAMERA = 6;
const CAR_MODULES_PER_ZONE = 11;
const CAR_ZONES = ['A', 'B', 'C'] as const;
const MOTO_MODULES = 7;

const FLOOR_DEFS: Array<{ id: FloorId; name: string; short: string; level: number; fill: number }> = [
  { id: 'ground', name: 'Ground Floor', short: 'G', level: 0, fill: 0.91 },
  { id: 'first', name: 'First Floor', short: '1', level: 1, fill: 0.82 },
  { id: 'second', name: 'Second Floor', short: '2', level: 2, fill: 0.63 },
  { id: 'rooftop', name: 'Rooftop', short: 'R', level: 3, fill: 0.38 },
];

const HOUR = 3600_000;
const MINUTE = 60_000;
const DAY = 86_400_000;

export interface Counters {
  entriesToday: number;
  exitsToday: number;
  failedRecognitions: number;
  visitorsRegisteredToday: number;
  paymentsToday: number;
  peakOccupancy: number;
  /** Rolling window of occupancy samples used for the fill-rate projection. */
  occupancySamples: Array<{ ts: number; occupied: number }>;
}

export interface World {
  generatedAt: number;
  floors: Floor[];
  zones: Record<string, Zone>;
  modules: Record<string, CameraModule>;
  spaces: Record<string, ParkingSpace>;
  spaceIds: string[];
  spaceIdsByFloor: Record<FloorId, string[]>;
  spaceIdsByZone: Record<string, string[]>;
  cameras: Record<string, Camera>;
  cameraIds: string[];
  vehicles: Record<string, Vehicle>;
  employees: Employee[];
  visitors: Visitor[];
  events: ActivityEvent[];
  alerts: Alert[];
  barriers: Barrier[];
  lanes: Lane[];
  revenue: RevenueSnapshot;
  health: SystemHealth;
  counters: Counters;
  history: {
    hourly: OccupancyPoint[];
    daily: OccupancyPoint[];
    weekly: OccupancyPoint[];
    monthly: OccupancyPoint[];
  };
  /** Bumped on every mutation so `useSyncExternalStore` sees a fresh snapshot. */
  version: number;
}

/* ------------------------------------------------------------------ helpers */

let plateCounter = 0;
function makePlate(rng: Rng, seen: Set<string>): string {
  for (let i = 0; i < 200; i++) {
    const p = `${pick(rng, PLATE_PREFIXES)}-${int(rng, 100, 9999)}`;
    if (!seen.has(p)) {
      seen.add(p);
      return p;
    }
  }
  return `TMP-${++plateCounter}`;
}

const fullName = (rng: Rng) => `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;

const cnic = (rng: Rng) =>
  `${int(rng, 10000, 61101)}-${int(rng, 1000000, 9999999)}-${int(rng, 0, 9)}`;

const phone = (rng: Rng) => `+92 3${int(rng, 10, 49)} ${int(rng, 1000000, 9999999)}`;

let eventSeq = 0;
export const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++eventSeq}`;

/* --------------------------------------------------------------- generation */

function buildStructure(rng: Rng) {
  const floors: Floor[] = [];
  const zones: Record<string, Zone> = {};
  const modules: Record<string, CameraModule> = {};
  const spaces: Record<string, ParkingSpace> = {};
  const cameras: Record<string, Camera> = {};
  const spaceIdsByFloor = {} as Record<FloorId, string[]>;
  const spaceIdsByZone: Record<string, string[]> = {};
  const now = Date.now();

  for (const def of FLOOR_DEFS) {
    const zoneIds: string[] = [];
    spaceIdsByFloor[def.id] = [];
    let carCount = 0;
    let motoCount = 0;

    const zoneSpecs = [
      ...CAR_ZONES.map((z) => ({ key: z, vehicleClass: 'car' as const, modules: CAR_MODULES_PER_ZONE })),
      { key: 'M', vehicleClass: 'motorcycle' as const, modules: MOTO_MODULES },
    ];

    for (const spec of zoneSpecs) {
      const zoneId = `${def.id}-${spec.key}`;
      const moduleIds: string[] = [];
      spaceIdsByZone[zoneId] = [];

      for (let m = 0; m < spec.modules; m++) {
        const moduleId = `${zoneId}-M${String(m + 1).padStart(2, '0')}`;
        const cameraId = `CAM-${def.short}${spec.key}${String(m + 1).padStart(2, '0')}`;
        const spaceIds: string[] = [];

        for (let s = 0; s < BAYS_PER_CAMERA; s++) {
          const side = s < 3 ? 'north' : 'south';
          const slot = s % 3;
          const index = m * BAYS_PER_CAMERA + s + 1;
          const id = `${zoneId}-S${String(index).padStart(3, '0')}`;
          const code = `${def.short}-${spec.key}-${String(index).padStart(3, '0')}`;

          // Bay class is a physical property of the site, not live state.
          let bayClass: ParkingSpace['bayClass'] = 'standard';
          if (spec.vehicleClass === 'car') {
            if (m === 0 && s < 2) bayClass = 'accessible';
            else if (m === 1 && s < 3) bayClass = 'ev';
            else if (spec.key === 'A' && m === 2 && s < 2) bayClass = 'reserved';
          }

          spaces[id] = {
            id, code, floorId: def.id, zoneId,
            vehicleClass: spec.vehicleClass,
            bayClass,
            status: 'vacant',
            since: now - int(rng, 5, 400) * MINUTE,
            cameraId, side, slot,
            row: Math.floor(m / 6),
            col: m % 6,
          };
          spaceIds.push(id);
          spaceIdsByFloor[def.id].push(id);
          spaceIdsByZone[zoneId].push(id);
          if (spec.vehicleClass === 'car') carCount++;
          else motoCount++;
        }

        modules[moduleId] = { id: moduleId, cameraId, zoneId, spaceIds };
        moduleIds.push(moduleId);

        cameras[cameraId] = {
          id: cameraId,
          name: `${def.name} · Zone ${spec.key} · Cam ${m + 1}`,
          floorId: def.id,
          zoneId,
          role: 'bay',
          health: 'online',
          recording: true,
          storagePct: int(rng, 34, 88),
          fps: pick(rng, [25, 30]),
          resolution: pick(rng, ['1920×1080', '2560×1440', '3840×2160']),
          ptz: chance(rng, 0.18),
          lastHeartbeat: now - int(rng, 0, 20) * 1000,
          spaceIds,
          coverageStatus: 'green',
          occupiedCount: 0,
          ipAddress: `10.${def.level + 20}.${spec.key.charCodeAt(0) - 64}.${m + 11}`,
        };
      }

      zones[zoneId] = {
        id: zoneId,
        name: spec.vehicleClass === 'motorcycle' ? 'Motorcycle Section' : `Zone ${spec.key}`,
        floorId: def.id,
        vehicleClass: spec.vehicleClass,
        moduleIds,
      };
      zoneIds.push(zoneId);
    }

    floors.push({
      id: def.id, name: def.name, shortName: def.short, level: def.level,
      zoneIds, carCapacity: carCount, motorcycleCapacity: motoCount,
    });
  }

  // Lane + perimeter cameras sit outside the bay grid but share the CCTV wall.
  const laneCams: Array<[string, string, boolean]> = [
    ['CAM-ENT01', 'Entry Lane 1 · ANPR', true],
    ['CAM-ENT02', 'Entry Lane 2 · ANPR', true],
    ['CAM-EXT01', 'Exit Lane 1 · ANPR', true],
    ['CAM-EXT02', 'Exit Lane 2 · ANPR', true],
    ['CAM-PER01', 'Perimeter · North Ramp', false],
    ['CAM-PER02', 'Perimeter · South Ramp', false],
    ['CAM-PER03', 'Rooftop Approach', true],
    ['CAM-LOB01', 'Lift Lobby · Ground', false],
  ];
  laneCams.forEach(([id, name, ptz], i) => {
    cameras[id] = {
      id, name, floorId: 'ground', zoneId: 'perimeter',
      role: id.startsWith('CAM-PER') || id.startsWith('CAM-LOB') ? 'perimeter' : 'lane',
      health: 'online', recording: true,
      storagePct: int(rng, 40, 92),
      fps: 30, resolution: '3840×2160', ptz,
      lastHeartbeat: now - int(rng, 0, 12) * 1000,
      spaceIds: [], coverageStatus: 'unknown', occupiedCount: 0,
      ipAddress: `10.10.0.${i + 21}`,
    };
  });

  return { floors, zones, modules, spaces, cameras, spaceIdsByFloor, spaceIdsByZone };
}

function buildPeople(rng: Rng, seenPlates: Set<string>) {
  const employees: Employee[] = [];
  for (let i = 0; i < 540; i++) {
    const name = fullName(rng);
    const vehicleClass = chance(rng, 0.22) ? 'motorcycle' : 'car';
    const sub: SubscriptionTier = chance(rng, 0.62)
      ? pick(rng, ['monthly', 'monthly', 'quarterly', 'annual'] as const)
      : 'none';
    employees.push({
      id: `EMP-${String(1000 + i)}`,
      name,
      department: pick(rng, DEPARTMENTS),
      designation: pick(rng, DESIGNATIONS),
      email: `${name.toLowerCase().replace(/[^a-z]/g, '.')}@nexus-corp.com`,
      phone: phone(rng),
      plate: makePlate(rng, seenPlates),
      vehicleClass,
      subscription: sub,
      subscriptionExpiry: sub === 'none' ? undefined : Date.now() + int(rng, -6, 300) * DAY,
      status: chance(rng, 0.94) ? 'active' : chance(rng, 0.5) ? 'suspended' : 'inactive',
      accessLevel: chance(rng, 0.08) ? 'executive' : chance(rng, 0.12) ? 'contractor' : 'standard',
      photoSeed: int(rng, 1, 9999),
    });
  }
  return employees;
}

function buildVehicleFor(rng: Rng, plate: string, employee?: Employee): Vehicle {
  const vehicleClass = employee?.vehicleClass ?? (chance(rng, 0.18) ? 'motorcycle' : 'car');
  return {
    plate,
    vehicleClass,
    make: vehicleClass === 'car' ? pick(rng, CAR_MAKES) : pick(rng, BIKE_MAKES),
    colour: pick(rng, COLOURS),
    ownerType: employee ? 'employee' : 'visitor',
    ownerName: employee?.name ?? fullName(rng),
    ownerId: employee?.id,
    department: employee?.department,
    company: employee ? 'Nexus Corp' : pick(rng, COMPANIES),
    phone: employee?.phone ?? phone(rng),
    inside: false,
    paymentStatus: employee ? (employee.subscription === 'none' ? 'unpaid' : 'subscription') : 'unpaid',
    subscription: employee?.subscription,
    snapshotSeed: int(rng, 1, 99999),
    confidence: float(rng, 0.86, 0.999),
  };
}

function buildHistory(rng: Rng, capacity: number) {
  const now = Date.now();
  const shape = (h: number) => {
    // Weekday office curve: ramp 07:00-10:00, plateau, drain 17:00-20:00.
    if (h < 6) return 0.06 + h * 0.005;
    if (h < 10) return 0.1 + (h - 6) * 0.19;
    if (h < 13) return 0.86 - (h - 10) * 0.01;
    if (h < 17) return 0.84 - (h - 13) * 0.02;
    if (h < 21) return 0.76 - (h - 17) * 0.17;
    return 0.1 - (h - 21) * 0.01;
  };

  const hourly: OccupancyPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const ts = now - i * HOUR;
    const h = new Date(ts).getHours();
    const base = Math.max(0.03, shape(h) + float(rng, -0.035, 0.035));
    hourly.push({
      label: `${String(h).padStart(2, '0')}:00`,
      ts,
      occupancy: Math.round(base * capacity),
      entries: Math.round(base * 130 + float(rng, -18, 18)),
      exits: Math.round(base * 118 + float(rng, -18, 18)),
      revenue: Math.round(base * 21000 + float(rng, -2400, 2400)),
    });
  }

  const daily: OccupancyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const ts = now - i * DAY;
    const d = new Date(ts);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? float(rng, 0.18, 0.34) : float(rng, 0.68, 0.93);
    daily.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      ts,
      occupancy: Math.round(base * capacity),
      entries: Math.round(base * 1180 + float(rng, -90, 90)),
      exits: Math.round(base * 1160 + float(rng, -90, 90)),
      revenue: Math.round(base * 214000 + float(rng, -16000, 16000)),
    });
  }

  const weekly: OccupancyPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const ts = now - i * 7 * DAY;
    const base = float(rng, 0.6, 0.88);
    weekly.push({
      label: `W${52 - i}`,
      ts,
      occupancy: Math.round(base * capacity),
      entries: Math.round(base * 7600 + float(rng, -400, 400)),
      exits: Math.round(base * 7550 + float(rng, -400, 400)),
      revenue: Math.round(base * 1_390_000 + float(rng, -70000, 70000)),
    });
  }

  const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const monthly: OccupancyPoint[] = MONTHS.map((label, i) => {
    const base = 0.58 + i * 0.022 + float(rng, -0.04, 0.04);
    return {
      label,
      ts: now - (11 - i) * 30 * DAY,
      occupancy: Math.round(base * capacity),
      entries: Math.round(base * 32000 + float(rng, -1500, 1500)),
      exits: Math.round(base * 31800 + float(rng, -1500, 1500)),
      revenue: Math.round(base * 5_900_000 + float(rng, -260000, 260000)),
    };
  });

  return { hourly, daily, weekly, monthly };
}

function buildLanesAndBarriers(rng: Rng): { lanes: Lane[]; barriers: Barrier[] } {
  const now = Date.now();
  const defs: Array<[string, string, 'entry' | 'exit', string]> = [
    ['LANE-E1', 'Entry Lane 1 — Main Ramp', 'entry', 'CAM-ENT01'],
    ['LANE-E2', 'Entry Lane 2 — North Ramp', 'entry', 'CAM-ENT02'],
    ['LANE-X1', 'Exit Lane 1 — Main Ramp', 'exit', 'CAM-EXT01'],
    ['LANE-X2', 'Exit Lane 2 — South Ramp', 'exit', 'CAM-EXT02'],
  ];
  const lanes: Lane[] = [];
  const barriers: Barrier[] = [];

  defs.forEach(([id, name, direction, cameraId], i) => {
    const barrierId = `BAR-${direction === 'entry' ? 'E' : 'X'}${i + 1}`;
    lanes.push({
      id, name, direction, barrierId, cameraId,
      recognition: 'idle',
      snapshotSeed: int(rng, 1, 99999),
      queue: [],
      throughputPerHour: int(rng, 84, 148),
      avgProcessingSec: float(rng, 3.2, 6.8),
    });
    barriers.push({
      id: barrierId,
      name: `${direction === 'entry' ? 'Entry' : 'Exit'} Barrier ${i + 1}`,
      laneId: id,
      direction,
      status: 'closed',
      mode: 'auto',
      lastAction: 'Auto close after vehicle pass',
      lastActionTs: now - int(rng, 20, 400) * 1000,
      lastOperator: 'System (AUTO)',
      connection: 'healthy',
      latencyMs: int(rng, 12, 60),
      cyclesToday: int(rng, 210, 640),
      firmware: `v4.${int(rng, 2, 9)}.${int(rng, 0, 9)}`,
    });
  });

  return { lanes, barriers };
}

/** Assemble the whole plaza and seed it to a plausible mid-morning state. */
export function createWorld(): World {
  const rng = mulberry32(SEED);
  const now = Date.now();
  const seenPlates = new Set<string>();

  const { floors, zones, modules, spaces, cameras, spaceIdsByFloor, spaceIdsByZone } =
    buildStructure(rng);
  const employees = buildPeople(rng, seenPlates);
  const vehicles: Record<string, Vehicle> = {};
  for (const e of employees) vehicles[e.plate] = buildVehicleFor(rng, e.plate, e);

  const spaceIds = Object.keys(spaces);
  const cameraIds = Object.keys(cameras);

  // --- occupy bays to each floor's target fill -------------------------------
  const employeePool = shuffle(rng, employees.filter((e) => e.status === 'active'));
  let empCursor = 0;
  const visitors: Visitor[] = [];

  for (const def of FLOOR_DEFS) {
    for (const zoneId of floors.find((f) => f.id === def.id)!.zoneIds) {
      const ids = spaceIdsByZone[zoneId];
      const target = Math.round(ids.length * (def.fill + float(rng, -0.05, 0.05)));
      const chosen = shuffle(rng, ids).slice(0, Math.max(0, Math.min(ids.length, target)));

      for (const spaceId of chosen) {
        const space = spaces[spaceId];
        const wantMoto = space.vehicleClass === 'motorcycle';

        // ~72% of occupants are employees; the rest are registered visitors.
        let plate: string;
        let isEmployee = chance(rng, 0.72);
        let emp: Employee | undefined;
        if (isEmployee) {
          // Find an employee whose vehicle class matches this bay.
          let guard = 0;
          do {
            emp = employeePool[empCursor++ % employeePool.length];
            guard++;
          } while (emp && (emp.vehicleClass === 'motorcycle') !== wantMoto && guard < 80);
          if (!emp || (emp.vehicleClass === 'motorcycle') !== wantMoto) isEmployee = false;
        }

        // An employee already parked on a lower level can't also be up here —
        // fall through to a visitor rather than leaving the bay empty, or the
        // upper floors end up far below their target fill.
        if (isEmployee && emp && vehicles[emp.plate].inside) isEmployee = false;

        if (isEmployee && emp) {
          plate = emp.plate;
        } else {
          plate = makePlate(rng, seenPlates);
          const v = buildVehicleFor(rng, plate);
          v.vehicleClass = wantMoto ? 'motorcycle' : 'car';
          v.make = wantMoto ? pick(rng, BIKE_MAKES) : pick(rng, CAR_MAKES);
          vehicles[plate] = v;
        }

        const dwell = Math.round(gaussian(rng, 3.1, 2.1, 0.2, 11) * HOUR);
        const entryTime = now - dwell;
        const v = vehicles[plate];
        v.inside = true;
        v.floorId = space.floorId;
        v.spaceId = space.id;
        v.spaceCode = space.code;
        v.entryTime = entryTime;
        v.exitTime = undefined;

        space.status = 'occupied';
        space.plate = plate;
        space.since = entryTime;

        if (v.ownerType === 'visitor') {
          const charge = Math.max(50, Math.round((dwell / HOUR) * 60) * (wantMoto ? 0.5 : 1));
          visitors.push({
            id: `VIS-${visitors.length + 1000}`,
            ticket: `T-${String(int(rng, 10000, 99999))}`,
            plate,
            name: v.ownerName,
            phone: v.phone!,
            company: v.company!,
            purpose: pick(rng, PURPOSES),
            cnic: cnic(rng),
            host: fullName(rng),
            hostDepartment: pick(rng, DEPARTMENTS),
            vehicleClass: v.vehicleClass,
            entryTime,
            status: dwell > 8 * HOUR ? 'overstay' : 'inside',
            charges: charge,
            paymentStatus: 'unpaid',
            spaceCode: space.code,
            floorId: space.floorId,
          });
        }
      }
    }
  }

  // --- historical visitors (already departed) --------------------------------
  for (let i = 0; i < 160; i++) {
    const entryTime = now - int(rng, 1, 20) * DAY - int(rng, 0, 10) * HOUR;
    const dwell = Math.round(gaussian(rng, 2.4, 1.5, 0.3, 9) * HOUR);
    const plate = makePlate(rng, seenPlates);
    const v = buildVehicleFor(rng, plate);
    v.entryTime = entryTime;
    v.exitTime = entryTime + dwell;
    v.paymentStatus = 'paid';
    vehicles[plate] = v;
    visitors.push({
      id: `VIS-${visitors.length + 1000}`,
      ticket: `T-${String(int(rng, 10000, 99999))}`,
      plate, name: v.ownerName, phone: v.phone!, company: v.company!,
      purpose: pick(rng, PURPOSES), cnic: cnic(rng),
      host: fullName(rng), hostDepartment: pick(rng, DEPARTMENTS),
      vehicleClass: v.vehicleClass,
      entryTime, exitTime: entryTime + dwell,
      status: 'departed',
      charges: Math.max(50, Math.round((dwell / HOUR) * 60)),
      paymentStatus: 'paid',
    });
  }

  // --- camera health: a couple of real faults on a site this size ------------
  const bayCamIds = cameraIds.filter((id) => cameras[id].role === 'bay');
  const faulted = shuffle(rng, bayCamIds).slice(0, 3);
  faulted.forEach((id, i) => {
    cameras[id].health = i === 0 ? 'offline' : i === 1 ? 'degraded' : 'offline';
    cameras[id].recording = cameras[id].health !== 'offline';
    cameras[id].lastHeartbeat = now - int(rng, 3, 40) * MINUTE;
  });

  const { lanes, barriers } = buildLanesAndBarriers(rng);

  const totalCapacity = floors.reduce((s, f) => s + f.carCapacity + f.motorcycleCapacity, 0);
  const history = buildHistory(rng, totalCapacity);

  const world: World = {
    generatedAt: now,
    floors, zones, modules, spaces, spaceIds, spaceIdsByFloor, spaceIdsByZone,
    cameras, cameraIds, vehicles, employees, visitors,
    events: [],
    alerts: [],
    barriers, lanes,
    revenue: {
      today: 0, yesterday: 268400, month: 5_940_000, lastMonth: 5_412_000,
      visitorRevenue: 0, subscriptionRevenue: 0, penaltyRevenue: 0,
      transactionsToday: 0, avgTicket: 0,
    },
    health: {
      connection: 'connected',
      lastSync: now,
      latencyMs: 42,
      apiErrors24h: 3,
      uptimePct: 99.94,
      nodesOnline: 11,
      nodesTotal: 12,
    },
    counters: {
      entriesToday: 0, exitsToday: 0, failedRecognitions: 0,
      visitorsRegisteredToday: 0, paymentsToday: 0, peakOccupancy: 0,
      occupancySamples: [],
    },
    history,
    version: 1,
  };

  // Today's counters, consistent with what is currently parked.
  const inside = Object.values(vehicles).filter((v) => v.inside).length;
  world.counters.entriesToday = inside + int(rng, 260, 420);
  world.counters.exitsToday = world.counters.entriesToday - inside;
  world.counters.failedRecognitions = int(rng, 8, 23);
  world.counters.visitorsRegisteredToday = visitors.filter((v) => v.status !== 'departed').length;
  world.counters.paymentsToday = int(rng, 180, 320);
  world.counters.peakOccupancy = inside + int(rng, 5, 40);
  world.revenue.visitorRevenue = int(rng, 118000, 168000);
  world.revenue.subscriptionRevenue = int(rng, 92000, 132000);
  world.revenue.penaltyRevenue = int(rng, 4000, 14000);
  world.revenue.today =
    world.revenue.visitorRevenue + world.revenue.subscriptionRevenue + world.revenue.penaltyRevenue;
  world.revenue.transactionsToday = world.counters.paymentsToday;
  world.revenue.avgTicket = Math.round(world.revenue.today / world.counters.paymentsToday);

  refreshCameraCoverage(world);
  seedEvents(world, rng);
  seedAlerts(world, rng);
  return world;
}

/* ------------------------------------------------------------- derived state */

/** Red when every covered bay is occupied; green while any bay is free. */
export function refreshCameraCoverage(world: World, cameraIds?: string[]) {
  const ids = cameraIds ?? world.cameraIds;
  for (const id of ids) {
    const cam = world.cameras[id];
    if (!cam || cam.role !== 'bay') continue;
    let occupied = 0;
    for (const sid of cam.spaceIds) if (world.spaces[sid].status === 'occupied') occupied++;
    const status: Camera['coverageStatus'] =
      cam.health === 'offline' ? 'unknown' : occupied === cam.spaceIds.length ? 'red' : 'green';
    if (cam.occupiedCount !== occupied || cam.coverageStatus !== status) {
      world.cameras[id] = { ...cam, occupiedCount: occupied, coverageStatus: status };
    }
  }
}

export function floorStats(world: World): FloorStats[] {
  return world.floors.map((floor) => {
    let carOccupied = 0;
    let motoOccupied = 0;
    for (const id of world.spaceIdsByFloor[floor.id]) {
      const s = world.spaces[id];
      if (s.status !== 'occupied') continue;
      if (s.vehicleClass === 'car') carOccupied++;
      else motoOccupied++;
    }
    const capacity = floor.carCapacity + floor.motorcycleCapacity;
    const occupied = carOccupied + motoOccupied;
    const occupancyPct = (occupied / capacity) * 100;
    return {
      floorId: floor.id,
      name: floor.name,
      carCapacity: floor.carCapacity,
      carOccupied,
      motorcycleCapacity: floor.motorcycleCapacity,
      motorcycleOccupied: motoOccupied,
      occupancyPct,
      available: capacity - occupied,
      trend: trendFor(world, floor.id),
      status:
        occupancyPct >= 99 ? 'full' : occupancyPct >= 90 ? 'critical' : occupancyPct >= 75 ? 'filling' : 'normal',
    };
  });
}

/** Net change over the last ~10 minutes, as a percentage of floor capacity. */
function trendFor(world: World, floorId: FloorId) {
  const cutoff = Date.now() - 10 * MINUTE;
  let delta = 0;
  for (const ev of world.events) {
    if (ev.ts < cutoff) break;
    if (ev.floorId !== floorId) continue;
    if (ev.type === 'space_occupied') delta++;
    else if (ev.type === 'space_released') delta--;
  }
  return delta;
}

export function computeKpis(world: World): PlazaKpis {
  let occupied = 0;
  let motorcyclesOccupied = 0;
  let carSpaces = 0;
  let motorcycleSpaces = 0;
  let dwellSum = 0;
  const now = Date.now();

  for (const id of world.spaceIds) {
    const s = world.spaces[id];
    if (s.vehicleClass === 'car') carSpaces++;
    else motorcycleSpaces++;
    if (s.status === 'occupied') {
      occupied++;
      dwellSum += now - s.since;
      if (s.vehicleClass === 'motorcycle') motorcyclesOccupied++;
    }
  }

  const totalSpaces = carSpaces + motorcycleSpaces;
  let employeesInside = 0;
  let visitorsInside = 0;
  for (const plate in world.vehicles) {
    const v = world.vehicles[plate];
    if (!v.inside) continue;
    if (v.ownerType === 'employee') employeesInside++;
    else visitorsInside++;
  }

  let offlineCameras = 0;
  let redCameras = 0;
  for (const id of world.cameraIds) {
    const c = world.cameras[id];
    if (c.health === 'offline') offlineCameras++;
    if (c.coverageStatus === 'red') redCameras++;
  }

  const activeAlerts = world.alerts.filter((a) => !a.resolved).length;
  const criticalAlerts = world.alerts.filter((a) => !a.resolved && a.severity === 'critical').length;

  // Fill rate from the rolling occupancy window → projected time to full.
  const samples = world.counters.occupancySamples;
  let fillRatePerHour = 0;
  if (samples.length >= 2) {
    const first = samples[0];
    const last = samples[samples.length - 1];
    const hours = (last.ts - first.ts) / HOUR;
    if (hours > 0.002) fillRatePerHour = (last.occupied - first.occupied) / hours;
  }
  const available = totalSpaces - occupied;
  const minutesUntilFull =
    fillRatePerHour > 1 && available > 0 ? Math.round((available / fillRatePerHour) * 60) : null;

  return {
    totalSpaces, carSpaces, motorcycleSpaces,
    occupied, available,
    occupancyPct: (occupied / totalSpaces) * 100,
    motorcyclesOccupied,
    entriesToday: world.counters.entriesToday,
    exitsToday: world.counters.exitsToday,
    vehiclesInside: employeesInside + visitorsInside,
    employeesInside, visitorsInside,
    revenueToday: world.revenue.today,
    monthlySubscribers: world.employees.filter((e) => e.subscription !== 'none').length,
    failedRecognitions: world.counters.failedRecognitions,
    activeAlerts, criticalAlerts,
    offlineCameras,
    totalCameras: world.cameraIds.length,
    redCameras,
    barriersOpen: world.barriers.filter((b) => b.status === 'open').length,
    barriersTotal: world.barriers.length,
    avgDwellMs: occupied ? dwellSum / occupied : 0,
    peakOccupancyToday: Math.max(world.counters.peakOccupancy, occupied),
    minutesUntilFull,
    fillRatePerHour,
  };
}

/* ------------------------------------------------------------------- events */

const EVENT_TITLES: Record<EventType, string> = {
  vehicle_entered: 'Vehicle Entered',
  vehicle_exited: 'Vehicle Exited',
  visitor_registered: 'Visitor Registered',
  payment_completed: 'Payment Completed',
  barrier_opened: 'Barrier Opened',
  barrier_closed: 'Barrier Closed',
  camera_offline: 'Camera Offline',
  camera_restored: 'Camera Restored',
  recognition_failed: 'Recognition Failed',
  floor_full: 'Floor Full',
  space_occupied: 'Space Occupied',
  space_released: 'Space Released',
  emergency_mode: 'Emergency Mode',
  operator_action: 'Operator Action',
};

const MAX_EVENTS = 400;

export function pushEvent(world: World, ev: Omit<ActivityEvent, 'id' | 'ts' | 'title'> & { ts?: number; title?: string }) {
  const event: ActivityEvent = {
    id: nextId('EVT'),
    ts: ev.ts ?? Date.now(),
    title: ev.title ?? EVENT_TITLES[ev.type],
    ...ev,
  } as ActivityEvent;
  world.events.unshift(event);
  if (world.events.length > MAX_EVENTS) world.events.length = MAX_EVENTS;
  return event;
}

function seedEvents(world: World, rng: Rng) {
  const now = Date.now();
  const plates = Object.keys(world.vehicles);
  for (let i = 60; i > 0; i--) {
    const ts = now - i * int(rng, 20, 90) * 1000;
    const plate = pick(rng, plates);
    const v = world.vehicles[plate];
    const type = pick(rng, [
      'vehicle_entered', 'vehicle_exited', 'payment_completed', 'barrier_opened',
      'barrier_closed', 'visitor_registered', 'recognition_failed',
    ] as EventType[]);
    pushEvent(world, {
      type, ts,
      detail: describeEvent(type, v, rng),
      plate,
      floorId: v.floorId,
      spaceCode: v.spaceCode,
      amount: type === 'payment_completed' ? int(rng, 60, 900) : undefined,
    });
  }
}

function describeEvent(type: EventType, v: Vehicle, rng: Rng) {
  switch (type) {
    case 'vehicle_entered':
      return `${v.plate} · ${v.ownerType === 'employee' ? v.ownerName : 'Visitor'} · Entry Lane ${int(rng, 1, 2)}`;
    case 'vehicle_exited':
      return `${v.plate} · duration ${int(rng, 1, 7)}h ${int(rng, 10, 59)}m · Exit Lane ${int(rng, 1, 2)}`;
    case 'payment_completed':
      return `${v.plate} · card terminal ${int(rng, 1, 3)}`;
    case 'barrier_opened':
      return `Entry Barrier ${int(rng, 1, 2)} · auto mode`;
    case 'barrier_closed':
      return `Entry Barrier ${int(rng, 1, 2)} · vehicle cleared loop`;
    case 'visitor_registered':
      return `${v.plate} · ${v.company ?? 'Walk-in'}`;
    case 'recognition_failed':
      return `Low confidence read at Entry Lane ${int(rng, 1, 2)} · manual review`;
    default:
      return v.plate;
  }
}

/* ------------------------------------------------------------------- alerts */

const ALERT_META: Record<AlertType, { severity: AlertSeverity; title: string }> = {
  occupancy_80: { severity: 'warning', title: 'Plaza 80% Full' },
  parking_full: { severity: 'critical', title: 'Parking Full' },
  floor_full: { severity: 'critical', title: 'Floor Full' },
  camera_offline: { severity: 'critical', title: 'Camera Offline' },
  recognition_failed: { severity: 'warning', title: 'Recognition Failed' },
  barrier_offline: { severity: 'critical', title: 'Barrier Offline' },
  api_failure: { severity: 'critical', title: 'API Failure' },
  communication_failure: { severity: 'warning', title: 'Communication Failure' },
  emergency_mode: { severity: 'critical', title: 'Emergency Mode Active' },
};

export function raiseAlert(
  world: World,
  type: AlertType,
  message: string,
  opts: { source?: string; floorId?: FloorId; dedupeKey?: string } = {},
) {
  const meta = ALERT_META[type];
  // Never stack duplicates for the same source — operators drown in noise.
  const existing = world.alerts.find(
    (a) => !a.resolved && a.type === type && a.source === (opts.source ?? type),
  );
  if (existing) return existing;

  const alert: Alert = {
    id: nextId('ALR'),
    type,
    severity: meta.severity,
    title: meta.title,
    message,
    ts: Date.now(),
    source: opts.source ?? type,
    floorId: opts.floorId,
    acknowledged: false,
    resolved: false,
  };
  world.alerts.unshift(alert);
  if (world.alerts.length > 200) world.alerts.length = 200;
  return alert;
}

export function resolveAlerts(world: World, predicate: (a: Alert) => boolean) {
  for (let i = 0; i < world.alerts.length; i++) {
    const a = world.alerts[i];
    if (!a.resolved && predicate(a)) world.alerts[i] = { ...a, resolved: true };
  }
}

function seedAlerts(world: World, rng: Rng) {
  for (const id of world.cameraIds) {
    const cam = world.cameras[id];
    if (cam.health === 'offline') {
      raiseAlert(world, 'camera_offline', `${cam.name} stopped responding — no heartbeat`, {
        source: cam.id,
        floorId: cam.floorId,
      });
    }
  }
  const stats = floorStats(world);
  for (const f of stats) {
    if (f.occupancyPct >= 99) {
      raiseAlert(world, 'floor_full', `${f.name} has no available bays`, { source: f.floorId, floorId: f.floorId });
    }
  }
  const kpis = computeKpis(world);
  if (kpis.occupancyPct >= 80) {
    raiseAlert(world, 'occupancy_80', `Plaza occupancy at ${kpis.occupancyPct.toFixed(1)}% — ${kpis.available} bays remaining`, {
      source: 'plaza',
    });
  }
  raiseAlert(world, 'communication_failure', 'Payment terminal 3 dropped 2 heartbeats in the last 5 minutes', {
    source: 'POS-3',
  });
  raiseAlert(world, 'recognition_failed', `${world.counters.failedRecognitions} plate reads failed today — above the 15/day threshold`, {
    source: 'anpr',
  });
  // Backdate so the wall does not look like everything broke at once.
  world.alerts.forEach((a, i) => {
    a.ts = Date.now() - int(rng, 2, 90) * MINUTE - i * MINUTE;
  });
  world.alerts.sort((a, b) => b.ts - a.ts);
}

/* --------------------------------------------------------------- simulation */

export type WorldListener = (world: World) => void;

export interface OperatorActionResult {
  ok: boolean;
  message: string;
}

/**
 * Owns the mutable world and advances it on a timer.
 *
 * Mutations replace the changed record (`spaces[id] = {...}`) rather than
 * editing in place, so memoised tiles only re-render when their own bay moves.
 */
export class PlazaSimulation {
  private world: World;
  private listeners = new Set<WorldListener>();
  private timer?: ReturnType<typeof setInterval>;
  private clockTimer?: ReturnType<typeof setInterval>;
  private rng: Rng = Math.random;
  /** Simulated network fault injection, toggled from Settings. */
  public faultInjection = false;

  constructor() {
    this.world = createWorld();
    this.sampleOccupancy();
  }

  getState = () => this.world;

  subscribe = (fn: WorldListener) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    this.world = { ...this.world, version: this.world.version + 1 };
    for (const fn of this.listeners) fn(this.world);
  }

  start(intervalMs = 2200) {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), intervalMs);
    // Heartbeat: keeps "last sync" honest even in a quiet minute.
    this.clockTimer = setInterval(() => {
      const w = this.world;
      w.health = {
        ...w.health,
        lastSync: Date.now(),
        latencyMs: Math.round(28 + Math.random() * 46),
      };
      this.emit();
    }, 5000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.timer = undefined;
    this.clockTimer = undefined;
  }

  private sampleOccupancy() {
    const occupied = this.world.spaceIds.reduce(
      (n, id) => n + (this.world.spaces[id].status === 'occupied' ? 1 : 0),
      0,
    );
    const samples = this.world.counters.occupancySamples;
    samples.push({ ts: Date.now(), occupied });
    // Keep ~15 minutes of samples.
    while (samples.length > 400 || (samples.length > 2 && Date.now() - samples[0].ts > 15 * MINUTE)) {
      samples.shift();
    }
    this.world.counters.peakOccupancy = Math.max(this.world.counters.peakOccupancy, occupied);
  }

  /** One simulated site-wide update. */
  private tick() {
    const w = this.world;
    const rng = this.rng;
    const now = Date.now();
    const touchedCameras: string[] = [];

    // Arrivals / departures, weighted by the hour of day.
    const hour = new Date().getHours();
    const arrivalBias = hour >= 7 && hour < 11 ? 0.72 : hour >= 16 && hour < 20 ? 0.24 : 0.5;
    const moves = int(rng, 1, 4);

    for (let i = 0; i < moves; i++) {
      const arriving = chance(rng, arrivalBias);
      if (arriving) this.simulateArrival(touchedCameras);
      else this.simulateDeparture(touchedCameras);
    }

    // ANPR misread — drives the visitor-registration workflow.
    if (chance(rng, 0.06)) {
      w.counters.failedRecognitions++;
      const lane = pick(rng, w.lanes.filter((l) => l.direction === 'entry'));
      this.setLane(lane.id, { recognition: 'failed', lastPlateTs: now });
      pushEvent(w, {
        type: 'recognition_failed',
        detail: `Unreadable plate at ${lane.name} — visitor registration required`,
        cameraId: lane.cameraId,
      });
      if (w.counters.failedRecognitions % 5 === 0) {
        raiseAlert(w, 'recognition_failed', `${w.counters.failedRecognitions} failed reads today — review ANPR calibration`, {
          source: 'anpr',
        });
      }
    }

    // Camera faults, and recovery.
    if (chance(rng, 0.02)) {
      const online = w.cameraIds.filter((id) => w.cameras[id].health === 'online');
      if (online.length) {
        const id = pick(rng, online);
        const cam = w.cameras[id];
        w.cameras[id] = { ...cam, health: 'offline', recording: false, lastHeartbeat: now };
        touchedCameras.push(id);
        pushEvent(w, { type: 'camera_offline', detail: `${cam.name} lost connection`, cameraId: id, floorId: cam.floorId });
        raiseAlert(w, 'camera_offline', `${cam.name} stopped responding — no heartbeat`, {
          source: id,
          floorId: cam.floorId,
        });
      }
    }
    if (chance(rng, 0.035)) {
      const offline = w.cameraIds.filter((id) => w.cameras[id].health === 'offline');
      if (offline.length > 2) {
        const id = pick(rng, offline);
        const cam = w.cameras[id];
        w.cameras[id] = { ...cam, health: 'online', recording: true, lastHeartbeat: now };
        touchedCameras.push(id);
        pushEvent(w, { type: 'camera_restored', detail: `${cam.name} back online`, cameraId: id, floorId: cam.floorId });
        resolveAlerts(w, (a) => a.type === 'camera_offline' && a.source === id);
      }
    }

    // Lane queues and recognition state machine.
    this.tickLanes();

    // Occasional degraded link — exercises the connection banner.
    if (this.faultInjection && chance(rng, 0.12)) {
      this.setConnection('degraded');
      raiseAlert(w, 'communication_failure', 'Parking API responded slowly (>2000 ms) on 3 consecutive polls', {
        source: 'api-gateway',
      });
    } else if (w.health.connection === 'degraded' && chance(rng, 0.3)) {
      this.setConnection('connected');
      resolveAlerts(w, (a) => a.type === 'communication_failure' && a.source === 'api-gateway');
    }

    this.sampleOccupancy();
    this.evaluateOccupancyAlerts();
    refreshCameraCoverage(w, touchedCameras.length ? touchedCameras : undefined);
    w.health = { ...w.health, lastSync: now };
    this.emit();
  }

  private simulateArrival(touched: string[]) {
    const w = this.world;
    const rng = this.rng;
    const vacant = w.spaceIds.filter((id) => w.spaces[id].status === 'vacant');
    if (!vacant.length) return;

    // Drivers fill the lowest floor first — that is what the ramp signage says.
    vacant.sort((a, b) => w.spaces[a].floorId.localeCompare(w.spaces[b].floorId));
    const candidates = vacant.slice(0, Math.max(1, Math.floor(vacant.length * 0.4)));
    const spaceId = pick(rng, candidates);
    const space = w.spaces[spaceId];

    const isEmployee = chance(rng, 0.68);
    let plate: string;
    if (isEmployee) {
      const pool = w.employees.filter(
        (e) =>
          e.status === 'active' &&
          (e.vehicleClass === 'motorcycle') === (space.vehicleClass === 'motorcycle') &&
          !w.vehicles[e.plate]?.inside,
      );
      if (!pool.length) return;
      plate = pick(rng, pool).plate;
    } else {
      plate = `${pick(rng, PLATE_PREFIXES)}-${int(rng, 100, 9999)}`;
      if (!w.vehicles[plate]) {
        const v = buildVehicleFor(rng, plate);
        v.vehicleClass = space.vehicleClass;
        v.make = space.vehicleClass === 'car' ? pick(rng, CAR_MAKES) : pick(rng, BIKE_MAKES);
        w.vehicles[plate] = v;
      }
      if (w.vehicles[plate].inside) return;
    }

    const now = Date.now();
    const v = w.vehicles[plate];
    w.vehicles[plate] = {
      ...v,
      inside: true,
      floorId: space.floorId,
      spaceId: space.id,
      spaceCode: space.code,
      entryTime: now,
      exitTime: undefined,
    };
    w.spaces[spaceId] = { ...space, status: 'occupied', plate, since: now };
    touched.push(space.cameraId);
    w.counters.entriesToday++;

    pushEvent(w, {
      type: 'vehicle_entered',
      detail: `${plate} · ${v.ownerType === 'employee' ? v.ownerName : v.company ?? 'Visitor'} · bay ${space.code}`,
      plate,
      floorId: space.floorId,
      spaceCode: space.code,
    });
    pushEvent(w, {
      type: 'space_occupied',
      detail: `${space.code} occupied by ${plate}`,
      plate,
      floorId: space.floorId,
      spaceCode: space.code,
    });

    if (v.ownerType === 'visitor') {
      w.counters.visitorsRegisteredToday++;
      w.visitors.unshift({
        id: `VIS-${w.visitors.length + 1000}`,
        ticket: `T-${int(rng, 10000, 99999)}`,
        plate,
        name: v.ownerName,
        phone: v.phone ?? '',
        company: v.company ?? '',
        purpose: pick(rng, PURPOSES),
        cnic: cnic(rng),
        host: fullName(rng),
        hostDepartment: pick(rng, DEPARTMENTS),
        vehicleClass: v.vehicleClass,
        entryTime: now,
        status: 'inside',
        charges: 0,
        paymentStatus: 'unpaid',
        spaceCode: space.code,
        floorId: space.floorId,
      });
      pushEvent(w, {
        type: 'visitor_registered',
        detail: `${plate} · ${v.company ?? 'Walk-in'} · ticket issued`,
        plate,
        floorId: space.floorId,
      });
    }
  }

  private simulateDeparture(touched: string[]) {
    const w = this.world;
    const rng = this.rng;
    const occupied = w.spaceIds.filter((id) => w.spaces[id].status === 'occupied');
    if (!occupied.length) return;

    // Longest-parked vehicles are likeliest to leave.
    const sorted = occupied.sort((a, b) => w.spaces[a].since - w.spaces[b].since);
    const spaceId = pick(rng, sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.25))));
    const space = w.spaces[spaceId];
    const plate = space.plate;
    if (!plate) return;

    const now = Date.now();
    const v = w.vehicles[plate];
    const dwell = now - space.since;

    w.spaces[spaceId] = { ...space, status: 'vacant', plate: undefined, since: now };
    touched.push(space.cameraId);
    w.counters.exitsToday++;

    if (v) {
      const isVisitor = v.ownerType === 'visitor';
      const charge = isVisitor
        ? Math.max(50, Math.round((dwell / HOUR) * (v.vehicleClass === 'car' ? 60 : 30)))
        : 0;
      w.vehicles[plate] = {
        ...v,
        inside: false,
        spaceId: undefined,
        spaceCode: undefined,
        floorId: undefined,
        exitTime: now,
        paymentStatus: isVisitor ? 'paid' : v.subscription && v.subscription !== 'none' ? 'subscription' : 'waived',
      };

      pushEvent(w, {
        type: 'vehicle_exited',
        detail: `${plate} · dwell ${Math.floor(dwell / HOUR)}h ${Math.floor((dwell % HOUR) / MINUTE)}m · bay ${space.code} released`,
        plate,
        floorId: space.floorId,
        spaceCode: space.code,
      });

      if (isVisitor && charge > 0) {
        w.revenue = {
          ...w.revenue,
          today: w.revenue.today + charge,
          visitorRevenue: w.revenue.visitorRevenue + charge,
          transactionsToday: w.revenue.transactionsToday + 1,
        };
        w.counters.paymentsToday++;
        pushEvent(w, {
          type: 'payment_completed',
          detail: `${plate} · PKR ${charge} · exit terminal`,
          plate,
          amount: charge,
        });
        const idx = w.visitors.findIndex((x) => x.plate === plate && !x.exitTime);
        if (idx >= 0) {
          w.visitors[idx] = {
            ...w.visitors[idx],
            exitTime: now,
            status: 'departed',
            charges: charge,
            paymentStatus: 'paid',
          };
        }
      }
    }

    pushEvent(w, {
      type: 'space_released',
      detail: `${space.code} released`,
      floorId: space.floorId,
      spaceCode: space.code,
    });
  }

  private tickLanes() {
    const w = this.world;
    const rng = this.rng;
    const now = Date.now();

    w.lanes = w.lanes.map((lane) => {
      let queue = lane.queue.slice();

      // Vehicles join the queue…
      if (chance(rng, lane.direction === 'entry' ? 0.42 : 0.34) && queue.length < 6) {
        const plate = `${pick(rng, PLATE_PREFIXES)}-${int(rng, 100, 9999)}`;
        const known = w.vehicles[plate];
        queue.push({
          plate,
          arrivedAt: now,
          ownerType: known?.ownerType ?? (chance(rng, 0.6) ? 'employee' : 'visitor'),
          vehicleClass: known?.vehicleClass ?? (chance(rng, 0.2) ? 'motorcycle' : 'car'),
          confidence: float(rng, 0.55, 0.999),
        });
      }

      // …and the head of the queue is processed.
      let recognition = lane.recognition;
      let lastPlate = lane.lastPlate;
      let lastPlateTs = lane.lastPlateTs;
      let lastConfidence = lane.lastConfidence;

      if (queue.length && chance(rng, 0.55)) {
        const head = queue[0];
        if (recognition === 'idle' || recognition === 'matched' || recognition === 'failed') {
          recognition = 'reading';
        } else {
          const ok = head.confidence > 0.72;
          recognition = ok ? 'matched' : 'failed';
          lastPlate = head.plate;
          lastPlateTs = now;
          lastConfidence = head.confidence;
          queue = queue.slice(1);
          if (!ok) w.counters.failedRecognitions++;
        }
      } else if (!queue.length && recognition === 'reading') {
        recognition = 'idle';
      }

      return { ...lane, queue, recognition, lastPlate, lastPlateTs, lastConfidence, snapshotSeed: lane.snapshotSeed + (lastPlateTs === now ? 1 : 0) };
    });

    // Barriers in auto mode cycle with the lane.
    w.barriers = w.barriers.map((b) => {
      if (b.mode !== 'auto') return b;
      const lane = w.lanes.find((l) => l.id === b.laneId);
      if (!lane) return b;
      const shouldOpen = lane.recognition === 'matched' && now - (lane.lastPlateTs ?? 0) < 4000;
      if (shouldOpen && b.status !== 'open') {
        pushEvent(w, { type: 'barrier_opened', detail: `${b.name} · plate ${lane.lastPlate} matched`, actor: 'System (AUTO)' });
        return {
          ...b,
          status: 'open',
          lastAction: `Auto-open · ${lane.lastPlate ?? 'match'}`,
          lastActionTs: now,
          lastOperator: 'System (AUTO)',
          cyclesToday: b.cyclesToday + 1,
        };
      }
      if (!shouldOpen && b.status === 'open') {
        pushEvent(w, { type: 'barrier_closed', detail: `${b.name} · vehicle cleared loop`, actor: 'System (AUTO)' });
        return { ...b, status: 'closed', lastAction: 'Auto-close · loop cleared', lastActionTs: now, lastOperator: 'System (AUTO)' };
      }
      return b;
    });
  }

  private evaluateOccupancyAlerts() {
    const w = this.world;
    const kpis = computeKpis(w);

    if (kpis.occupancyPct >= 99.5) {
      raiseAlert(w, 'parking_full', 'Plaza is at capacity — divert arrivals to overflow lot', { source: 'plaza-full' });
    } else {
      resolveAlerts(w, (a) => a.type === 'parking_full');
    }

    if (kpis.occupancyPct >= 80) {
      raiseAlert(w, 'occupancy_80', `Plaza occupancy at ${kpis.occupancyPct.toFixed(1)}% — ${kpis.available} bays remaining`, {
        source: 'plaza',
      });
    } else if (kpis.occupancyPct < 76) {
      // Hysteresis: clear at 76% so the alert does not flap on the threshold.
      resolveAlerts(w, (a) => a.type === 'occupancy_80');
    }

    for (const f of floorStats(w)) {
      if (f.occupancyPct >= 99) {
        const raised = raiseAlert(w, 'floor_full', `${f.name} has no available bays`, {
          source: f.floorId,
          floorId: f.floorId,
        });
        if (raised.ts > Date.now() - 3000) {
          pushEvent(w, { type: 'floor_full', detail: `${f.name} reached capacity`, floorId: f.floorId });
        }
      } else if (f.occupancyPct < 96) {
        resolveAlerts(w, (a) => a.type === 'floor_full' && a.source === f.floorId);
      }
    }
  }

  /* ------------------------------------------------------ operator commands */

  private setLane(laneId: string, patch: Partial<Lane>) {
    this.world.lanes = this.world.lanes.map((l) => (l.id === laneId ? { ...l, ...patch } : l));
  }

  setConnection(state: ConnectionState) {
    this.world.health = { ...this.world.health, connection: state };
    this.emit();
  }

  commandBarrier(
    barrierId: string,
    command: 'open' | 'close' | 'emergency' | 'auto',
    operator: string,
  ): OperatorActionResult {
    const w = this.world;
    const barrier = w.barriers.find((b) => b.id === barrierId);
    if (!barrier) return { ok: false, message: 'Barrier not found' };
    if (barrier.connection === 'lost') {
      return { ok: false, message: `${barrier.name} is unreachable — command rejected` };
    }

    const now = Date.now();
    const patch: Partial<Barrier> = { lastActionTs: now, lastOperator: operator };

    switch (command) {
      case 'open':
        patch.status = 'open';
        patch.mode = 'manual';
        patch.lastAction = 'Manual open';
        patch.cyclesToday = barrier.cyclesToday + 1;
        pushEvent(w, { type: 'barrier_opened', detail: `${barrier.name} opened manually`, actor: operator });
        break;
      case 'close':
        patch.status = 'closed';
        patch.mode = 'manual';
        patch.lastAction = 'Manual close';
        pushEvent(w, { type: 'barrier_closed', detail: `${barrier.name} closed manually`, actor: operator });
        break;
      case 'emergency':
        patch.status = 'open';
        patch.mode = 'emergency';
        patch.lastAction = 'Emergency release — barrier held open';
        pushEvent(w, { type: 'emergency_mode', detail: `${barrier.name} placed in emergency release`, actor: operator });
        raiseAlert(w, 'emergency_mode', `${barrier.name} is in emergency release — all vehicles pass without validation`, {
          source: barrier.id,
        });
        break;
      case 'auto':
        patch.mode = 'auto';
        patch.status = 'closed';
        patch.lastAction = 'Returned to automatic mode';
        pushEvent(w, { type: 'operator_action', detail: `${barrier.name} returned to automatic mode`, actor: operator });
        resolveAlerts(w, (a) => a.type === 'emergency_mode' && a.source === barrier.id);
        break;
    }

    w.barriers = w.barriers.map((b) => (b.id === barrierId ? { ...b, ...patch } : b));
    this.emit();
    return { ok: true, message: `${barrier.name}: ${patch.lastAction}` };
  }

  /** Site-wide emergency: every barrier released and held open. */
  emergencyAll(operator: string): OperatorActionResult {
    for (const b of this.world.barriers) this.commandBarrier(b.id, 'emergency', operator);
    raiseAlert(this.world, 'emergency_mode', 'Plaza-wide emergency release engaged — all barriers held open', {
      source: 'plaza',
    });
    this.emit();
    return { ok: true, message: 'Emergency release engaged on all lanes' };
  }

  acknowledgeAlert(id: string, operator: string) {
    this.world.alerts = this.world.alerts.map((a) =>
      a.id === id ? { ...a, acknowledged: true, acknowledgedBy: operator } : a,
    );
    this.emit();
  }

  resolveAlert(id: string) {
    this.world.alerts = this.world.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a));
    this.emit();
  }

  acknowledgeAll(operator: string) {
    this.world.alerts = this.world.alerts.map((a) =>
      a.resolved || a.acknowledged ? a : { ...a, acknowledged: true, acknowledgedBy: operator },
    );
    this.emit();
  }

  /** Register a walk-in whose plate ANPR could not read. */
  registerVisitor(input: {
    plate: string;
    name: string;
    phone: string;
    company: string;
    purpose: string;
    cnic: string;
    host: string;
    hostDepartment: string;
    vehicleClass: 'car' | 'motorcycle';
  }): { visitor: Visitor; space?: ParkingSpace } {
    const w = this.world;
    const now = Date.now();
    const plate = input.plate.toUpperCase().trim();

    const vacant = w.spaceIds.find(
      (id) => w.spaces[id].status === 'vacant' && w.spaces[id].vehicleClass === input.vehicleClass,
    );
    const space = vacant ? w.spaces[vacant] : undefined;

    const vehicle: Vehicle = {
      plate,
      vehicleClass: input.vehicleClass,
      make: input.vehicleClass === 'car' ? 'Unidentified' : 'Motorcycle',
      colour: 'Unknown',
      ownerType: 'visitor',
      ownerName: input.name,
      company: input.company,
      phone: input.phone,
      inside: true,
      floorId: space?.floorId,
      spaceId: space?.id,
      spaceCode: space?.code,
      entryTime: now,
      paymentStatus: 'unpaid',
      snapshotSeed: Math.floor(Math.random() * 99999),
      confidence: 1,
    };
    w.vehicles[plate] = vehicle;

    if (space) {
      w.spaces[space.id] = { ...space, status: 'occupied', plate, since: now };
      refreshCameraCoverage(w, [space.cameraId]);
    }

    const visitor: Visitor = {
      id: `VIS-${w.visitors.length + 1000}`,
      ticket: `T-${Math.floor(10000 + Math.random() * 89999)}`,
      plate,
      name: input.name,
      phone: input.phone,
      company: input.company,
      purpose: input.purpose,
      cnic: input.cnic,
      host: input.host,
      hostDepartment: input.hostDepartment,
      vehicleClass: input.vehicleClass,
      entryTime: now,
      status: 'inside',
      charges: 0,
      paymentStatus: 'unpaid',
      spaceCode: space?.code,
      floorId: space?.floorId,
    };
    w.visitors.unshift(visitor);
    w.counters.visitorsRegisteredToday++;
    w.counters.entriesToday++;

    pushEvent(w, {
      type: 'visitor_registered',
      detail: `${plate} · ${input.name} · ${input.company} · ticket ${visitor.ticket}`,
      plate,
      spaceCode: space?.code,
      floorId: space?.floorId,
    });
    this.emit();
    return { visitor, space };
  }

  /** Manual override when an operator types a plate ANPR could not read. */
  overridePlate(laneId: string, plate: string, operator: string): OperatorActionResult {
    const lane = this.world.lanes.find((l) => l.id === laneId);
    if (!lane) return { ok: false, message: 'Lane not found' };
    this.setLane(laneId, {
      recognition: 'matched',
      lastPlate: plate.toUpperCase(),
      lastPlateTs: Date.now(),
      lastConfidence: 1,
      queue: lane.queue.slice(1),
    });
    pushEvent(this.world, {
      type: 'operator_action',
      detail: `Manual plate override at ${lane.name} → ${plate.toUpperCase()}`,
      plate: plate.toUpperCase(),
      actor: operator,
    });
    this.emit();
    return { ok: true, message: `Plate ${plate.toUpperCase()} accepted at ${lane.name}` };
  }

  /** Force a bay's state — used by supervisors to correct a stuck sensor. */
  overrideSpace(spaceId: string, status: 'vacant' | 'occupied', operator: string): OperatorActionResult {
    const w = this.world;
    const space = w.spaces[spaceId];
    if (!space) return { ok: false, message: 'Bay not found' };
    if (space.status === status) return { ok: false, message: `${space.code} is already ${status}` };

    if (status === 'vacant' && space.plate) {
      const v = w.vehicles[space.plate];
      if (v) w.vehicles[space.plate] = { ...v, inside: false, spaceId: undefined, spaceCode: undefined, exitTime: Date.now() };
    }
    w.spaces[spaceId] = {
      ...space,
      status,
      plate: status === 'vacant' ? undefined : space.plate,
      since: Date.now(),
    };
    refreshCameraCoverage(w, [space.cameraId]);
    pushEvent(w, {
      type: 'operator_action',
      detail: `Bay ${space.code} manually set to ${status}`,
      spaceCode: space.code,
      floorId: space.floorId,
      actor: operator,
    });
    this.emit();
    return { ok: true, message: `${space.code} set to ${status}` };
  }

  toggleCamera(cameraId: string, operator: string): OperatorActionResult {
    const w = this.world;
    const cam = w.cameras[cameraId];
    if (!cam) return { ok: false, message: 'Camera not found' };
    const nextHealth = cam.health === 'offline' ? 'online' : 'offline';
    w.cameras[cameraId] = {
      ...cam,
      health: nextHealth,
      recording: nextHealth === 'online',
      lastHeartbeat: Date.now(),
    };
    if (nextHealth === 'online') {
      resolveAlerts(w, (a) => a.type === 'camera_offline' && a.source === cameraId);
      pushEvent(w, { type: 'camera_restored', detail: `${cam.name} restored by operator`, cameraId, actor: operator });
    } else {
      raiseAlert(w, 'camera_offline', `${cam.name} taken offline by operator`, { source: cameraId, floorId: cam.floorId });
      pushEvent(w, { type: 'camera_offline', detail: `${cam.name} taken offline`, cameraId, actor: operator });
    }
    refreshCameraCoverage(w, [cameraId]);
    this.emit();
    return { ok: true, message: `${cam.name} is now ${nextHealth}` };
  }
}

/** Single shared instance — the app's "connection" to the plaza. */
export const simulation = new PlazaSimulation();
