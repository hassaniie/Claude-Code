/**
 * Deterministic world builder for NASTP Tenant Operations.
 *
 * Everything a screen renders is generated here from fixed seeds, so the
 * ecosystem is identical on every reload. Timestamps are anchored to the moment
 * the module loads (`NOW`) so "today", overstays and due-dates stay honest,
 * exactly as a real deployment would compute them against wall-clock time.
 *
 * The generator is intentionally the *only* place that knows how records are
 * shaped from seeds. `api.ts` reads this world; `live.ts` mutates the small,
 * push-style corners of it (meter snapshots, visitor status). Swapping in a
 * real backend means replacing `api.ts` — this file simply stops being built.
 */

import { chance, float, int, mulberry32, pick, shuffle, type Rng } from '../lib/rng';
import {
  BUILDING_SEEDS, DESIGNATIONS, FIRST_NAMES, LAST_NAMES, METER_MODELS, ORG_SEEDS,
  SERVICE_TITLES, VISITOR_COMPANIES, VISITOR_PURPOSES,
} from './catalog';
import type {
  ActivityEvent, ActivityKind, AlertKind, AlertRule, AppNotification, Building, EnergyAlert,
  Floor, Invoice, Meter, MeterReading, OfficeSpace, PeakWindow, ServiceCategory, ServiceRequest,
  ServiceStatus, Tariff, Tenant, TenantStatus, TenantUser, Visitor, VisitorSchedule, VisitorStatus,
} from './types';

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;
const startOfToday = (() => {
  const d = new Date(NOW);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

export interface World {
  now: number;
  buildings: Building[];
  buildingById: Record<string, Building>;
  floors: Floor[];
  floorById: Record<string, Floor>;
  offices: OfficeSpace[];
  officeById: Record<string, OfficeSpace>;
  tenants: Tenant[];
  tenantById: Record<string, Tenant>;
  users: TenantUser[];
  meters: Meter[];
  meterById: Record<string, Meter>;
  tariffs: Tariff[];
  peakWindows: PeakWindow[];
  invoices: Invoice[];
  visitors: Visitor[];
  visitorSchedules: VisitorSchedule[];
  requests: ServiceRequest[];
  alerts: EnergyAlert[];
  alertRules: Record<string, AlertRule[]>;
  notifications: AppNotification[];
  activity: ActivityEvent[];
  /** Aggregated tenant-level consumption series, indexed by tenantId. */
  readings: Record<string, { hourly: MeterReading[]; daily: MeterReading[]; monthly: MeterReading[] }>;
}

/* ---------------------------------------------------------------- helpers */

const fullName = (rng: Rng) => `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const emailFor = (name: string, domain: string) =>
  `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/(^\.|\.$)/g, '')}@${domain}`;
const phone = (rng: Rng) => `+92 3${int(rng, 10, 49)} ${int(rng, 1000000, 9999999)}`;
const cnic = (rng: Rng) => `${int(rng, 10000, 99999)}-${int(rng, 1000000, 9999999)}-${int(rng, 1, 9)}`;

/**
 * Typical office load curve — 24 hourly multipliers of the tenant base load.
 * Quiet overnight, ramp from 08:00, midday plateau, a dip, an evening tail.
 */
const LOAD_CURVE = [
  0.28, 0.26, 0.25, 0.25, 0.27, 0.32, 0.45, 0.62, 0.85, 0.96, 1.0, 0.98,
  0.9, 0.94, 0.99, 0.97, 0.88, 0.74, 0.66, 0.58, 0.5, 0.42, 0.36, 0.31,
];

const PEAK_START = 18;
const PEAK_END = 22;
const isPeakHour = (h: number) => h >= PEAK_START && h < PEAK_END;

/* ------------------------------------------------------ physical catalog */

function buildPhysical(rng: Rng) {
  const buildings: Building[] = [];
  const floors: Floor[] = [];
  const meters: Meter[] = [];

  for (const bs of BUILDING_SEEDS) {
    const floorIds: string[] = [];
    let gross = 0;
    for (const fs of bs.floors) {
      const floorId = `${bs.id}-${fs.level}`;
      floorIds.push(floorId);
      gross += fs.netLeasableSqft;
      const mainMeterId = `MTR-${bs.code}${fs.level}-MAIN`;
      floors.push({
        id: floorId,
        buildingId: bs.id,
        name: fs.name,
        level: fs.level,
        mainMeterId,
        netLeasableSqft: fs.netLeasableSqft,
      });
      meters.push(makeMainMeter(rng, mainMeterId, bs.id, floorId));
    }
    buildings.push({
      id: bs.id,
      name: bs.name,
      code: bs.code,
      floorIds,
      address: bs.address,
      grossAreaSqft: gross,
    });
  }
  return { buildings, floors, meters };
}

function makeMainMeter(rng: Rng, id: string, buildingId: string, floorId: string): Meter {
  const load = float(rng, 180, 320);
  return {
    id,
    serial: id.replace('MTR-', ''),
    name: 'Floor Main Incomer',
    kind: 'main',
    buildingId,
    floorId,
    tenantId: null,
    officeId: null,
    status: 'online',
    model: pick(rng, METER_MODELS),
    ctRatio: '1000/5A',
    installedAt: NOW - int(rng, 400, 900) * DAY,
    lastReadingAt: NOW - int(rng, 1, 40) * 1000,
    live: snapshotFor(load, new Date(NOW).getHours()),
    totalKwh: float(rng, 900_000, 1_800_000),
  };
}

/** Build an electrical snapshot consistent with a target power draw. */
export function snapshotFor(baseKw: number, hour: number): ReturnType<typeof compute> {
  return compute(baseKw, hour);
}

function compute(baseKw: number, hour: number) {
  const mult = LOAD_CURVE[((hour % 24) + 24) % 24];
  const powerKw = Math.max(0.2, baseKw * mult);
  const pf = Math.min(0.99, Math.max(0.78, 0.94 - (1 - mult) * 0.06));
  const apparentKva = powerKw / pf;
  const reactiveKvar = Math.sqrt(Math.max(0, apparentKva * apparentKva - powerKw * powerKw));
  const voltage = 400 + (Math.sin(hour) * 3);
  const current = (apparentKva * 1000) / (Math.sqrt(3) * voltage);
  return {
    powerKw: round(powerKw, 1),
    voltage: round(voltage, 1),
    current: round(current, 1),
    powerFactor: round(pf, 3),
    frequency: round(49.94 + Math.random() * 0.12, 2),
    apparentKva: round(apparentKva, 1),
    reactiveKvar: round(reactiveKvar, 1),
    maxDemandKw: round(baseKw * 1.02, 1),
    peakDemandKw: round(baseKw * 1.12, 1),
  };
}

const round = (v: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/* ------------------------------------------------------------- tariffs */

function buildTariffs(): Tariff[] {
  // A prior schedule and the current one, so historical bills stay bound to the
  // rate that applied when they were metered.
  const q1End = startOfToday - 120 * DAY;
  return [
    {
      id: 'tariff-2025q4',
      name: 'FY25 Q4 Schedule',
      effectiveFrom: q1End - 90 * DAY,
      effectiveTo: q1End,
      rates: [
        { component: 'energy', rate: 41.5 },
        { component: 'genset', rate: 58.0 },
        { component: 'peak', rate: 49.0 },
        { component: 'off_peak', rate: 36.0 },
      ],
      note: 'Superseded by the FY26 schedule.',
    },
    {
      id: 'tariff-2026',
      name: 'FY26 Standard Schedule',
      effectiveFrom: q1End,
      effectiveTo: null,
      rates: [
        { component: 'energy', rate: 44.75 },
        { component: 'genset', rate: 62.5 },
        { component: 'peak', rate: 52.5 },
        { component: 'off_peak', rate: 38.25 },
      ],
      note: 'Current schedule. Applies to all active tenants.',
    },
  ];
}

const PEAK_WINDOWS: PeakWindow[] = [
  { id: 'pw-evening', label: 'Evening Peak', startHour: 18, endHour: 22, days: [1, 2, 3, 4, 5] },
];

function tariffFor(tariffs: Tariff[], ts: number) {
  return (
    tariffs.find((t) => ts >= t.effectiveFrom && (t.effectiveTo === null || ts < t.effectiveTo)) ??
    tariffs[tariffs.length - 1]
  );
}
const rateOf = (t: Tariff, c: 'energy' | 'genset' | 'peak' | 'off_peak') =>
  t.rates.find((r) => r.component === c)?.rate ?? 0;

/* --------------------------------------------------------------- tenants */

/** Lifecycle spread — most tenants are live, a realistic tail is mid-pipeline. */
const STATUS_PLAN: TenantStatus[] = [
  'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
  'active', 'active', 'active', 'active', 'active', 'active',
  'pending_activation', 'pending_configuration', 'draft',
  'suspended', 'expired', 'archived', 'active', 'pending_configuration',
];

function buildTenants(rng: Rng, buildings: Building[], floors: Floor[]) {
  const tenants: Tenant[] = [];
  const offices: OfficeSpace[] = [];
  const meters: Meter[] = [];
  const users: TenantUser[] = [];

  // Assign each org to a building/floor, filling floors before spilling over.
  const floorCursor = new Map<string, number>();
  const orderedFloors = shuffle(rng, floors);

  ORG_SEEDS.forEach((org, i) => {
    const status = STATUS_PLAN[i % STATUS_PLAN.length];
    const building = pick(rng, buildings);
    const buildingFloors = floors.filter((f) => f.buildingId === building.id);
    const floor = pick(rng, buildingFloors.length ? buildingFloors : orderedFloors);

    const tenantId = `t-${org.code.toLowerCase()}`;
    const domain = `${slug(org.name).replace(/-/g, '')}.com.pk`;
    const officeCount = pick(rng, [1, 1, 2, 2, 2, 3, 3, 4]);
    const configured = status !== 'draft' && status !== 'pending_configuration';

    const officeIds: string[] = [];
    const meterIds: string[] = [];
    let totalArea = 0;

    for (let o = 0; o < officeCount; o++) {
      const idx = (floorCursor.get(floor.id) ?? 0) + 1;
      floorCursor.set(floor.id, idx);
      const officeId = `${building.code}-${floor.level}-${String(idx).padStart(2, '0')}`;
      const areaSqft = int(rng, 6, 26) * 100;
      totalArea += areaSqft;

      // Sub-meter — every configured tenant office is metered; drafts may lack one.
      let meterId: string | null = null;
      if (configured || o === 0) {
        meterId = `MTR-${org.code}-${o + 1}`;
        const offline = status === 'active' && chance(rng, 0.06);
        meterIds.push(meterId);
        meters.push({
          id: meterId,
          serial: `${org.code}${o + 1}${int(rng, 100, 999)}`,
          name: `${org.name} Sub-meter ${o + 1}`,
          kind: 'sub',
          buildingId: building.id,
          floorId: floor.id,
          tenantId,
          officeId,
          status: offline ? 'offline' : chance(rng, 0.05) ? 'degraded' : 'online',
          model: pick(rng, METER_MODELS),
          ctRatio: '400/5A',
          installedAt: NOW - int(rng, 60, 500) * DAY,
          lastReadingAt: offline ? NOW - int(rng, 30, 220) * 60000 : NOW - int(rng, 1, 50) * 1000,
          live: compute(float(rng, 14, 46), new Date(NOW).getHours()),
          totalKwh: float(rng, 40_000, 260_000),
        });
      }

      offices.push({
        id: officeId,
        code: officeId,
        label: `Suite ${idx}`,
        buildingId: building.id,
        floorId: floor.id,
        tenantId: status === 'archived' ? null : tenantId,
        areaSqft,
        status: status === 'active' || status === 'suspended' ? 'occupied' : 'vacant',
        meterId,
      });
      officeIds.push(officeId);
    }

    const primaryName = fullName(rng);
    const createdAt = NOW - int(rng, 20, 520) * DAY;
    const tenant: Tenant = {
      id: tenantId,
      name: org.name,
      legalName: org.legal,
      code: org.code,
      organizationType: org.type,
      registrationNo: configured ? `SECP-${int(rng, 100000, 999999)}` : undefined,
      ntn: configured ? `${int(rng, 1000000, 9999999)}-${int(rng, 1, 9)}` : undefined,
      status,
      primaryContact: {
        name: primaryName,
        designation: pick(rng, DESIGNATIONS),
        email: emailFor(primaryName, domain),
        phone: phone(rng),
      },
      secondaryContact: chance(rng, 0.5)
        ? {
            name: fullName(rng),
            designation: pick(rng, DESIGNATIONS),
            email: emailFor(fullName(rng), domain),
            phone: phone(rng),
          }
        : undefined,
      buildingId: building.id,
      floorIds: [floor.id],
      officeIds,
      meterIds,
      logoSeed: i + 1,
      brandHue: org.hue,
      createdAt,
      activatedAt: status === 'active' || status === 'suspended' || status === 'expired'
        ? createdAt + int(rng, 2, 20) * DAY
        : undefined,
      contractStart: configured ? createdAt + 5 * DAY : undefined,
      contractEnd: configured
        ? (status === 'expired' ? NOW - int(rng, 5, 40) * DAY : NOW + int(rng, 40, 600) * DAY)
        : undefined,
      configScore:
        status === 'draft' ? 0.25
        : status === 'pending_configuration' ? float(rng, 0.4, 0.65)
        : status === 'pending_activation' ? float(rng, 0.85, 0.95)
        : 1,
    };
    tenants.push(tenant);

    // Portal users — a primary for anyone past draft, plus a couple extras live.
    if (status !== 'draft') {
      users.push({
        id: `u-${tenantId}-1`,
        tenantId,
        name: primaryName,
        email: tenant.primaryContact.email,
        phone: tenant.primaryContact.phone,
        role: 'primary',
        status: status === 'active' ? 'active' : status === 'suspended' ? 'disabled' : 'invited',
        lastActiveAt: status === 'active' ? NOW - int(rng, 1, 300) * 60000 : undefined,
        invitedAt: createdAt + 3 * DAY,
        avatarSeed: i * 7 + 1,
      });
      if (status === 'active') {
        const extra = pick(rng, [1, 2, 2, 3]);
        const roles: TenantUser['role'][] = ['facility_manager', 'finance_user', 'receptionist', 'standard_user'];
        for (let u = 0; u < extra; u++) {
          const n = fullName(rng);
          users.push({
            id: `u-${tenantId}-${u + 2}`,
            tenantId,
            name: n,
            email: emailFor(n, domain),
            phone: phone(rng),
            role: roles[u % roles.length],
            status: chance(rng, 0.85) ? 'active' : 'invited',
            lastActiveAt: chance(rng, 0.7) ? NOW - int(rng, 5, 5000) * 60000 : undefined,
            invitedAt: createdAt + int(rng, 6, 40) * DAY,
            avatarSeed: i * 7 + u + 2,
          });
        }
      }
    }
  });

  return { tenants, offices, meters, users };
}

/* --------------------------------------------------- energy: readings + bills */

function baseLoadFor(tenant: Tenant, offices: OfficeSpace[]) {
  const area = offices.filter((o) => tenant.officeIds.includes(o.id)).reduce((s, o) => s + o.areaSqft, 0);
  // ~ 5–8 W/sqft connected, expressed as a plausible kW base at plateau.
  return Math.max(6, (area / 1000) * 6.5);
}

function buildReadings(rng: Rng, baseKw: number) {
  const hourly: MeterReading[] = [];
  const nowHour = new Date(NOW).getHours();
  for (let i = 23; i >= 0; i--) {
    const ts = NOW - i * HOUR;
    const h = (nowHour - i + 48) % 24;
    const kw = baseKw * LOAD_CURVE[h] * float(rng, 0.94, 1.06);
    const kwh = kw; // 1h bucket
    const peak = isPeakHour(h) ? kwh : 0;
    hourly.push({
      ts,
      label: `${String(h).padStart(2, '0')}:00`,
      kwh: round(kwh, 1),
      peakKwh: round(peak, 1),
      offPeakKwh: round(kwh - peak, 1),
      demandKw: round(kw * float(rng, 1.02, 1.15), 1),
      powerFactor: round(0.9 + float(rng, -0.05, 0.06), 2),
    });
  }

  const daily: MeterReading[] = [];
  for (let d = 29; d >= 0; d--) {
    const ts = startOfToday - d * DAY;
    const weekend = [0, 6].includes(new Date(ts).getDay());
    const util = weekend ? float(rng, 0.35, 0.5) : float(rng, 0.85, 1.05);
    let dayKwh = 0;
    let peakKwh = 0;
    for (let h = 0; h < 24; h++) {
      const kw = baseKw * LOAD_CURVE[h] * util;
      dayKwh += kw;
      if (isPeakHour(h)) peakKwh += kw;
    }
    daily.push({
      ts,
      label: new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      kwh: round(dayKwh),
      peakKwh: round(peakKwh),
      offPeakKwh: round(dayKwh - peakKwh),
      demandKw: round(baseKw * float(rng, 1.05, 1.2)),
      powerFactor: round(0.9 + float(rng, -0.04, 0.05), 2),
    });
  }

  const monthly: MeterReading[] = [];
  for (let m = 11; m >= 0; m--) {
    const date = new Date(NOW);
    date.setMonth(date.getMonth() - m, 1);
    const days = 30;
    const seasonal = 1 + Math.sin((date.getMonth() / 12) * Math.PI * 2) * 0.14;
    let monthKwh = 0;
    let peakKwh = 0;
    for (let d = 0; d < days; d++) {
      const util = float(rng, 0.6, 1.0) * seasonal;
      for (let h = 0; h < 24; h++) {
        const kw = baseKw * LOAD_CURVE[h] * util;
        monthKwh += kw;
        if (isPeakHour(h)) peakKwh += kw;
      }
    }
    monthly.push({
      ts: date.getTime(),
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
      kwh: round(monthKwh),
      peakKwh: round(peakKwh),
      offPeakKwh: round(monthKwh - peakKwh),
      demandKw: round(baseKw * float(rng, 1.1, 1.28)),
      powerFactor: round(0.91 + float(rng, -0.03, 0.04), 2),
    });
  }

  return { hourly, daily, monthly };
}

function buildInvoices(rng: Rng, tenant: Tenant, tariffs: Tariff[], monthly: MeterReading[]): Invoice[] {
  if (tenant.status === 'draft' || tenant.status === 'pending_configuration') return [];
  const invoices: Invoice[] = [];
  // Last 6 whole months, most recent first.
  const recent = monthly.slice(-7, -1).reverse();
  recent.forEach((m, idx) => {
    const tariff = tariffFor(tariffs, m.ts);
    const gensetShare = float(rng, 0.06, 0.16); // portion supplied by genset
    const gensetKwh = m.kwh * gensetShare;
    const gridKwh = m.kwh - gensetKwh;
    const peakKwh = m.peakKwh;
    const offPeakKwh = gridKwh - peakKwh;

    const lines = [
      { component: 'peak' as const, units: round(peakKwh), rate: rateOf(tariff, 'peak'), amount: 0 },
      { component: 'off_peak' as const, units: round(Math.max(0, offPeakKwh)), rate: rateOf(tariff, 'off_peak'), amount: 0 },
      { component: 'genset' as const, units: round(gensetKwh), rate: rateOf(tariff, 'genset'), amount: 0 },
    ].map((l) => ({ ...l, amount: round(l.units * l.rate) }));

    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const tax = round(subtotal * 0.0);
    const total = subtotal + tax;
    const periodStart = new Date(m.ts).getTime();
    const periodEnd = periodStart + 30 * DAY;
    const issuedAt = periodEnd + 2 * DAY;
    const dueDate = issuedAt + 14 * DAY;
    const status =
      idx === 0 ? (NOW > dueDate ? 'overdue' : 'due')
      : idx === 1 ? (chance(rng, 0.4) ? 'due' : 'paid')
      : 'paid';

    invoices.push({
      id: `inv-${tenant.id}-${idx}`,
      number: `INV-${new Date(m.ts).getFullYear()}-${slug(tenant.code)}-${String(recent.length - idx).padStart(3, '0')}`.toUpperCase(),
      tenantId: tenant.id,
      periodLabel: new Date(m.ts).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      periodStart,
      periodEnd,
      totalKwh: round(m.kwh),
      peakKwh: round(peakKwh),
      offPeakKwh: round(Math.max(0, offPeakKwh)),
      lines,
      tariffId: tariff.id,
      subtotal,
      tax,
      total,
      paymentStatus: status,
      dueDate,
      issuedAt,
      paidAt: status === 'paid' ? dueDate - int(rng, 1, 10) * DAY : undefined,
    });
  });
  return invoices;
}

/* ------------------------------------------------------------ alert rules */

const DEFAULT_RULES: AlertRule[] = [
  { kind: 'high_consumption', enabled: true, threshold: 5000, unit: 'kWh/day', severity: 'warning', notify: true },
  { kind: 'high_demand', enabled: true, threshold: 60, unit: 'kW', severity: 'warning', notify: true },
  { kind: 'charge_threshold', enabled: true, threshold: 800000, unit: 'PKR', severity: 'attention', notify: true },
  { kind: 'meter_offline', enabled: true, threshold: 15, unit: 'min', severity: 'critical', notify: true },
  { kind: 'unusual_consumption', enabled: true, threshold: 40, unit: '% vs avg', severity: 'attention', notify: false },
  { kind: 'low_power_factor', enabled: false, threshold: 0.85, unit: 'pf', severity: 'info', notify: false },
];

/* ---------------------------------------------------------------- visitors */

function buildVisitors(rng: Rng, tenants: Tenant[]): { visitors: Visitor[]; schedules: VisitorSchedule[] } {
  const visitors: Visitor[] = [];
  const schedules: VisitorSchedule[] = [];
  const active = tenants.filter((t) => t.status === 'active' || t.status === 'suspended');
  let ref = 8800;

  for (const tenant of active) {
    // Historical + today's mix.
    const count = int(rng, 4, 10);
    for (let i = 0; i < count; i++) {
      const past = chance(rng, 0.55);
      const today = !past && chance(rng, 0.6);
      const visitDate = past
        ? startOfToday - int(rng, 1, 40) * DAY
        : today
          ? startOfToday
          : startOfToday + int(rng, 1, 12) * DAY;

      const arrHour = int(rng, 9, 16);
      const expectedArrival = visitDate + arrHour * HOUR + int(rng, 0, 3) * 15 * 60000;
      const expectedDeparture = expectedArrival + int(rng, 1, 4) * HOUR;

      let status: VisitorStatus;
      let actualArrival: number | undefined;
      let actualDeparture: number | undefined;
      if (past) {
        status = chance(rng, 0.12) ? 'no_show' : chance(rng, 0.06) ? 'cancelled' : 'checked_out';
        if (status === 'checked_out') {
          actualArrival = expectedArrival + int(rng, -20, 40) * 60000;
          actualDeparture = expectedDeparture + int(rng, -30, 90) * 60000;
        }
      } else if (today) {
        // Some already inside, some overstaying, some still scheduled.
        if (expectedArrival <= NOW) {
          actualArrival = expectedArrival + int(rng, -15, 30) * 60000;
          if (expectedDeparture < NOW) {
            status = chance(rng, 0.5) ? 'overstaying' : 'checked_out';
            if (status === 'checked_out') actualDeparture = expectedDeparture + int(rng, 5, 60) * 60000;
          } else {
            status = 'in_building';
          }
        } else {
          status = 'scheduled';
        }
      } else {
        status = 'scheduled';
      }

      const name = fullName(rng);
      visitors.push({
        id: `vis-${ref}`,
        tenantId: tenant.id,
        reference: `VIS-${ref}`,
        fullName: name,
        phone: phone(rng),
        email: chance(rng, 0.7) ? emailFor(name, 'gmail.com') : undefined,
        cnic: cnic(rng),
        company: pick(rng, VISITOR_COMPANIES),
        vehicleNo: chance(rng, 0.7) ? `${pick(rng, ['ICT', 'LEB', 'RIU', 'AJK'])}-${int(rng, 100, 999)}` : undefined,
        purpose: pick(rng, VISITOR_PURPOSES),
        host: pick(rng, [tenant.primaryContact.name, fullName(rng)]),
        buildingId: tenant.buildingId,
        visitDate,
        expectedArrival,
        expectedDeparture,
        actualArrival,
        actualDeparture,
        status,
        notes: chance(rng, 0.3) ? 'Please issue a visitor badge at reception.' : undefined,
      });
      ref += int(rng, 1, 4);
    }

    // A recurring schedule for some tenants (vendors, contractors).
    if (chance(rng, 0.5)) {
      const name = fullName(rng);
      schedules.push({
        id: `vsch-${tenant.id}`,
        tenantId: tenant.id,
        visitorName: name,
        company: pick(rng, VISITOR_COMPANIES),
        phone: phone(rng),
        purpose: pick(rng, ['Equipment maintenance', 'Cleaning contractor', 'IT support', 'Courier']),
        host: tenant.primaryContact.name,
        recurrence: pick(rng, ['weekly', 'weekly', 'daily', 'monthly'] as const),
        weekdays: [1, 3, 5],
        startTime: '09:30',
        endTime: '11:30',
        startsOn: startOfToday - int(rng, 20, 90) * DAY,
        active: chance(rng, 0.8),
        createdAt: startOfToday - int(rng, 20, 90) * DAY,
      });
    }
  }
  return { visitors, schedules };
}

/* --------------------------------------------------------- service center */

const STATUS_FLOW: ServiceStatus[] = [
  'submitted', 'acknowledged', 'assigned', 'in_progress', 'waiting_tenant', 'resolved', 'confirmed', 'closed',
];

function buildRequests(rng: Rng, tenants: Tenant[]): ServiceRequest[] {
  const requests: ServiceRequest[] = [];
  const active = tenants.filter((t) => t.status === 'active' || t.status === 'suspended');
  let ref = 4800;
  const teams: Record<string, string> = {
    hvac: 'Mechanical Team', electrical: 'Electrical Team', lighting: 'Electrical Team',
    plumbing: 'Plumbing Team', internet: 'IT & Networks', cleaning: 'Housekeeping',
    security: 'Security Ops', access_control: 'Security Ops', elevator: 'Vertical Transport',
    fire_safety: 'Safety Team', parking: 'Facilities', building_maintenance: 'Facilities', other: 'Facilities',
  };

  for (const tenant of active) {
    const count = int(rng, 2, 7);
    for (let i = 0; i < count; i++) {
      const seed = pick(rng, SERVICE_TITLES);
      const category = seed.category as ServiceCategory;
      const priority = pick(rng, ['low', 'medium', 'medium', 'high', 'high', 'critical'] as const);
      const createdAt = NOW - int(rng, 1, 30) * DAY - int(rng, 0, 20) * HOUR;

      // Where in the flow this ticket sits.
      const stage = int(rng, 0, STATUS_FLOW.length - 1);
      let status = STATUS_FLOW[stage];
      if (chance(rng, 0.07)) status = 'reopened';
      if (chance(rng, 0.05)) status = 'cancelled';

      const office = tenant.officeIds[0];
      const assigned = stage >= 2 && status !== 'cancelled';
      const timeline = STATUS_FLOW.slice(0, Math.max(1, stage + 1)).map((s, si) => ({
        ts: createdAt + si * int(rng, 2, 20) * HOUR,
        status: s,
        by: si === 0 ? tenant.primaryContact.name : 'NASTP Operations',
        note: undefined,
      }));
      const updatedAt = timeline[timeline.length - 1].ts;
      const resolvedAt = ['resolved', 'confirmed', 'closed'].includes(status) ? updatedAt : undefined;
      const dueAt = createdAt + (priority === 'critical' ? 4 : priority === 'high' ? 12 : priority === 'medium' ? 48 : 96) * HOUR;

      const comments = [];
      comments.push({
        id: `c-${ref}-0`, author: tenant.primaryContact.name, authorRole: 'tenant' as const,
        body: seed.title + '. ' + 'Requesting urgent attention where possible.', ts: createdAt,
      });
      if (assigned) {
        comments.push({
          id: `c-${ref}-1`, author: 'NASTP Operations', authorRole: 'admin' as const,
          body: `Acknowledged and assigned to ${teams[category]}. A technician will attend shortly.`,
          ts: createdAt + int(rng, 1, 8) * HOUR,
        });
      }
      if (status === 'waiting_tenant') {
        comments.push({
          id: `c-${ref}-2`, author: 'NASTP Operations', authorRole: 'admin' as const,
          body: 'Could you confirm a suitable access window for our technician?', ts: updatedAt,
        });
      }

      requests.push({
        id: `sr-${ref}`,
        reference: `SR-${ref}`,
        tenantId: tenant.id,
        title: seed.title,
        description:
          `${seed.title}. The issue has been observed since ${new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}. ` +
          `It affects day-to-day operations for the team in ${office}.`,
        category,
        priority,
        status,
        officeId: office,
        location: `${office}`,
        createdBy: tenant.primaryContact.name,
        assignedTo: assigned ? fullName(rng) : undefined,
        assignedTeam: assigned ? teams[category] : undefined,
        createdAt,
        updatedAt,
        resolvedAt,
        dueAt,
        attachments: chance(rng, 0.4)
          ? [{ id: `att-${ref}`, name: 'photo-evidence.jpg', kind: 'image', sizeKb: int(rng, 240, 2200), uploadedAt: createdAt }]
          : [],
        comments,
        timeline,
        rating:
          status === 'closed' && chance(rng, 0.7)
            ? { score: pick(rng, [3, 4, 4, 5, 5]), feedback: chance(rng, 0.5) ? 'Resolved promptly, thank you.' : undefined, ratedAt: updatedAt + 6 * HOUR }
            : undefined,
      });
      ref += int(rng, 1, 5);
    }
  }
  return requests.sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ----------------------------------------------------- alerts & activity */

function buildAlerts(rng: Rng, tenants: Tenant[], meters: Meter[]): EnergyAlert[] {
  const alerts: EnergyAlert[] = [];
  let n = 0;
  for (const meter of meters.filter((m) => m.kind === 'sub' && m.tenantId)) {
    const tenant = tenants.find((t) => t.id === meter.tenantId);
    if (!tenant || tenant.status !== 'active') continue;
    if (meter.status === 'offline') {
      alerts.push({
        id: `al-${n++}`, tenantId: tenant.id, kind: 'meter_offline', severity: 'critical',
        title: 'Meter offline', description: `${meter.name} stopped reporting.`,
        source: meter.serial, meterId: meter.id, ts: meter.lastReadingAt, status: 'active',
      });
    } else if (chance(rng, 0.14)) {
      const kind: AlertKind = pick(rng, ['high_consumption', 'high_demand', 'unusual_consumption', 'charge_threshold']);
      const map: Record<string, { title: string; sev: EnergyAlert['severity']; value: number; threshold: number; desc: string }> = {
        high_consumption: { title: 'High consumption', sev: 'warning', value: round(float(rng, 5200, 6800)), threshold: 5000, desc: 'Daily consumption exceeded the configured threshold.' },
        high_demand: { title: 'High demand', sev: 'warning', value: round(float(rng, 61, 78), 1), threshold: 60, desc: 'Maximum demand approached the sanctioned load.' },
        unusual_consumption: { title: 'Unusual consumption', sev: 'attention', value: round(float(rng, 42, 65)), threshold: 40, desc: 'Usage is well above this tenant’s trailing average.' },
        charge_threshold: { title: 'Charge threshold reached', sev: 'attention', value: round(float(rng, 820000, 960000)), threshold: 800000, desc: 'Period charges crossed the configured budget threshold.' },
      };
      const m = map[kind];
      alerts.push({
        id: `al-${n++}`, tenantId: tenant.id, kind, severity: m.sev, title: m.title,
        description: m.desc, source: meter.serial, meterId: meter.id, value: m.value,
        threshold: m.threshold, ts: NOW - int(rng, 5, 1200) * 60000,
        status: chance(rng, 0.5) ? 'active' : 'acknowledged',
      });
    }
  }
  return alerts.sort((a, b) => b.ts - a.ts);
}

function buildActivity(rng: Rng, tenants: Tenant[], requests: ServiceRequest[], visitors: Visitor[]): ActivityEvent[] {
  const ev: ActivityEvent[] = [];
  let n = 0;
  const push = (kind: ActivityKind, tenantId: string, title: string, detail: string, ts: number, domain: ActivityEvent['domain'], actor = 'NASTP Admin') =>
    ev.push({ id: `act-${n++}`, kind, tenantId, title, detail, ts, actor, domain });

  for (const t of tenants) {
    push('tenant_created', t.id, 'Tenant created', `${t.name} added to ${t.buildingId}`, t.createdAt, 'tenant');
    if (t.activatedAt) push('tenant_activated', t.id, 'Tenant activated', `${t.name} portal access enabled`, t.activatedAt, 'tenant');
    if (t.status === 'suspended') push('tenant_suspended', t.id, 'Tenant suspended', `${t.name} portal access disabled`, NOW - int(rng, 1, 20) * DAY, 'tenant');
  }
  for (const r of requests.slice(0, 30)) {
    push('request_submitted', r.tenantId, 'Service request submitted', `${r.reference} · ${r.title}`, r.createdAt, 'service', r.createdBy);
    if (r.resolvedAt) push('request_resolved', r.tenantId, 'Service request resolved', `${r.reference} resolved`, r.resolvedAt, 'service');
  }
  for (const v of visitors.filter((x) => x.actualArrival).slice(0, 30)) {
    push('visitor_checked_in', v.tenantId, 'Visitor checked in', `${v.fullName} · ${v.company ?? ''}`, v.actualArrival!, 'visitor', 'Reception');
  }
  return ev.sort((a, b) => b.ts - a.ts);
}

function buildNotifications(rng: Rng, alerts: EnergyAlert[], requests: ServiceRequest[], visitors: Visitor[]): AppNotification[] {
  const out: AppNotification[] = [];
  let n = 0;
  for (const a of alerts.filter((x) => x.status === 'active').slice(0, 8)) {
    out.push({
      id: `ntf-${n++}`, domain: 'energy', title: a.title, body: `${a.source}: ${a.description}`,
      ts: a.ts, read: false, severity: a.severity, tenantId: a.tenantId, href: `/admin/energy/alerts`,
    });
  }
  for (const v of visitors.filter((x) => x.status === 'overstaying').slice(0, 5)) {
    out.push({
      id: `ntf-${n++}`, domain: 'visitor', title: 'Visitor overstaying',
      body: `${v.fullName} is past the expected departure time.`, ts: NOW - int(rng, 2, 40) * 60000,
      read: false, severity: 'warning', tenantId: v.tenantId, href: '/admin/visitors/overstaying',
    });
  }
  for (const r of requests.filter((x) => x.priority === 'critical' && !['closed', 'confirmed'].includes(x.status)).slice(0, 5)) {
    out.push({
      id: `ntf-${n++}`, domain: 'service', title: 'Critical service request',
      body: `${r.reference}: ${r.title}`, ts: r.createdAt, read: chance(rng, 0.3),
      severity: 'critical', tenantId: r.tenantId, href: '/admin/service',
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/* ============================================================ assembly */

export function createWorld(seed = 20260821): World {
  const rng = mulberry32(seed);
  const { buildings, floors, meters: mainMeters } = buildPhysical(rng);
  const { tenants, offices, meters: subMeters, users } = buildTenants(rng, buildings, floors);
  const meters = [...mainMeters, ...subMeters];
  const tariffs = buildTariffs();

  const readings: World['readings'] = {};
  const invoices: Invoice[] = [];
  const alertRules: Record<string, AlertRule[]> = {};
  for (const tenant of tenants) {
    const baseKw = baseLoadFor(tenant, offices);
    const series = buildReadings(rng, baseKw);
    readings[tenant.id] = series;
    invoices.push(...buildInvoices(rng, tenant, tariffs, series.monthly));
    alertRules[tenant.id] = DEFAULT_RULES.map((r) => ({ ...r }));
  }

  const { visitors, schedules } = buildVisitors(rng, tenants);
  const requests = buildRequests(rng, tenants);
  const alerts = buildAlerts(rng, tenants, meters);
  const activity = buildActivity(rng, tenants, requests, visitors);
  const notifications = buildNotifications(rng, alerts, requests, visitors);

  const index = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x]));

  return {
    now: NOW,
    buildings,
    buildingById: index(buildings),
    floors,
    floorById: index(floors),
    offices,
    officeById: index(offices),
    tenants,
    tenantById: index(tenants),
    users,
    meters,
    meterById: index(meters),
    tariffs,
    peakWindows: PEAK_WINDOWS,
    invoices,
    visitors,
    visitorSchedules: schedules,
    requests,
    alerts,
    alertRules,
    notifications,
    activity,
    readings,
  };
}

/** Public helper for freshly-onboarded tenants: a deterministic reading series
 *  for a given base load. Used by the onboarding commit path. */
export function makeReadingSeries(baseKw: number, seed = 777) {
  return buildReadings(mulberry32(seed), baseKw);
}

/** A live electrical snapshot for a given base load, for new sub-meters. */
export function makeSnapshot(baseKw: number) {
  return compute(baseKw, new Date(NOW).getHours());
}

export { NOW, DAY, HOUR, startOfToday, isPeakHour, tariffFor, rateOf, baseLoadFor };
