/**
 * Derived views over the world. Kept apart from generation so the shapes a
 * screen consumes (KPIs, tenant summaries, the portal snapshot) are computed in
 * one place and stay consistent between the admin dashboard, the tenant list
 * and the portal home.
 */

import { NOW, startOfToday, type World } from './world';
import type {
  AdminKpis, AlertLevel, Meter, Tenant, TenantPortalSnapshot, TenantSummary, Visitor,
} from './types';

const DAY = 86_400_000;

export function isActive(t: Tenant) {
  return t.status === 'active';
}

export function tenantMeters(world: World, tenantId: string): Meter[] {
  return world.meters.filter((m) => m.tenantId === tenantId);
}

export function currentLoadKw(world: World, tenantId: string) {
  return round(tenantMeters(world, tenantId).reduce((s, m) => s + m.live.powerKw, 0), 1);
}

/** Sum of the current calendar-month daily readings, in kWh. */
export function periodKwh(world: World, tenantId: string) {
  const daily = world.readings[tenantId]?.daily ?? [];
  const monthStart = new Date(NOW);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return round(daily.filter((d) => d.ts >= monthStart.getTime()).reduce((s, d) => s + d.kwh, 0));
}

export function periodCharges(world: World, tenantId: string) {
  // Approximate the running period charge from month-to-date kWh at the current
  // blended rate — real billing closes the period into an Invoice.
  const kwh = periodKwh(world, tenantId);
  const current = world.tariffs.find((t) => t.effectiveTo === null) ?? world.tariffs[0];
  const blended =
    (current.rates.find((r) => r.component === 'peak')?.rate ?? 50) * 0.3 +
    (current.rates.find((r) => r.component === 'off_peak')?.rate ?? 38) * 0.7;
  return round(kwh * blended);
}

export function alertLevelForTenant(world: World, tenantId: string): AlertLevel {
  const meters = tenantMeters(world, tenantId);
  if (meters.some((m) => m.status === 'offline')) return 'offline';
  const alerts = world.alerts.filter((a) => a.tenantId === tenantId && a.status === 'active');
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (alerts.some((a) => a.severity === 'warning')) return 'warning';
  if (alerts.length) return 'attention';
  return 'normal';
}

export function tenantSummary(world: World, tenantId: string): TenantSummary {
  const tenant = world.tenantById[tenantId];
  const offices = world.offices.filter((o) => tenant.officeIds.includes(o.id));
  const meters = tenantMeters(world, tenantId);
  const openReqs = world.requests.filter(
    (r) => r.tenantId === tenantId && !['closed', 'confirmed', 'cancelled'].includes(r.status),
  );
  const visitorsInside = world.visitors.filter(
    (v) => v.tenantId === tenantId && (v.status === 'in_building' || v.status === 'overstaying'),
  ).length;
  const lastActivity = world.activity.find((a) => a.tenantId === tenantId)?.ts ?? tenant.createdAt;

  return {
    tenant,
    buildingName: world.buildingById[tenant.buildingId]?.name ?? '—',
    floorNames: tenant.floorIds.map((f) => world.floorById[f]?.name ?? '—'),
    officeCount: offices.length,
    totalAreaSqft: offices.reduce((s, o) => s + o.areaSqft, 0),
    meterCount: meters.length,
    offlineMeters: meters.filter((m) => m.status === 'offline').length,
    currentLoadKw: currentLoadKw(world, tenantId),
    periodKwh: periodKwh(world, tenantId),
    periodCharges: periodCharges(world, tenantId),
    openRequests: openReqs.length,
    criticalRequests: openReqs.filter((r) => r.priority === 'critical').length,
    visitorsInside,
    activeAlerts: world.alerts.filter((a) => a.tenantId === tenantId && a.status === 'active').length,
    lastActivityAt: lastActivity,
  };
}

/* -------------------------------------------------------------- admin KPIs */

export function computeAdminKpis(world: World): AdminKpis {
  const tenants = world.tenants;
  const subMeters = world.meters.filter((m) => m.kind === 'sub' && world.tenantById[m.tenantId ?? '']?.status === 'active');
  const activeTenants = tenants.filter(isActive);

  const totalLoad = activeTenants.reduce((s, t) => s + currentLoadKw(world, t.id), 0);
  const peakDemand = subMeters.reduce((m, x) => Math.max(m, x.live.peakDemandKw), 0);
  const totalConsumption = activeTenants.reduce((s, t) => s + periodKwh(world, t.id), 0);
  const totalCharges = activeTenants.reduce((s, t) => s + periodCharges(world, t.id), 0);

  const todayVisitors = world.visitors.filter((v) => v.visitDate >= startOfToday && v.visitDate < startOfToday + DAY);
  const openReqs = world.requests.filter((r) => !['closed', 'confirmed', 'cancelled'].includes(r.status));

  return {
    tenantsTotal: tenants.length,
    tenantsActive: activeTenants.length,
    tenantsPending: tenants.filter((t) => t.status === 'pending_activation' || t.status === 'pending_configuration' || t.status === 'draft').length,
    tenantsSuspended: tenants.filter((t) => t.status === 'suspended').length,
    totalConsumptionKwh: round(totalConsumption),
    currentLoadKw: round(totalLoad, 1),
    peakDemandKw: round(peakDemand, 1),
    totalChargesMonth: round(totalCharges),
    highConsumptionAlerts: world.alerts.filter((a) => a.status === 'active' && (a.kind === 'high_consumption' || a.kind === 'high_demand' || a.kind === 'unusual_consumption')).length,
    offlineMeters: world.meters.filter((m) => m.status === 'offline').length,
    metersTotal: world.meters.length,
    visitorsScheduledToday: todayVisitors.length,
    visitorsInside: world.visitors.filter((v) => v.status === 'in_building' || v.status === 'overstaying').length,
    visitorsOverstaying: world.visitors.filter((v) => v.status === 'overstaying').length,
    visitorsCheckedOutToday: world.visitors.filter((v) => v.status === 'checked_out' && (v.actualDeparture ?? 0) >= startOfToday).length,
    requestsOpen: openReqs.length,
    requestsHigh: openReqs.filter((r) => r.priority === 'high').length,
    requestsCritical: openReqs.filter((r) => r.priority === 'critical').length,
    requestsOverdue: openReqs.filter((r) => r.dueAt && r.dueAt < NOW).length,
    requestsResolvedToday: world.requests.filter((r) => r.resolvedAt && r.resolvedAt >= startOfToday).length,
  };
}

/* --------------------------------------------------------- portal snapshot */

export function tenantPortalSnapshot(world: World, tenantId: string): TenantPortalSnapshot {
  const meters = tenantMeters(world, tenantId);
  const daily = world.readings[tenantId]?.daily ?? [];
  const monthStart = new Date(NOW);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const mtd = daily.filter((d) => d.ts >= monthStart.getTime());

  const scheduledToday = world.visitors.filter(
    (v) => v.tenantId === tenantId && v.visitDate >= startOfToday && v.visitDate < startOfToday + DAY,
  );
  const nextVisitor: Visitor | undefined = world.visitors
    .filter((v) => v.tenantId === tenantId && v.status === 'scheduled' && v.expectedArrival >= NOW)
    .sort((a, b) => a.expectedArrival - b.expectedArrival)[0];

  const reqs = world.requests.filter((r) => r.tenantId === tenantId);
  return {
    currentLoadKw: currentLoadKw(world, tenantId),
    currentDemandKw: round(meters.reduce((m, x) => Math.max(m, x.live.maxDemandKw), 0), 1),
    periodKwh: round(mtd.reduce((s, d) => s + d.kwh, 0)),
    periodPeakKwh: round(mtd.reduce((s, d) => s + d.peakKwh, 0)),
    periodOffPeakKwh: round(mtd.reduce((s, d) => s + d.offPeakKwh, 0)),
    periodCharges: periodCharges(world, tenantId),
    peakDemandKw: round(meters.reduce((m, x) => Math.max(m, x.live.peakDemandKw), 0), 1),
    activeMeters: meters.filter((m) => m.status !== 'offline').length,
    totalMeters: meters.length,
    activeAlerts: world.alerts.filter((a) => a.tenantId === tenantId && a.status === 'active').length,
    visitorsScheduledToday: scheduledToday.length,
    visitorsInside: world.visitors.filter((v) => v.tenantId === tenantId && (v.status === 'in_building' || v.status === 'overstaying')).length,
    nextVisitor,
    openRequests: reqs.filter((r) => !['closed', 'confirmed', 'cancelled'].includes(r.status)).length,
    inProgressRequests: reqs.filter((r) => r.status === 'in_progress' || r.status === 'assigned').length,
    waitingRequests: reqs.filter((r) => r.status === 'waiting_tenant').length,
  };
}

/** Sum every active tenant's consumption series into one park-wide series. All
 *  tenants share the same bucket layout, so we align by index. */
export function aggregateReadings(world: World, range: 'hourly' | 'daily' | 'monthly') {
  const active = world.tenants.filter(isActive);
  const first = world.readings[active[0]?.id]?.[range] ?? [];
  return first.map((base, i) => {
    let kwh = 0;
    let peakKwh = 0;
    let offPeakKwh = 0;
    let demandKw = 0;
    for (const t of active) {
      const r = world.readings[t.id]?.[range]?.[i];
      if (!r) continue;
      kwh += r.kwh;
      peakKwh += r.peakKwh;
      offPeakKwh += r.offPeakKwh;
      demandKw += r.demandKw;
    }
    return { ts: base.ts, label: base.label, kwh: round(kwh), peakKwh: round(peakKwh), offPeakKwh: round(offPeakKwh), demandKw: round(demandKw), powerFactor: 0.92 };
  });
}

const round = (v: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
