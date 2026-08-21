/**
 * Tenant Portal — Recurring Visitors (§22). Vendors, contractors and regular
 * contacts on a configurable recurrence. Pause, resume, edit-scope and cancel;
 * historical visits are never modified.
 */

import { Info, Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/data';
import { Button, IconBox, StatusBadge } from '../../../components/ui/primitives';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '../../../components/ui/overlay';
import { Field, Input, SimpleSelect } from '../../../components/ui/form';
import { useSession } from '../../../store/session';
import { simulation, useLive } from '../../../data/live';
import { fmtDateFull } from '../../../lib/utils';
import type { RecurrenceKind, VisitorSchedule } from '../../../data/types';

const RECURRENCE: Array<{ value: RecurrenceKind; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

export default function RecurringVisitors() {
  const { tenantId, toast } = useSession();
  const schedules = useLive((w) => w.visitorSchedules.filter((s) => s.tenantId === tenantId));
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Card>
        <CardHeader
          title="Recurring Visitors"
          subtitle={`${schedules.length} schedule${schedules.length === 1 ? '' : 's'}`}
          icon={<IconBox icon={Repeat} tone="visitor" size="sm" />}
          actions={<Button variant="primary" size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add recurring</Button>}
        />
        <CardBody className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-[12px] text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
            <span>Each recurrence generates individual visit instances at reception. Pausing stops future instances; past visits are unaffected.</span>
          </div>
          {schedules.length === 0 ? (
            <EmptyState title="No recurring visitors" description="Set up a recurring schedule for vendors or contractors." icon={<Repeat className="h-5 w-5" />} />
          ) : (
            schedules.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3.5">
                <IconBox icon={Repeat} tone={s.active ? 'visitor' : 'neutral'} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">{s.visitorName}</p>
                    <StatusBadge tone={s.active ? 'success' : 'neutral'} size="sm">{s.active ? 'Active' : 'Paused'}</StatusBadge>
                  </div>
                  <p className="truncate text-[11.5px] text-subtle">{s.company ?? s.purpose} · {s.recurrence} · {s.startTime}–{s.endTime} · from {fmtDateFull(s.startsOn)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="ghost" size="xs" onClick={() => { simulation.setScheduleActive(s.id, !s.active); toast({ title: s.active ? 'Recurrence paused' : 'Recurrence resumed', variant: s.active ? 'warning' : 'success' }); }}>
                    {s.active ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-subtle hover:text-critical" onClick={() => { simulation.removeSchedule(s.id); toast({ title: 'Recurrence cancelled', variant: 'default' }); }} aria-label="Cancel"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <AddRecurringDialog open={adding} onOpenChange={setAdding} tenantId={tenantId} onAdded={(name) => toast({ title: 'Recurring visitor added', description: `${name} scheduled.`, variant: 'success' })} />
    </>
  );
}

function AddRecurringDialog({ open, onOpenChange, tenantId, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; onAdded: (name: string) => void }) {
  const tenant = useLive((w) => w.tenantById[tenantId]);
  const [f, setF] = useState({ visitorName: '', company: '', phone: '', purpose: '', recurrence: 'weekly' as RecurrenceKind, startTime: '09:30', endTime: '11:30' });
  const set = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));
  const valid = f.visitorName.trim() && f.phone.trim() && f.purpose.trim();

  const submit = () => {
    if (!valid) return;
    const schedule: VisitorSchedule = {
      id: `vsch-${Date.now().toString(36)}`, tenantId, visitorName: f.visitorName.trim(), company: f.company || undefined,
      phone: f.phone.trim(), purpose: f.purpose.trim(), host: tenant?.primaryContact.name ?? 'Reception',
      recurrence: f.recurrence, weekdays: [1, 3, 5], startTime: f.startTime, endTime: f.endTime,
      startsOn: Date.now(), active: true, createdAt: Date.now(),
    };
    simulation.addSchedule(schedule);
    onAdded(f.visitorName.trim());
    onOpenChange(false);
    setF({ visitorName: '', company: '', phone: '', purpose: '', recurrence: 'weekly', startTime: '09:30', endTime: '11:30' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader title="Add Recurring Visitor" description="Set up a repeating visit for a vendor or contractor." />
        <DialogBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Visitor name" required><Input value={f.visitorName} onChange={(e) => set({ visitorName: e.target.value })} placeholder="Name" /></Field>
          <Field label="Company" optional><Input value={f.company} onChange={(e) => set({ company: e.target.value })} placeholder="Company" /></Field>
          <Field label="Phone" required><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+92 3XX XXXXXXX" /></Field>
          <Field label="Purpose" required><Input value={f.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="e.g. Cleaning contractor" /></Field>
          <Field label="Recurrence" required><SimpleSelect value={f.recurrence} onChange={(v) => set({ recurrence: v })} options={RECURRENCE} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><Input type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} /></Field>
            <Field label="End time"><Input type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} /></Field>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={submit}><Plus className="h-4 w-4" />Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
