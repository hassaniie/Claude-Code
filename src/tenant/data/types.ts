/**
 * NASTP Tenant Operations — domain model.
 *
 * These types mirror what the real Tenant Operations API will return, so the
 * generator in `world.ts` and the simulation in `live.ts` can be swapped for
 * HTTP calls without touching a component. Everything a screen renders is
 * declared here. The tenant is the central operational identity: users,
 * offices, meters, readings, bills, visitors, requests and activity all hang
 * off a `tenantId`, which is also the isolation boundary for the portal.
 */

/* ============================================================ infrastructure */

export type BuildingId = string;
export type FloorId = string;

export interface Building {
  id: BuildingId;
  name: string;
  code: string;
  /** Ordered floor ids, ground-up. */
  floorIds: FloorId[];
  address: string;
  grossAreaSqft: number;
}

export interface Floor {
  id: FloorId;
  buildingId: BuildingId;
  name: string;
  level: number;
  /** Every floor carries exactly one infrastructure main meter. */
  mainMeterId: string;
  netLeasableSqft: number;
}

export type SpaceStatus = 'occupied' | 'vacant';

/** An office/unit a tenant occupies. Area drives the space summary and can be
 *  read in either unit; storage is always square feet. */
export interface OfficeSpace {
  id: string;
  code: string; // e.g. "DELTA-GF-04"
  label: string; // e.g. "Suite 4"
  buildingId: BuildingId;
  floorId: FloorId;
  tenantId: string | null;
  areaSqft: number;
  status: SpaceStatus;
  /** Sub-meter that measures this space's consumption, if wired. */
  meterId: string | null;
}

/* ==================================================================== tenant */

export type TenantStatus =
  | 'draft'
  | 'pending_configuration'
  | 'pending_activation'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'archived';

export type OrganizationType =
  | 'private_limited'
  | 'public_limited'
  | 'multinational'
  | 'government'
  | 'ngo'
  | 'sole_proprietor'
  | 'partnership';

export interface TenantContact {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  code: string; // short handle, e.g. "ORBTEK"
  organizationType: OrganizationType;
  registrationNo?: string;
  ntn?: string; // tax id
  status: TenantStatus;
  primaryContact: TenantContact;
  secondaryContact?: TenantContact;
  buildingId: BuildingId;
  /** Denormalised for list rendering; the source of truth is OfficeSpace. */
  floorIds: FloorId[];
  officeIds: string[];
  meterIds: string[];
  logoSeed: number;
  brandHue: number;
  createdAt: number;
  activatedAt?: number;
  contractStart?: number;
  contractEnd?: number;
  /** Config completeness, 0–1, drives the "pending configuration" signals. */
  configScore: number;
}

export type TenantUserRole =
  | 'primary'
  | 'tenant_admin'
  | 'facility_manager'
  | 'finance_user'
  | 'receptionist'
  | 'standard_user';

export type TenantUserStatus = 'invited' | 'active' | 'disabled';

export interface TenantUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  role: TenantUserRole;
  status: TenantUserStatus;
  lastActiveAt?: number;
  invitedAt: number;
  avatarSeed: number;
}

/* ==================================================================== energy */

export type MeterKind = 'main' | 'sub';
export type MeterStatus = 'online' | 'offline' | 'degraded';

export interface Meter {
  id: string;
  serial: string;
  name: string;
  kind: MeterKind;
  buildingId: BuildingId;
  floorId: FloorId;
  /** Null for main/infrastructure meters — they belong to the floor, not a tenant. */
  tenantId: string | null;
  officeId: string | null;
  status: MeterStatus;
  model: string;
  ctRatio: string;
  installedAt: number;
  lastReadingAt: number;
  /** Live electrical snapshot — the socket updates this in place. */
  live: ElectricalSnapshot;
  /** Cumulative kWh register (import). */
  totalKwh: number;
}

/** The instantaneous electrical parameters a smart meter reports. */
export interface ElectricalSnapshot {
  powerKw: number;
  voltage: number;
  current: number;
  powerFactor: number;
  frequency: number;
  apparentKva: number;
  reactiveKvar: number;
  maxDemandKw: number;
  peakDemandKw: number;
}

/** A time-bucketed consumption reading for charts and billing. */
export interface MeterReading {
  ts: number;
  label: string;
  kwh: number;
  peakKwh: number;
  offPeakKwh: number;
  demandKw: number;
  powerFactor: number;
}

/* ---------------------------------------------------------------- tariffs */

export type ChargeComponent = 'energy' | 'genset' | 'peak' | 'off_peak';

export interface TariffRate {
  component: ChargeComponent;
  /** PKR per kWh. */
  rate: number;
}

/**
 * A globally-configured rate schedule with an effective period. Historical
 * consumption stays bound to the rate that applied when it was metered, so a
 * rate change never silently recomputes a past bill.
 */
export interface Tariff {
  id: string;
  name: string;
  effectiveFrom: number;
  effectiveTo: number | null; // null = current
  rates: TariffRate[];
  note?: string;
}

/** A configurable peak window; the system is never hardcoded to fixed hours. */
export interface PeakWindow {
  id: string;
  label: string;
  startHour: number; // 0–23
  endHour: number; // exclusive
  days: number[]; // 0=Sun … 6=Sat
}

/* ---------------------------------------------------------------- billing */

export type PaymentStatus = 'paid' | 'due' | 'overdue' | 'processing';

export interface BillingLine {
  component: ChargeComponent;
  units: number; // kWh
  rate: number; // PKR/kWh applied
  amount: number;
}

export interface Invoice {
  id: string;
  number: string; // e.g. "INV-2026-0421"
  tenantId: string;
  periodLabel: string; // "July 2026"
  periodStart: number;
  periodEnd: number;
  totalKwh: number;
  peakKwh: number;
  offPeakKwh: number;
  lines: BillingLine[];
  tariffId: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  dueDate: number;
  issuedAt: number;
  paidAt?: number;
}

/* =================================================================== alerts */

export type AlertKind =
  | 'high_consumption'
  | 'consumption_threshold'
  | 'high_demand'
  | 'charge_threshold'
  | 'meter_offline'
  | 'unusual_consumption'
  | 'low_power_factor';

export type AlertSeverity = 'info' | 'attention' | 'warning' | 'critical';
export type AlertLevel = 'normal' | 'attention' | 'warning' | 'critical' | 'offline';

/** Per-tenant alert rule — the admin enables and tunes these at onboarding. */
export interface AlertRule {
  kind: AlertKind;
  enabled: boolean;
  threshold: number;
  unit: string;
  severity: AlertSeverity;
  notify: boolean;
}

export interface EnergyAlert {
  id: string;
  tenantId: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string; // meter serial / name
  meterId?: string;
  value?: number;
  threshold?: number;
  ts: number;
  status: 'active' | 'acknowledged' | 'resolved';
}

/* ================================================================= visitors */

export type VisitorStatus =
  | 'scheduled'
  | 'in_building'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'overstaying';

export type RecurrenceKind = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Visitor {
  id: string;
  tenantId: string;
  reference: string; // "VIS-8842"
  fullName: string;
  phone: string;
  email?: string;
  cnic?: string;
  passport?: string;
  company?: string;
  vehicleNo?: string;
  purpose: string;
  host: string; // tenant user hosting
  hostUserId?: string;
  buildingId: BuildingId;
  visitDate: number;
  expectedArrival: number;
  expectedDeparture: number;
  actualArrival?: number;
  actualDeparture?: number;
  status: VisitorStatus;
  notes?: string;
  /** Set when spawned from a recurring schedule. */
  scheduleId?: string;
}

export interface VisitorSchedule {
  id: string;
  tenantId: string;
  visitorName: string;
  company?: string;
  phone: string;
  purpose: string;
  host: string;
  recurrence: RecurrenceKind;
  /** For weekly: weekday numbers; for custom: cron-ish description. */
  weekdays?: number[];
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  startsOn: number;
  endsOn?: number;
  active: boolean;
  createdAt: number;
}

export interface VisitorStatusEvent {
  ts: number;
  status: VisitorStatus;
  by: string;
  note?: string;
}

/* ============================================================ service center */

export type ServiceCategory =
  | 'electrical'
  | 'hvac'
  | 'lighting'
  | 'plumbing'
  | 'internet'
  | 'cleaning'
  | 'security'
  | 'access_control'
  | 'elevator'
  | 'fire_safety'
  | 'parking'
  | 'building_maintenance'
  | 'other';

export type ServicePriority = 'low' | 'medium' | 'high' | 'critical';

export type ServiceStatus =
  | 'submitted'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'waiting_tenant'
  | 'resolved'
  | 'confirmed'
  | 'closed'
  | 'cancelled'
  | 'reopened';

export interface ServiceAttachment {
  id: string;
  name: string;
  kind: 'image' | 'document';
  sizeKb: number;
  uploadedAt: number;
}

export interface ServiceComment {
  id: string;
  author: string;
  authorRole: 'tenant' | 'admin' | 'system';
  body: string;
  ts: number;
  internal?: boolean;
}

export interface ServiceStatusEvent {
  ts: number;
  status: ServiceStatus;
  by: string;
  note?: string;
}

export interface ServiceRating {
  score: number; // 1–5
  feedback?: string;
  ratedAt: number;
}

export interface ServiceRequest {
  id: string;
  reference: string; // "SR-4821"
  tenantId: string;
  title: string;
  description: string;
  category: ServiceCategory;
  priority: ServicePriority;
  status: ServiceStatus;
  officeId?: string;
  location?: string;
  createdBy: string;
  assignedTo?: string;
  assignedTeam?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  dueAt?: number;
  attachments: ServiceAttachment[];
  comments: ServiceComment[];
  timeline: ServiceStatusEvent[];
  rating?: ServiceRating;
}

/* ============================================ notifications / activity feed */

export type NotificationDomain = 'energy' | 'visitor' | 'service' | 'tenant' | 'system';

export interface AppNotification {
  id: string;
  domain: NotificationDomain;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  severity: AlertSeverity;
  /** Audience: an admin notification, or scoped to one tenant's portal. */
  tenantId?: string;
  href?: string;
}

export type ActivityKind =
  | 'tenant_created'
  | 'tenant_activated'
  | 'tenant_suspended'
  | 'office_added'
  | 'meter_assigned'
  | 'user_invited'
  | 'alert_triggered'
  | 'visitor_scheduled'
  | 'visitor_checked_in'
  | 'visitor_checked_out'
  | 'request_submitted'
  | 'request_updated'
  | 'request_resolved'
  | 'invoice_issued';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  ts: number;
  tenantId: string;
  title: string;
  detail: string;
  actor: string;
  domain: NotificationDomain;
}

/* ==================================================================== async */

/** Standard envelope for every async read — screens branch on `status`. */
export interface AsyncResult<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: string;
  fetchedAt?: number;
}

/* ============================================================ derived views */

export interface TenantSummary {
  tenant: Tenant;
  buildingName: string;
  floorNames: string[];
  officeCount: number;
  totalAreaSqft: number;
  meterCount: number;
  offlineMeters: number;
  currentLoadKw: number;
  periodKwh: number;
  periodCharges: number;
  openRequests: number;
  criticalRequests: number;
  visitorsInside: number;
  activeAlerts: number;
  lastActivityAt: number;
}

export interface AdminKpis {
  tenantsTotal: number;
  tenantsActive: number;
  tenantsPending: number;
  tenantsSuspended: number;
  totalConsumptionKwh: number;
  currentLoadKw: number;
  peakDemandKw: number;
  totalChargesMonth: number;
  highConsumptionAlerts: number;
  offlineMeters: number;
  metersTotal: number;
  visitorsScheduledToday: number;
  visitorsInside: number;
  visitorsOverstaying: number;
  visitorsCheckedOutToday: number;
  requestsOpen: number;
  requestsHigh: number;
  requestsCritical: number;
  requestsOverdue: number;
  requestsResolvedToday: number;
}

export interface TenantPortalSnapshot {
  currentLoadKw: number;
  currentDemandKw: number;
  periodKwh: number;
  periodPeakKwh: number;
  periodOffPeakKwh: number;
  periodCharges: number;
  peakDemandKw: number;
  activeMeters: number;
  totalMeters: number;
  activeAlerts: number;
  visitorsScheduledToday: number;
  visitorsInside: number;
  nextVisitor?: Visitor;
  openRequests: number;
  inProgressRequests: number;
  waitingRequests: number;
}
