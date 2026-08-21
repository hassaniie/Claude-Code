/**
 * Tenant Portal — Schedule Visitor (§21). Individual visitors only. Required
 * vs optional is made obvious. The visitor receives no digital pass — they
 * arrive at reception, where their details are verified.
 */

import { CalendarPlus, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { IconBox } from '../../../components/ui/primitives';
import { Button } from '../../../components/ui/primitives';
import { Field, Input, Textarea, SimpleSelect } from '../../../components/ui/form';
import { useSession } from '../../../store/session';
import { simulation, useLive } from '../../../data/live';

export default function ScheduleVisitor() {
  const { tenantId, toast } = useSession();
  const navigate = useNavigate();
  const tenant = useLive((w) => w.tenantById[tenantId]);
  const users = useLive((w) => w.users.filter((u) => u.tenantId === tenantId));

  const todayStr = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    fullName: '', phone: '', email: '', cnic: '', passport: '', company: '', vehicleNo: '',
    purpose: '', host: tenant?.primaryContact.name ?? '', date: todayStr, arrival: '10:00', departure: '11:00', notes: '',
  });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const valid = f.fullName.trim() && f.phone.trim() && f.purpose.trim() && f.host.trim() && f.date && f.arrival && f.departure;

  const submit = () => {
    if (!valid || !tenant) return;
    const base = new Date(`${f.date}T00:00:00`).getTime();
    const toMs = (t: string) => base + Number(t.slice(0, 2)) * 3_600_000 + Number(t.slice(3, 5)) * 60_000;
    simulation.scheduleVisitor({
      tenantId,
      fullName: f.fullName.trim(), phone: f.phone.trim(), email: f.email || undefined, cnic: f.cnic || undefined,
      passport: f.passport || undefined, company: f.company || undefined, vehicleNo: f.vehicleNo || undefined,
      purpose: f.purpose.trim(), host: f.host.trim(), buildingId: tenant.buildingId,
      visitDate: base, expectedArrival: toMs(f.arrival), expectedDeparture: toMs(f.departure), notes: f.notes || undefined,
    });
    toast({ title: 'Visitor scheduled', description: `${f.fullName} is expected on ${new Date(base).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}.`, variant: 'success' });
    navigate('/portal/visitors');
  };

  return (
    <Card>
      <CardHeader title="Schedule a Visitor" subtitle="Register an individual visitor for reception" icon={<IconBox icon={CalendarPlus} tone="visitor" size="sm" />} />
      <CardBody className="flex flex-col gap-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-[12px] text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
          <span>The visitor arrives at reception and presents ID — no QR code or digital pass is issued. Fields marked <span className="text-critical">*</span> are required.</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required><Input value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="Visitor's full name" /></Field>
          <Field label="Phone" required><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+92 3XX XXXXXXX" /></Field>
          <Field label="Email" optional><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="visitor@email.com" /></Field>
          <Field label="Company" optional><Input value={f.company} onChange={(e) => set({ company: e.target.value })} placeholder="Visiting from" /></Field>
          <Field label="CNIC / ID" optional><Input value={f.cnic} onChange={(e) => set({ cnic: e.target.value })} placeholder="XXXXX-XXXXXXX-X" /></Field>
          <Field label="Passport (if applicable)" optional><Input value={f.passport} onChange={(e) => set({ passport: e.target.value })} placeholder="For international visitors" /></Field>
          <Field label="Vehicle number" optional><Input value={f.vehicleNo} onChange={(e) => set({ vehicleNo: e.target.value })} placeholder="ICT-123" /></Field>
          <Field label="Host" required>
            {users.length > 0 ? (
              <SimpleSelect value={f.host} onChange={(v) => set({ host: v })} options={users.map((u) => ({ value: u.name, label: u.name }))} />
            ) : (
              <Input value={f.host} onChange={(e) => set({ host: e.target.value })} placeholder="Who they are visiting" />
            )}
          </Field>
          <Field label="Purpose of visit" required className="sm:col-span-2"><Input value={f.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="e.g. Business meeting, equipment maintenance" /></Field>
          <Field label="Visit date" required><Input type="date" value={f.date} min={todayStr} onChange={(e) => set({ date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected arrival" required><Input type="time" value={f.arrival} onChange={(e) => set({ arrival: e.target.value })} /></Field>
            <Field label="Expected departure" required><Input type="time" value={f.departure} onChange={(e) => set({ departure: e.target.value })} /></Field>
          </div>
          <Field label="Additional notes" optional className="sm:col-span-2"><Textarea rows={3} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything reception should know" /></Field>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={() => navigate('/portal/visitors')}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={submit}><CalendarPlus className="h-4 w-4" />Schedule Visitor</Button>
        </div>
      </CardBody>
    </Card>
  );
}
