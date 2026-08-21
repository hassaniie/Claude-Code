/**
 * The live layer.
 *
 * Holds the single mutable `World` and pushes changes to subscribers, the way a
 * real socket would. Two kinds of change flow through here:
 *
 *   • the tick — meter snapshots drift within a sensible band and visitor
 *     overstays are detected against wall-clock time. Never random noise for its
 *     own sake; every change is one a real deployment would emit.
 *   • commands — the mutations screens perform (schedule a visitor, submit a
 *     request, advance a ticket, change a tenant's lifecycle). Each updates the
 *     world in place, records activity, and notifies.
 *
 * `api.ts` reads this world over an async, fault-injectable transport; screens
 * that need live values subscribe through the `useLive` hook.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { createWorld, NOW, HOUR, type World } from './world';
import type {
  ActivityEvent, ActivityKind, AppNotification, ServiceComment, ServiceRequest, ServiceStatus,
  Tenant, TenantStatus, Visitor, VisitorStatus,
} from './types';

function jitter(power: number, targetMin: number, targetMax: number) {
  const next = power * (0.98 + Math.random() * 0.04);
  return Math.min(targetMax, Math.max(targetMin, next));
}

class Simulation {
  private world: World = createWorld();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  version = 0;

  getState() {
    return this.world;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  start(ms = 4000) {
    this.stop();
    this.timer = setInterval(() => this.tick(), ms);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private tick() {
    const hour = new Date().getHours();
    for (const meter of this.world.meters) {
      if (meter.status === 'offline') continue;
      const base = meter.live.powerKw;
      const min = meter.kind === 'main' ? 120 : 6;
      const max = meter.kind === 'main' ? 360 : 60;
      const powerKw = round(jitter(base, min, max), 1);
      const pf = round(Math.min(0.99, Math.max(0.8, meter.live.powerFactor + (Math.random() - 0.5) * 0.01)), 3);
      const apparentKva = round(powerKw / pf, 1);
      const reactiveKvar = round(Math.sqrt(Math.max(0, apparentKva * apparentKva - powerKw * powerKw)), 1);
      const voltage = round(399 + Math.random() * 4, 1);
      meter.live = {
        powerKw,
        voltage,
        current: round((apparentKva * 1000) / (Math.sqrt(3) * voltage), 1),
        powerFactor: pf,
        frequency: round(49.94 + Math.random() * 0.12, 2),
        apparentKva,
        reactiveKvar,
        maxDemandKw: Math.max(meter.live.maxDemandKw, powerKw),
        peakDemandKw: meter.live.peakDemandKw,
      };
      meter.lastReadingAt = Date.now();
      meter.totalKwh = round(meter.totalKwh + powerKw * (4 / 3600), 2);
      void hour;
    }

    // Overstay detection: an in-building visitor past expected departure.
    const now = Date.now();
    for (const v of this.world.visitors) {
      if (v.status === 'in_building' && now > v.expectedDeparture) {
        v.status = 'overstaying';
        this.pushNotification({
          domain: 'visitor',
          title: 'Visitor overstaying',
          body: `${v.fullName} is past the expected departure time.`,
          severity: 'warning',
          tenantId: v.tenantId,
          href: '/admin/visitors/overstaying',
        });
      }
    }
    this.emit();
  }

  /* ------------------------------------------------------------- commands */

  private activity(kind: ActivityKind, tenantId: string, title: string, detail: string, actor: string, domain: ActivityEvent['domain']) {
    this.world.activity.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind, tenantId, title, detail, ts: Date.now(), actor, domain,
    });
  }

  pushNotification(n: Omit<AppNotification, 'id' | 'ts' | 'read'>) {
    // Avoid piling up duplicates of the same visitor/service notification.
    const dup = this.world.notifications.find((x) => x.title === n.title && x.body === n.body);
    if (dup) return;
    this.world.notifications.unshift({
      ...n,
      id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      read: false,
    });
  }

  markNotificationRead(id: string) {
    const n = this.world.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    this.emit();
  }

  markAllNotificationsRead(tenantId?: string) {
    this.world.notifications.forEach((n) => {
      if (!tenantId || n.tenantId === tenantId) n.read = true;
    });
    this.emit();
  }

  /* --- visitors --- */

  scheduleVisitor(input: Omit<Visitor, 'id' | 'reference' | 'status'> & { status?: VisitorStatus }): Visitor {
    const ref = 8800 + this.world.visitors.length + Math.floor(Math.random() * 40);
    const visitor: Visitor = {
      ...input,
      id: `vis-${ref}-${Date.now().toString().slice(-4)}`,
      reference: `VIS-${ref}`,
      status: input.status ?? 'scheduled',
    };
    this.world.visitors.unshift(visitor);
    this.activity('visitor_scheduled', visitor.tenantId, 'Visitor scheduled', `${visitor.fullName} · ${visitor.purpose}`, visitor.host, 'visitor');
    this.emit();
    return visitor;
  }

  setVisitorStatus(id: string, status: VisitorStatus, by = 'Reception') {
    const v = this.world.visitors.find((x) => x.id === id);
    if (!v) return;
    v.status = status;
    if (status === 'in_building') {
      v.actualArrival = Date.now();
      this.activity('visitor_checked_in', v.tenantId, 'Visitor checked in', `${v.fullName}`, by, 'visitor');
    }
    if (status === 'checked_out') {
      v.actualDeparture = Date.now();
      this.activity('visitor_checked_out', v.tenantId, 'Visitor checked out', `${v.fullName}`, by, 'visitor');
    }
    this.emit();
  }

  setScheduleActive(id: string, active: boolean) {
    const s = this.world.visitorSchedules.find((x) => x.id === id);
    if (s) s.active = active;
    this.emit();
  }

  addSchedule(schedule: import('./types').VisitorSchedule) {
    this.world.visitorSchedules.unshift(schedule);
    this.activity('visitor_scheduled', schedule.tenantId, 'Recurring visitor added', `${schedule.visitorName} · ${schedule.recurrence}`, schedule.host, 'visitor');
    this.emit();
  }

  removeSchedule(id: string) {
    this.world.visitorSchedules = this.world.visitorSchedules.filter((x) => x.id !== id);
    this.emit();
  }

  /* --- service center --- */

  submitRequest(input: Omit<ServiceRequest, 'id' | 'reference' | 'status' | 'createdAt' | 'updatedAt' | 'comments' | 'timeline' | 'attachments'> & { comments?: ServiceComment[]; attachments?: ServiceRequest['attachments'] }): ServiceRequest {
    const ref = 4800 + this.world.requests.length + Math.floor(Math.random() * 30);
    const ts = Date.now();
    const due = ts + (input.priority === 'critical' ? 4 : input.priority === 'high' ? 12 : input.priority === 'medium' ? 48 : 96) * HOUR;
    const req: ServiceRequest = {
      ...input,
      id: `sr-${ref}-${ts.toString().slice(-4)}`,
      reference: `SR-${ref}`,
      status: 'submitted',
      createdAt: ts,
      updatedAt: ts,
      dueAt: due,
      attachments: input.attachments ?? [],
      comments: input.comments ?? [],
      timeline: [{ ts, status: 'submitted', by: input.createdBy }],
    };
    this.world.requests.unshift(req);
    this.activity('request_submitted', req.tenantId, 'Service request submitted', `${req.reference} · ${req.title}`, req.createdBy, 'service');
    this.pushNotification({
      domain: 'service', title: 'New service request', body: `${req.reference}: ${req.title}`,
      severity: req.priority === 'critical' ? 'critical' : 'attention', tenantId: req.tenantId, href: '/admin/service',
    });
    this.emit();
    return req;
  }

  transitionRequest(id: string, status: ServiceStatus, by: string, note?: string) {
    const r = this.world.requests.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.updatedAt = Date.now();
    r.timeline.push({ ts: Date.now(), status, by, note });
    if (status === 'resolved' || status === 'confirmed' || status === 'closed') r.resolvedAt = Date.now();
    this.activity(status === 'resolved' ? 'request_resolved' : 'request_updated', r.tenantId, `Request ${status.replace('_', ' ')}`, `${r.reference}`, by, 'service');
    this.emit();
  }

  addRequestComment(id: string, comment: Omit<ServiceComment, 'id' | 'ts'>) {
    const r = this.world.requests.find((x) => x.id === id);
    if (!r) return;
    r.comments.push({ ...comment, id: `c-${Date.now()}`, ts: Date.now() });
    r.updatedAt = Date.now();
    this.emit();
  }

  rateRequest(id: string, score: number, feedback?: string) {
    const r = this.world.requests.find((x) => x.id === id);
    if (!r) return;
    r.rating = { score, feedback, ratedAt: Date.now() };
    this.emit();
  }

  /* --- tenants --- */

  setTenantStatus(id: string, status: TenantStatus, by = 'NASTP Admin') {
    const t = this.world.tenantById[id];
    if (!t) return;
    t.status = status;
    if (status === 'active' && !t.activatedAt) t.activatedAt = Date.now();
    const kind: ActivityKind = status === 'active' ? 'tenant_activated' : status === 'suspended' ? 'tenant_suspended' : 'tenant_created';
    this.activity(kind, id, `Tenant ${status.replace('_', ' ')}`, t.name, by, 'tenant');
    this.emit();
  }

  createTenant(t: Tenant) {
    this.world.tenants.unshift(t);
    this.world.tenantById[t.id] = t;
    this.activity('tenant_created', t.id, 'Tenant created', `${t.name} added`, 'NASTP Admin', 'tenant');
    this.emit();
  }

  /**
   * Commit a completed onboarding: insert the tenant, its offices, sub-meters
   * and primary user, seed default alert rules and a starter reading series,
   * and record the lifecycle activity. Everything the detail workspace renders
   * exists immediately after this returns.
   */
  commitOnboarding(payload: {
    tenant: Tenant;
    offices: import('./types').OfficeSpace[];
    meters: import('./types').Meter[];
    user?: import('./types').TenantUser;
    alertRules: import('./types').AlertRule[];
    readings: { hourly: import('./types').MeterReading[]; daily: import('./types').MeterReading[]; monthly: import('./types').MeterReading[] };
  }) {
    const { tenant, offices, meters, user, alertRules, readings } = payload;
    this.world.tenants.unshift(tenant);
    this.world.tenantById[tenant.id] = tenant;
    for (const o of offices) {
      this.world.offices.push(o);
      this.world.officeById[o.id] = o;
    }
    for (const m of meters) {
      this.world.meters.push(m);
      this.world.meterById[m.id] = m;
      this.activity('meter_assigned', tenant.id, 'Meter assigned', `${m.name} (${m.serial})`, 'NASTP Admin', 'energy');
    }
    if (user) this.world.users.push(user);
    this.world.alertRules[tenant.id] = alertRules;
    this.world.readings[tenant.id] = readings;
    this.activity('tenant_created', tenant.id, 'Tenant created', `${tenant.name} onboarded`, 'NASTP Admin', 'tenant');
    if (tenant.status === 'active') this.activity('tenant_activated', tenant.id, 'Tenant activated', `${tenant.name} portal access created`, 'NASTP Admin', 'tenant');
    if (user) this.activity('user_invited', tenant.id, 'Portal user invited', user.name, 'NASTP Admin', 'tenant');
    this.emit();
  }

  acknowledgeAlert(id: string) {
    const a = this.world.alerts.find((x) => x.id === id);
    if (a) a.status = 'acknowledged';
    this.emit();
  }

  resolveAlert(id: string) {
    const a = this.world.alerts.find((x) => x.id === id);
    if (a) a.status = 'resolved';
    this.emit();
  }
}

export const simulation = new Simulation();

const round = (v: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/* -------------------------------------------------------------- live hooks */

/** Subscribe to the live world and recompute a derived value on every tick. */
export function useLive<T>(selector: (world: World) => T): T {
  const version = useSyncExternalStore(simulation.subscribe, () => simulation.version, () => simulation.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(simulation.getState()), [version]);
}

export { NOW };
