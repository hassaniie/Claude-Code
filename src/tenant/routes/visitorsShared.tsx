/**
 * Shared visitor building blocks for the admin operations and the portal.
 *
 * A visitor detail drawer with the verification/reception workflow (§19–20) —
 * schedule → verify at reception → in-building → check out — and a reusable
 * table. Visitors receive no QR pass; reception verifies details on arrival.
 */

import { CalendarClock, Car, DoorClosed, DoorOpen, Mail, Phone, ShieldCheck, XCircle } from 'lucide-react';
import { Button, IconBox } from '../components/ui/primitives';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '../components/ui/overlay';
import { DataTable, DefList, type Column } from '../components/ui/data';
import { Timeline, type TimelineItem } from '../components/common';
import { VisitorStatusBadge } from '../components/status';
import { simulation } from '../data/live';
import { useSession } from '../store/session';
import { ago, fmtDate, fmtTime, num } from '../lib/utils';
import type { Visitor } from '../data/types';

export function visitorColumns(opts: { showTenant?: (v: Visitor) => string } = {}): Column<Visitor>[] {
  const cols: Column<Visitor>[] = [
    { key: 'name', header: 'Visitor', cell: (v) => <div><p className="font-medium text-foreground">{v.fullName}</p><p className="text-[11px] text-subtle">{v.company ?? v.purpose}</p></div>, sortValue: (v) => v.fullName },
  ];
  if (opts.showTenant) cols.push({ key: 'tenant', header: 'Host tenant', cell: (v) => opts.showTenant!(v), hideBelow: 'lg' });
  cols.push(
    { key: 'host', header: 'Host', cell: (v) => v.host, hideBelow: 'xl' },
    { key: 'when', header: 'Expected', cell: (v) => <span className="tnum">{fmtDate(v.visitDate)} · {fmtTime(v.expectedArrival)}</span>, sortValue: (v) => v.expectedArrival, hideBelow: 'sm' },
    { key: 'status', header: 'Status', cell: (v) => <VisitorStatusBadge status={v.status} size="sm" /> },
  );
  return cols;
}

export function VisitorTable({ visitors, loading, onOpen, selectedKey, showTenant, pageSize = 12, emptyTitle = 'No visitors', emptyDescription }: {
  visitors: Visitor[];
  loading?: boolean;
  onOpen: (v: Visitor) => void;
  selectedKey?: string;
  showTenant?: (v: Visitor) => string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <DataTable
      rows={visitors}
      columns={visitorColumns({ showTenant })}
      rowKey={(v) => v.id}
      onRowClick={onOpen}
      selectedKey={selectedKey}
      loading={loading}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyIcon={<DoorOpen className="h-5 w-5" />}
      pageSize={pageSize}
    />
  );
}

export function VisitorDrawer({ visitor, open, onOpenChange, mode = 'admin', tenantName }: { visitor: Visitor | null; open: boolean; onOpenChange: (o: boolean) => void; mode?: 'admin' | 'tenant'; tenantName?: string }) {
  const { toast } = useSession();
  if (!visitor) return null;
  const v = visitor;

  const timeline: TimelineItem[] = [
    { id: 'sch', icon: CalendarClock, tone: 'info', title: 'Scheduled', detail: `Expected ${fmtDate(v.visitDate)} ${fmtTime(v.expectedArrival)}–${fmtTime(v.expectedDeparture)}` },
  ];
  if (v.actualArrival) timeline.push({ id: 'in', icon: DoorOpen, tone: 'success', title: 'Checked in', detail: 'Verified at reception', meta: fmtTime(v.actualArrival) });
  if (v.status === 'overstaying') timeline.push({ id: 'over', icon: DoorOpen, tone: 'critical', title: 'Overstaying', detail: `Past expected departure of ${fmtTime(v.expectedDeparture)}`, meta: ago(v.expectedDeparture) });
  if (v.actualDeparture) timeline.push({ id: 'out', icon: DoorClosed, tone: 'neutral', title: 'Checked out', detail: 'Visit completed', meta: fmtTime(v.actualDeparture) });
  if (v.status === 'cancelled') timeline.push({ id: 'cx', icon: XCircle, tone: 'neutral', title: 'Cancelled', detail: 'Visit cancelled' });
  if (v.status === 'no_show') timeline.push({ id: 'ns', icon: XCircle, tone: 'warning', title: 'No show', detail: 'Visitor did not arrive' });

  const checkIn = () => { simulation.setVisitorStatus(v.id, 'in_building', 'Reception'); toast({ title: 'Visitor checked in', description: `${v.fullName} is now in the building.`, variant: 'success' }); onOpenChange(false); };
  const checkOut = () => { simulation.setVisitorStatus(v.id, 'checked_out', 'Reception'); toast({ title: 'Visitor checked out', description: `${v.fullName}'s visit is complete.`, variant: 'default' }); onOpenChange(false); };
  const cancel = () => { simulation.setVisitorStatus(v.id, 'cancelled', mode === 'tenant' ? 'Tenant' : 'Reception'); toast({ title: 'Visit cancelled', description: `${v.fullName}'s visit was cancelled.`, variant: 'warning' }); onOpenChange(false); };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width="480px">
        <DrawerHeader title={v.fullName} subtitle={`${v.reference}${tenantName ? ' · ' + tenantName : ''}`} badge={<VisitorStatusBadge status={v.status} size="sm" />} />
        <DrawerBody className="flex flex-col gap-5">
          <DefList columns={2} items={[
            { label: 'Company', value: v.company ?? '—' },
            { label: 'Purpose', value: v.purpose },
            { label: <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />Phone</span>, value: v.phone },
            { label: <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>, value: v.email ?? '—' },
            { label: 'CNIC / ID', value: v.cnic ?? '—' },
            { label: <span className="inline-flex items-center gap-1"><Car className="h-3 w-3" />Vehicle</span>, value: v.vehicleNo ?? '—' },
            { label: 'Host', value: v.host, span: true },
          ]} />
          {v.notes && <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-[12px] text-muted">{v.notes}</div>}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Visit timeline</p>
            <Timeline items={timeline} />
          </div>
        </DrawerBody>
        <DrawerFooter>
          {(v.status === 'scheduled') && (
            <>
              <Button variant="ghost" size="sm" onClick={cancel}><XCircle className="h-4 w-4" />Cancel</Button>
              {mode === 'admin' && <Button variant="primary" size="sm" onClick={checkIn}><ShieldCheck className="h-4 w-4" />Verify & check in</Button>}
            </>
          )}
          {(v.status === 'in_building' || v.status === 'overstaying') && mode === 'admin' && (
            <Button variant="secondary" size="sm" onClick={checkOut}><DoorClosed className="h-4 w-4" />Check out</Button>
          )}
          {(v.status === 'checked_out' || v.status === 'cancelled' || v.status === 'no_show') && (
            <span className="text-[12px] text-subtle">This visit is closed.</span>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export { IconBox, num };
