/**
 * Domain status glue. Each badge reads its label and tone from lib/meta so a
 * status looks the same everywhere, and pairs colour with text (and, for
 * categories, an icon) — never colour alone.
 */

import {
  Accessibility, Boxes, Brush, Building2, Car, Cctv, Fan, Flame, KeyRound, Lightbulb,
  MoveVertical, Plug, ShieldCheck, UserRound, Wifi, Wrench, Zap, type LucideIcon,
} from 'lucide-react';
import { StatusBadge } from './ui/primitives';
import {
  ALERT_LEVEL, ALERT_SEVERITY, METER_STATUS, PAYMENT_STATUS, SERVICE_PRIORITY, SERVICE_STATUS,
  TENANT_STATUS, VISITOR_STATUS, type Tone,
} from '../lib/meta';
import type {
  AlertLevel, AlertSeverity, MeterStatus, PaymentStatus, ServiceCategory, ServicePriority,
  ServiceStatus, TenantStatus, VisitorStatus, NotificationDomain,
} from '../data/types';

export function TenantStatusBadge({ status, size, pulse }: { status: TenantStatus; size?: 'sm' | 'md'; pulse?: boolean }) {
  const m = TENANT_STATUS[status];
  return <StatusBadge tone={m.tone} size={size} pulse={pulse ?? status === 'suspended'}>{m.label}</StatusBadge>;
}

export function ServiceStatusBadge({ status, size }: { status: ServiceStatus; size?: 'sm' | 'md' }) {
  const m = SERVICE_STATUS[status];
  return <StatusBadge tone={m.tone} size={size}>{m.label}</StatusBadge>;
}

export function PriorityBadge({ priority, size }: { priority: ServicePriority; size?: 'sm' | 'md' }) {
  const m = SERVICE_PRIORITY[priority];
  return <StatusBadge tone={m.tone} size={size} pulse={priority === 'critical'}>{m.label}</StatusBadge>;
}

export function VisitorStatusBadge({ status, size }: { status: VisitorStatus; size?: 'sm' | 'md' }) {
  const m = VISITOR_STATUS[status];
  return <StatusBadge tone={m.tone} size={size} pulse={status === 'overstaying'}>{m.label}</StatusBadge>;
}

export function AlertSeverityBadge({ severity, size }: { severity: AlertSeverity; size?: 'sm' | 'md' }) {
  const m = ALERT_SEVERITY[severity];
  return <StatusBadge tone={m.tone} size={size} pulse={severity === 'critical'}>{m.label}</StatusBadge>;
}

export function AlertLevelBadge({ level, size }: { level: AlertLevel; size?: 'sm' | 'md' }) {
  const m = ALERT_LEVEL[level];
  return <StatusBadge tone={m.tone} size={size} dot pulse={level === 'critical' || level === 'offline'}>{m.label}</StatusBadge>;
}

export function PaymentBadge({ status, size }: { status: PaymentStatus; size?: 'sm' | 'md' }) {
  const m = PAYMENT_STATUS[status];
  return <StatusBadge tone={m.tone} size={size} pulse={status === 'overdue'}>{m.label}</StatusBadge>;
}

export function MeterStatusBadge({ status, size }: { status: MeterStatus; size?: 'sm' | 'md' }) {
  const m = METER_STATUS[status];
  return <StatusBadge tone={m.tone} size={size} pulse={status === 'offline'}>{m.label}</StatusBadge>;
}

/* ------------------------------------------------------------- icon maps */

export const MODULE_ICON: Record<NotificationDomain, LucideIcon> = {
  energy: Zap,
  visitor: UserRound,
  service: Wrench,
  tenant: Building2,
  system: Boxes,
};

export const MODULE_TONE: Record<NotificationDomain, Tone> = {
  energy: 'energy',
  visitor: 'visitor',
  service: 'service',
  tenant: 'primary',
  system: 'neutral',
};

export const CATEGORY_ICON: Record<ServiceCategory, LucideIcon> = {
  electrical: Plug,
  hvac: Fan,
  lighting: Lightbulb,
  plumbing: Wrench,
  internet: Wifi,
  cleaning: Brush,
  security: ShieldCheck,
  access_control: KeyRound,
  elevator: MoveVertical,
  fire_safety: Flame,
  parking: Car,
  building_maintenance: Building2,
  other: Boxes,
};

export { Cctv, Accessibility };
