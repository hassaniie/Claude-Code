/**
 * Visitor registration.
 *
 * Launched automatically when ANPR cannot read a plate, and manually from the
 * Visitors screen. Two steps: capture the details, then issue the ticket with
 * its tariff and printable receipt — the operator should never have to leave
 * this dialog to finish admitting a vehicle.
 */

import {
  Bike, Building2, Car, CheckCircle2, IdCard, Phone, Printer, ScanLine, Ticket, User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn, currency, fmtDateTime } from '../../lib/utils';
import { DEPARTMENTS, PURPOSES } from '../../data/names';
import type { Visitor } from '../../data/types';
import { parkingApi } from '../../data/api';
import { useSession } from '../../store/session';
import { Badge, Button, Separator } from '../ui/primitives';
import { Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/form';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '../ui/overlay';
import { PlateTag } from './atoms';
import { CameraFeed } from './CameraFeed';

/** Published tariff — the real system reads this from Administration → Tariffs. */
export const TARIFF = {
  car: { firstHour: 100, perHour: 60, dailyCap: 700 },
  motorcycle: { firstHour: 50, perHour: 30, dailyCap: 300 },
};

export function estimateCharge(vehicleClass: 'car' | 'motorcycle', hours: number) {
  const t = TARIFF[vehicleClass];
  const total = t.firstHour + Math.max(0, Math.ceil(hours) - 1) * t.perHour;
  return Math.min(total, t.dailyCap);
}

interface FormState {
  plate: string;
  name: string;
  phone: string;
  company: string;
  purpose: string;
  cnic: string;
  host: string;
  hostDepartment: string;
  vehicleClass: 'car' | 'motorcycle';
}

const EMPTY: FormState = {
  plate: '', name: '', phone: '', company: '', purpose: PURPOSES[0],
  cnic: '', host: '', hostDepartment: DEPARTMENTS[0], vehicleClass: 'car',
};

export function VisitorRegistrationDialog({
  open,
  onOpenChange,
  prefillPlate,
  laneName,
  snapshotSeed = 42,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillPlate?: string;
  laneName?: string;
  snapshotSeed?: number;
  onRegistered?: (visitor: Visitor) => void;
}) {
  const { toast } = useSession();
  const [form, setForm] = useState<FormState>({ ...EMPTY, plate: prefillPlate ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<{ visitor: Visitor; spaceCode?: string } | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, plate: prefillPlate ?? '' });
      setErrors({});
      setIssued(null);
    }
  }, [open, prefillPlate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const estimate = useMemo(() => estimateCharge(form.vehicleClass, 2), [form.vehicleClass]);

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!/^[A-Z]{2,4}-?\d{2,4}$/i.test(form.plate.trim())) next.plate = 'Enter a valid plate, e.g. ICT-4821';
    if (form.name.trim().length < 3) next.name = 'Visitor name is required';
    if (!/^[+0-9 ()-]{7,}$/.test(form.phone.trim())) next.phone = 'Enter a contactable phone number';
    if (form.company.trim().length < 2) next.company = 'Company or organisation is required';
    if (form.host.trim().length < 3) next.host = 'Host name is required';
    if (form.cnic.trim().length < 6) next.cnic = 'CNIC / ID number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await parkingApi.registerVisitor({
        ...form,
        plate: form.plate.toUpperCase().trim(),
      });
      setIssued({ visitor: result.visitor, spaceCode: result.space?.code });
      toast({
        title: 'Visitor registered',
        description: `Ticket ${result.visitor.ticket} issued for ${result.visitor.plate}`,
        variant: 'success',
      });
      onRegistered?.(result.visitor);
    } catch (err) {
      toast({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'The visitor service did not respond.',
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader
          icon={issued ? <CheckCircle2 className="h-4 w-4 text-success" /> : <ScanLine className="h-4 w-4" />}
          title={issued ? 'Visitor ticket issued' : 'Register visitor'}
          description={
            issued
              ? 'Hand the receipt to the driver and raise the barrier.'
              : laneName
                ? `ANPR could not read the plate at ${laneName}. Capture the visitor's details to admit the vehicle.`
                : 'Capture visitor details to issue a parking ticket.'
          }
        />

        <DialogBody>
          {issued ? (
            <Receipt visitor={issued.visitor} spaceCode={issued.spaceCode} />
          ) : (
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                <CameraFeed seed={snapshotSeed} state="snapshot" label="Lane capture" lane className="w-full" />
                <p className="text-[10.5px] leading-relaxed text-subtle">
                  Plate unreadable — glare or obstruction. Type the plate from the capture above.
                </p>
                <div className="rounded-lg border border-border bg-surface-inset p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">Tariff</p>
                  <p className="tnum mt-1 text-[11.5px] text-muted">
                    First hour {currency(TARIFF[form.vehicleClass].firstHour)}, then{' '}
                    {currency(TARIFF[form.vehicleClass].perHour)}/hr
                  </p>
                  <p className="tnum mt-0.5 text-[11.5px] text-muted">
                    Daily cap {currency(TARIFF[form.vehicleClass].dailyCap)}
                  </p>
                  <p className="tnum mt-1.5 text-[12px] font-semibold text-foreground">
                    Est. 2h visit — {currency(estimate)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Vehicle number" required error={errors.plate} className="sm:col-span-2">
                  <div className="flex gap-2">
                    <Input
                      value={form.plate}
                      onChange={(e) => set('plate', e.target.value.toUpperCase())}
                      placeholder="ICT-4821"
                      className="font-mono uppercase"
                      invalid={Boolean(errors.plate)}
                      autoFocus
                    />
                    <div className="flex shrink-0 gap-1">
                      {(['car', 'motorcycle'] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => set('vehicleClass', c)}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                            form.vehicleClass === c
                              ? 'border-primary bg-primary-muted text-primary'
                              : 'border-border bg-surface-inset text-subtle hover:text-foreground',
                          )}
                          aria-label={c}
                          aria-pressed={form.vehicleClass === c}
                        >
                          {c === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>

                <Field label="Visitor name" required error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Full name"
                    invalid={Boolean(errors.name)}
                  />
                </Field>

                <Field label="Phone" required error={errors.phone}>
                  <Input
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+92 300 1234567"
                    invalid={Boolean(errors.phone)}
                  />
                </Field>

                <Field label="Company" required error={errors.company}>
                  <Input
                    value={form.company}
                    onChange={(e) => set('company', e.target.value)}
                    placeholder="Organisation"
                    invalid={Boolean(errors.company)}
                  />
                </Field>

                <Field label="CNIC / ID" required error={errors.cnic}>
                  <Input
                    value={form.cnic}
                    onChange={(e) => set('cnic', e.target.value)}
                    placeholder="35202-1234567-1"
                    className="font-mono"
                    invalid={Boolean(errors.cnic)}
                  />
                </Field>

                <Field label="Purpose of visit">
                  <Select value={form.purpose} onValueChange={(v) => set('purpose', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Host department">
                  <Select value={form.hostDepartment} onValueChange={(v) => set('hostDepartment', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Host name" required error={errors.host} className="sm:col-span-2">
                  <Input
                    value={form.host}
                    onChange={(e) => set('host', e.target.value)}
                    placeholder="Who are they visiting?"
                    invalid={Boolean(errors.host)}
                  />
                </Field>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {issued ? (
            <>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
                Print receipt
              </Button>
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={submitting} onClick={submit}>
                <Ticket className="h-3.5 w-3.5" />
                Issue ticket &amp; admit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Receipt({ visitor, spaceCode }: { visitor: Visitor; spaceCode?: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-surface-inset p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">Nexus Corporate Plaza</p>
          <p className="mt-0.5 text-[13px] font-semibold text-foreground">Visitor Parking Ticket</p>
        </div>
        <Badge tone="success">{visitor.ticket}</Badge>
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <PlateTag plate={visitor.plate} size="lg" />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">Assigned bay</p>
          <p className="font-mono text-[15px] font-semibold text-foreground">{spaceCode ?? 'Free choice'}</p>
        </div>
      </div>

      <Separator className="my-4" />

      <dl className="grid grid-cols-2 gap-y-2.5 text-[12px]">
        <Row icon={User} label="Visitor" value={visitor.name} />
        <Row icon={Phone} label="Phone" value={visitor.phone} />
        <Row icon={Building2} label="Company" value={visitor.company} />
        <Row icon={IdCard} label="CNIC" value={visitor.cnic} />
        <Row icon={User} label="Host" value={`${visitor.host} · ${visitor.hostDepartment}`} />
        <Row icon={Ticket} label="Purpose" value={visitor.purpose} />
      </dl>

      <Separator className="my-4" />

      <div className="flex items-center justify-between text-[12px]">
        <span className="text-subtle">Entry time</span>
        <span className="tnum font-medium text-foreground">{fmtDateTime(visitor.entryTime)}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[12px]">
        <span className="text-subtle">Tariff</span>
        <span className="tnum font-medium text-foreground">
          {currency(TARIFF[visitor.vehicleClass].firstHour)} first hour, then{' '}
          {currency(TARIFF[visitor.vehicleClass].perHour)}/hr
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-warning/30 bg-warning-dim/40 px-3 py-2">
        <p className="text-[11px] text-foreground">
          Charges are calculated on exit. Present this ticket at the payment terminal before leaving.
        </p>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-subtle">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[12px] text-foreground">{value}</dd>
    </div>
  );
}
