/**
 * Enum → presentation metadata. One place decides how every status reads and
 * which semantic tone it carries, so a lifecycle state never renders one colour
 * on the dashboard and another in the detail workspace.
 *
 * `Tone` maps onto the design tokens in styles/theme.css. Status is never
 * communicated by colour alone — components pair the tone with a label, and
 * often an icon, per the accessibility rules.
 */

import type {
  AlertLevel, AlertSeverity, PaymentStatus, ServicePriority, ServiceStatus, TenantStatus,
  TenantUserRole, VisitorStatus,
} from '../data/types';

export type Tone =
  | 'neutral' | 'primary' | 'success' | 'warning' | 'critical' | 'info'
  | 'energy' | 'visitor' | 'service' | 'online' | 'offline';

export interface StatusMeta {
  label: string;
  tone: Tone;
  description?: string;
}

export const TENANT_STATUS: Record<TenantStatus, StatusMeta> = {
  draft: { label: 'Draft', tone: 'neutral', description: 'Tenant information is incomplete.' },
  pending_configuration: { label: 'Pending Configuration', tone: 'warning', description: 'Infrastructure and configuration are incomplete.' },
  pending_activation: { label: 'Pending Activation', tone: 'info', description: 'Configuration complete, awaiting activation.' },
  active: { label: 'Active', tone: 'success', description: 'Portal is operational.' },
  suspended: { label: 'Suspended', tone: 'critical', description: 'Portal access is disabled.' },
  expired: { label: 'Expired', tone: 'neutral', description: 'Contract has expired.' },
  archived: { label: 'Archived', tone: 'neutral', description: 'Historical record, no longer operational.' },
};

/** Lifecycle order for progress rendering and next-action logic. */
export const TENANT_LIFECYCLE: TenantStatus[] = [
  'draft', 'pending_configuration', 'pending_activation', 'active', 'suspended', 'expired', 'archived',
];

export const SERVICE_STATUS: Record<ServiceStatus, StatusMeta> = {
  submitted: { label: 'Submitted', tone: 'info' },
  acknowledged: { label: 'Acknowledged', tone: 'info' },
  assigned: { label: 'Assigned', tone: 'primary' },
  in_progress: { label: 'In Progress', tone: 'primary' },
  waiting_tenant: { label: 'Waiting for Tenant', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  reopened: { label: 'Reopened', tone: 'critical' },
};

/** The admin board columns, in workflow order. */
export const SERVICE_BOARD: ServiceStatus[] = [
  'submitted', 'acknowledged', 'assigned', 'in_progress', 'waiting_tenant', 'resolved',
];

/** The tenant-facing lifecycle steps for the request timeline. */
export const SERVICE_FLOW: ServiceStatus[] = [
  'submitted', 'acknowledged', 'assigned', 'in_progress', 'waiting_tenant', 'resolved', 'confirmed', 'closed',
];

export const SERVICE_PRIORITY: Record<ServicePriority, StatusMeta> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  critical: { label: 'Critical', tone: 'critical' },
};

export const VISITOR_STATUS: Record<VisitorStatus, StatusMeta> = {
  scheduled: { label: 'Scheduled', tone: 'info' },
  in_building: { label: 'In Building', tone: 'success' },
  checked_out: { label: 'Checked Out', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  no_show: { label: 'No Show', tone: 'warning' },
  overstaying: { label: 'Overstaying', tone: 'critical' },
};

export const ALERT_SEVERITY: Record<AlertSeverity, StatusMeta> = {
  info: { label: 'Info', tone: 'info' },
  attention: { label: 'Attention', tone: 'primary' },
  warning: { label: 'Warning', tone: 'warning' },
  critical: { label: 'Critical', tone: 'critical' },
};

export const ALERT_LEVEL: Record<AlertLevel, StatusMeta> = {
  normal: { label: 'Normal', tone: 'success' },
  attention: { label: 'Attention', tone: 'primary' },
  warning: { label: 'Warning', tone: 'warning' },
  critical: { label: 'Critical', tone: 'critical' },
  offline: { label: 'Offline', tone: 'offline' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  paid: { label: 'Paid', tone: 'success' },
  due: { label: 'Due', tone: 'warning' },
  overdue: { label: 'Overdue', tone: 'critical' },
  processing: { label: 'Processing', tone: 'info' },
};

export const USER_ROLE: Record<TenantUserRole, string> = {
  primary: 'Primary User',
  tenant_admin: 'Tenant Admin',
  facility_manager: 'Facility Manager',
  finance_user: 'Finance User',
  receptionist: 'Receptionist',
  standard_user: 'Standard User',
};

export const ALERT_KIND_LABEL: Record<string, string> = {
  high_consumption: 'High Consumption',
  consumption_threshold: 'Consumption Threshold',
  high_demand: 'High Demand',
  charge_threshold: 'Charge / Budget Threshold',
  meter_offline: 'Meter Offline',
  unusual_consumption: 'Unusual Consumption',
  low_power_factor: 'Low Power Factor',
};

export const METER_STATUS: Record<string, StatusMeta> = {
  online: { label: 'Online', tone: 'online' },
  offline: { label: 'Offline', tone: 'offline' },
  degraded: { label: 'Degraded', tone: 'warning' },
};
