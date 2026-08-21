import {
  Building2, DoorOpen, FilePlus2, Gauge, PlugZap, ReceiptText, ShieldOff, UserPlus, Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityKind } from '../data/types';

export const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  tenant_created: Building2,
  tenant_activated: Building2,
  tenant_suspended: ShieldOff,
  office_added: Building2,
  meter_assigned: Gauge,
  user_invited: UserPlus,
  alert_triggered: PlugZap,
  visitor_scheduled: DoorOpen,
  visitor_checked_in: DoorOpen,
  visitor_checked_out: DoorOpen,
  request_submitted: FilePlus2,
  request_updated: Wrench,
  request_resolved: Wrench,
  invoice_issued: ReceiptText,
};
