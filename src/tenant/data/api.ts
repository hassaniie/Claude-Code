/**
 * Tenant Operations API client.
 *
 * Every screen talks to the ecosystem through this module and nothing else.
 * Today it resolves against the in-process simulation with realistic latency
 * and an injectable failure rate; swapping to a real backend means replacing
 * the method bodies with `fetch`. The signatures, the error shape and the
 * `AsyncResult` envelope consumers branch on all stay put.
 *
 * `adminApi` sees the whole park. `tenantApi` is scoped to a single tenantId on
 * every call — the isolation boundary the portal is built on. A tenant can only
 * ever read its own offices, meters, charges, visitors and requests.
 */

import { simulation } from './live';
import { computeAdminKpis, tenantPortalSnapshot, tenantSummary } from './selectors';
import { NOW, startOfToday, type World } from './world';
import type {
  ActivityEvent, AppNotification, Building, EnergyAlert, Invoice, Meter, MeterReading, OfficeSpace,
  PeakWindow, ServiceRequest, ServiceStatus, Tariff, Tenant, TenantStatus, TenantSummary, TenantUser,
  Visitor, VisitorSchedule, VisitorStatus,
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
  minLatency: 160,
  maxLatency: 480,
  failureRate: 0,
  enabled: true,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function call<T>(endpoint: string, resolver: (world: World) => T): Promise<T> {
  const latency = transport.minLatency + Math.random() * (transport.maxLatency - transport.minLatency);
  await sleep(latency);
  if (!transport.enabled) throw new ApiError('Tenant Operations API is disabled', 503, endpoint);
  if (Math.random() < transport.failureRate) {
    throw new ApiError(`Upstream timeout while reading ${endpoint}`, 504, endpoint);
  }
  return resolver(simulation.getState());
}

/* ============================================================== admin API */

export interface TenantQuery {
  search?: string;
  buildingId?: string;
  floorId?: string;
  status?: TenantStatus | 'all';
}

export interface RequestQuery {
  tenantId?: string;
  status?: ServiceStatus | 'open' | 'all';
  category?: string;
  priority?: string;
  overdue?: boolean;
  search?: string;
}

export interface VisitorQuery {
  tenantId?: string;
  status?: VisitorStatus | 'today' | 'all';
  search?: string;
}

const byId = <T extends { id: string }>(arr: T[], id: string) => arr.find((x) => x.id === id);

export const adminApi = {
  getKpis: () => call('/admin/kpis', (w) => computeAdminKpis(w)),

  listTenants: (q: TenantQuery = {}) =>
    call<TenantSummary[]>('/admin/tenants', (w) => {
      const term = q.search?.trim().toLowerCase();
      return w.tenants
        .filter((t) => {
          if (q.status && q.status !== 'all' && t.status !== q.status) return false;
          if (q.buildingId && t.buildingId !== q.buildingId) return false;
          if (q.floorId && !t.floorIds.includes(q.floorId)) return false;
          if (term && !(t.name.toLowerCase().includes(term) || t.code.toLowerCase().includes(term) || t.legalName.toLowerCase().includes(term))) return false;
          return true;
        })
        .map((t) => tenantSummary(w, t.id))
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    }),

  getTenant: (id: string) => call<Tenant | undefined>(`/admin/tenants/${id}`, (w) => w.tenantById[id]),
  getTenantSummary: (id: string) => call<TenantSummary | null>(`/admin/tenants/${id}/summary`, (w) => (w.tenantById[id] ? tenantSummary(w, id) : null)),

  listBuildings: () => call<Building[]>('/admin/buildings', (w) => w.buildings),
  getFloors: (buildingId?: string) => call('/admin/floors', (w) => w.floors.filter((f) => !buildingId || f.buildingId === buildingId)),
  listOffices: (tenantId?: string) => call<OfficeSpace[]>('/admin/offices', (w) => w.offices.filter((o) => !tenantId || o.tenantId === tenantId)),
  listUsers: (tenantId: string) => call<TenantUser[]>(`/admin/tenants/${tenantId}/users`, (w) => w.users.filter((u) => u.tenantId === tenantId)),

  /* energy */
  listMeters: (opts: { tenantId?: string; kind?: 'main' | 'sub' } = {}) =>
    call<Meter[]>('/admin/meters', (w) =>
      w.meters.filter((m) => (!opts.tenantId || m.tenantId === opts.tenantId) && (!opts.kind || m.kind === opts.kind)),
    ),
  getMeter: (id: string) => call<Meter | undefined>(`/admin/meters/${id}`, (w) => w.meterById[id]),
  listTariffs: () => call<Tariff[]>('/admin/tariffs', (w) => [...w.tariffs].sort((a, b) => b.effectiveFrom - a.effectiveFrom)),
  getPeakWindows: () => call<PeakWindow[]>('/admin/peak-windows', (w) => w.peakWindows),
  listInvoices: (tenantId?: string) => call<Invoice[]>('/admin/invoices', (w) => w.invoices.filter((i) => !tenantId || i.tenantId === tenantId).sort((a, b) => b.periodStart - a.periodStart)),
  listAlerts: (tenantId?: string) => call<EnergyAlert[]>('/admin/alerts', (w) => w.alerts.filter((a) => !tenantId || a.tenantId === tenantId)),

  /** Highest-consuming tenants this period, for the energy overview. */
  tenantConsumptionRanking: () =>
    call('/admin/energy/ranking', (w) =>
      w.tenants
        .filter((t) => t.status === 'active')
        .map((t) => tenantSummary(w, t.id))
        .sort((a, b) => b.periodKwh - a.periodKwh),
    ),

  getReadings: (tenantId: string, range: 'hourly' | 'daily' | 'monthly') =>
    call<MeterReading[]>(`/admin/tenants/${tenantId}/readings/${range}`, (w) => w.readings[tenantId]?.[range] ?? []),

  /* visitors */
  listVisitors: (q: VisitorQuery = {}) =>
    call<Visitor[]>('/admin/visitors', (w) => filterVisitors(w, q)),
  listSchedules: (tenantId?: string) => call<VisitorSchedule[]>('/admin/schedules', (w) => w.visitorSchedules.filter((s) => !tenantId || s.tenantId === tenantId)),

  /* service center */
  listRequests: (q: RequestQuery = {}) => call<ServiceRequest[]>('/admin/requests', (w) => filterRequests(w, q)),
  getRequest: (id: string) => call<ServiceRequest | undefined>(`/admin/requests/${id}`, (w) => byId(w.requests, id)),

  /* cross-system */
  listActivity: (opts: { tenantId?: string; limit?: number } = {}) =>
    call<ActivityEvent[]>('/admin/activity', (w) =>
      w.activity.filter((a) => !opts.tenantId || a.tenantId === opts.tenantId).slice(0, opts.limit ?? 40),
    ),
  listNotifications: () => call<AppNotification[]>('/admin/notifications', (w) => w.notifications.filter((n) => !n.tenantId || true)),

  /* commands (thin wrappers over the simulation) */
  setTenantStatus: (id: string, status: TenantStatus) => call('/admin/tenants/status', () => simulation.setTenantStatus(id, status)),
  transitionRequest: (id: string, status: ServiceStatus, by: string, note?: string) =>
    call('/admin/requests/transition', () => simulation.transitionRequest(id, status, by, note)),
  addRequestComment: (id: string, author: string, body: string, internal?: boolean) =>
    call('/admin/requests/comment', () => simulation.addRequestComment(id, { author, authorRole: 'admin', body, internal })),
  setVisitorStatus: (id: string, status: VisitorStatus, by?: string) => call('/admin/visitors/status', () => simulation.setVisitorStatus(id, status, by)),
  acknowledgeAlert: (id: string) => call('/admin/alerts/ack', () => simulation.acknowledgeAlert(id)),
  resolveAlert: (id: string) => call('/admin/alerts/resolve', () => simulation.resolveAlert(id)),
};

/* ============================================================= tenant API */

/** Every method is scoped to `tenantId`. This is the portal's isolation seam. */
export function makeTenantApi(tenantId: string) {
  return {
    getProfile: () => call<Tenant | undefined>(`/portal/${tenantId}`, (w) => w.tenantById[tenantId]),
    getSnapshot: () => call(`/portal/${tenantId}/snapshot`, (w) => tenantPortalSnapshot(w, tenantId)),
    getSummary: () => call(`/portal/${tenantId}/summary`, (w) => tenantSummary(w, tenantId)),

    listOffices: () => call<OfficeSpace[]>(`/portal/${tenantId}/offices`, (w) => w.offices.filter((o) => o.tenantId === tenantId)),
    listMeters: () => call<Meter[]>(`/portal/${tenantId}/meters`, (w) => w.meters.filter((m) => m.tenantId === tenantId)),
    listUsers: () => call<TenantUser[]>(`/portal/${tenantId}/users`, (w) => w.users.filter((u) => u.tenantId === tenantId)),

    getReadings: (range: 'hourly' | 'daily' | 'monthly') =>
      call<MeterReading[]>(`/portal/${tenantId}/readings/${range}`, (w) => w.readings[tenantId]?.[range] ?? []),
    listInvoices: () => call<Invoice[]>(`/portal/${tenantId}/invoices`, (w) => w.invoices.filter((i) => i.tenantId === tenantId).sort((a, b) => b.periodStart - a.periodStart)),
    getInvoice: (id: string) => call<Invoice | undefined>(`/portal/${tenantId}/invoices/${id}`, (w) => w.invoices.find((i) => i.id === id && i.tenantId === tenantId)),
    listAlerts: () => call<EnergyAlert[]>(`/portal/${tenantId}/alerts`, (w) => w.alerts.filter((a) => a.tenantId === tenantId)),
    listTariffs: () => call<Tariff[]>(`/portal/${tenantId}/tariffs`, (w) => [...w.tariffs].sort((a, b) => b.effectiveFrom - a.effectiveFrom)),

    listVisitors: (q: Omit<VisitorQuery, 'tenantId'> = {}) => call<Visitor[]>(`/portal/${tenantId}/visitors`, (w) => filterVisitors(w, { ...q, tenantId })),
    listSchedules: () => call<VisitorSchedule[]>(`/portal/${tenantId}/schedules`, (w) => w.visitorSchedules.filter((s) => s.tenantId === tenantId)),
    scheduleVisitor: (input: Parameters<typeof simulation.scheduleVisitor>[0]) => call(`/portal/${tenantId}/visitors`, () => simulation.scheduleVisitor({ ...input, tenantId })),
    cancelVisitor: (id: string) => call(`/portal/${tenantId}/visitors/cancel`, () => simulation.setVisitorStatus(id, 'cancelled', 'Tenant')),

    listRequests: (q: Omit<RequestQuery, 'tenantId'> = {}) => call<ServiceRequest[]>(`/portal/${tenantId}/requests`, (w) => filterRequests(w, { ...q, tenantId })),
    getRequest: (id: string) => call<ServiceRequest | undefined>(`/portal/${tenantId}/requests/${id}`, (w) => w.requests.find((r) => r.id === id && r.tenantId === tenantId)),
    submitRequest: (input: Parameters<typeof simulation.submitRequest>[0]) => call(`/portal/${tenantId}/requests`, () => simulation.submitRequest({ ...input, tenantId })),
    addComment: (id: string, author: string, body: string) => call(`/portal/${tenantId}/requests/comment`, () => simulation.addRequestComment(id, { author, authorRole: 'tenant', body })),
    confirmResolution: (id: string, by: string) => call(`/portal/${tenantId}/requests/confirm`, () => simulation.transitionRequest(id, 'confirmed', by)),
    reopenRequest: (id: string, by: string, note?: string) => call(`/portal/${tenantId}/requests/reopen`, () => simulation.transitionRequest(id, 'reopened', by, note)),
    rateRequest: (id: string, score: number, feedback?: string) => call(`/portal/${tenantId}/requests/rate`, () => simulation.rateRequest(id, score, feedback)),

    listActivity: (limit = 30) => call<ActivityEvent[]>(`/portal/${tenantId}/activity`, (w) => w.activity.filter((a) => a.tenantId === tenantId).slice(0, limit)),
    listNotifications: () => call<AppNotification[]>(`/portal/${tenantId}/notifications`, (w) => w.notifications.filter((n) => n.tenantId === tenantId)),
  };
}

export type TenantApi = ReturnType<typeof makeTenantApi>;

/* --------------------------------------------------------------- filters */

function filterVisitors(w: World, q: VisitorQuery): Visitor[] {
  const term = q.search?.trim().toLowerCase();
  return w.visitors
    .filter((v) => {
      if (q.tenantId && v.tenantId !== q.tenantId) return false;
      if (q.status === 'today') {
        if (!(v.visitDate >= startOfToday && v.visitDate < startOfToday + 86_400_000)) return false;
      } else if (q.status && q.status !== 'all' && v.status !== q.status) return false;
      if (term && !(v.fullName.toLowerCase().includes(term) || (v.company ?? '').toLowerCase().includes(term) || v.reference.toLowerCase().includes(term))) return false;
      return true;
    })
    .sort((a, b) => b.expectedArrival - a.expectedArrival);
}

function filterRequests(w: World, q: RequestQuery): ServiceRequest[] {
  const term = q.search?.trim().toLowerCase();
  const open = (s: ServiceStatus) => !['closed', 'confirmed', 'cancelled'].includes(s);
  return w.requests
    .filter((r) => {
      if (q.tenantId && r.tenantId !== q.tenantId) return false;
      if (q.status === 'open') {
        if (!open(r.status)) return false;
      } else if (q.status && q.status !== 'all' && r.status !== q.status) return false;
      if (q.category && q.category !== 'all' && r.category !== q.category) return false;
      if (q.priority && q.priority !== 'all' && r.priority !== q.priority) return false;
      if (q.overdue && !(r.dueAt && r.dueAt < NOW && open(r.status))) return false;
      if (term && !(r.title.toLowerCase().includes(term) || r.reference.toLowerCase().includes(term))) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
