/**
 * Admin — Tenant Onboarding (§7).
 *
 * A guided seven-step wizard, never a long single form. A stepper with
 * validation and free navigation, a live configuration summary that updates as
 * the admin progresses, save-as-draft, and a final review that highlights
 * missing information before activation. On activate the tenant, its offices,
 * sub-meters and primary user are committed and portal access is created.
 */

import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Building2, Check, Gauge, Plus, Save, Trash2, UserRound, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Breadcrumb, PageHeader, Stepper } from '../../components/common';
import { Button, IconBox, ProgressBar, Separator, StatusBadge, TenantMark } from '../../components/ui/primitives';
import { Field, Input, SimpleSelect, Switch } from '../../components/ui/form';
import { adminApi } from '../../data/api';
import { simulation } from '../../data/live';
import { makeReadingSeries, makeSnapshot } from '../../data/world';
import { useAsync } from '../../hooks/useAsync';
import { useSession } from '../../store/session';
import { ORG_TYPE_LABEL } from '../../data/catalog';
import { ALERT_KIND_LABEL } from '../../lib/meta';
import { area, currency, num } from '../../lib/utils';
import type {
  AlertRule, Meter, OfficeSpace, OrganizationType, Tenant, TenantUser,
} from '../../data/types';

const STEPS = ['Organization', 'Location & Spaces', 'Energy Infrastructure', 'Energy Configuration', 'Energy Alerts', 'Portal Access', 'Review'];

const ORG_TYPES: Array<{ value: OrganizationType; label: string }> = (Object.keys(ORG_TYPE_LABEL) as OrganizationType[]).map((k) => ({ value: k, label: ORG_TYPE_LABEL[k] }));

const DEFAULT_ALERTS: AlertRule[] = [
  { kind: 'high_consumption', enabled: true, threshold: 5000, unit: 'kWh/day', severity: 'warning', notify: true },
  { kind: 'high_demand', enabled: true, threshold: 60, unit: 'kW', severity: 'warning', notify: true },
  { kind: 'charge_threshold', enabled: true, threshold: 800000, unit: 'PKR', severity: 'attention', notify: true },
  { kind: 'meter_offline', enabled: true, threshold: 15, unit: 'min', severity: 'critical', notify: true },
  { kind: 'unusual_consumption', enabled: false, threshold: 40, unit: '% vs avg', severity: 'attention', notify: false },
];

interface OfficeDraft { key: string; label: string; areaSqft: number; }

interface Draft {
  name: string; legalName: string; code: string; organizationType: OrganizationType;
  registrationNo: string; ntn: string;
  contactName: string; contactDesignation: string; contactEmail: string; contactPhone: string;
  buildingId: string; floorId: string; offices: OfficeDraft[];
  meterNames: Record<string, string>;
  alerts: AlertRule[];
  portalName: string; portalEmail: string; portalPhone: string;
}

const EMPTY: Draft = {
  name: '', legalName: '', code: '', organizationType: 'private_limited', registrationNo: '', ntn: '',
  contactName: '', contactDesignation: '', contactEmail: '', contactPhone: '',
  buildingId: '', floorId: '', offices: [{ key: 'o1', label: 'Suite 1', areaSqft: 1200 }],
  meterNames: {}, alerts: DEFAULT_ALERTS.map((a) => ({ ...a })),
  portalName: '', portalEmail: '', portalPhone: '',
};

export default function TenantOnboarding() {
  const navigate = useNavigate();
  const { toast } = useSession();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const buildings = useAsync(() => adminApi.listBuildings(), {});
  const floors = useAsync(() => adminApi.getFloors(draft.buildingId || undefined), { deps: [draft.buildingId] });
  const tariffs = useAsync(() => adminApi.listTariffs(), {});
  const currentTariff = (tariffs.data ?? []).find((t) => t.effectiveTo === null) ?? (tariffs.data ?? [])[0];

  const totalArea = draft.offices.reduce((s, o) => s + (o.areaSqft || 0), 0);
  const baseKw = Math.max(6, (totalArea / 1000) * 6.5);

  const validity = useMemo(() => validate(draft), [draft]);
  const stepValid = validity[step];
  const completeness = Math.round((validity.filter(Boolean).length / 6) * 100);

  const commit = (activate: boolean) => {
    const built = build(draft, activate, baseKw);
    simulation.commitOnboarding(built);
    toast({
      title: activate ? 'Tenant activated' : 'Draft saved',
      description: activate ? `${draft.name} is live and portal access has been created.` : `${draft.name || 'Tenant'} saved for later completion.`,
      variant: 'success',
      action: { label: 'Open workspace', onClick: () => navigate(`/admin/tenants/${built.tenant.id}`) },
    });
    navigate(`/admin/tenants/${built.tenant.id}`);
  };

  return (
    <Page>
      <Breadcrumb items={[{ label: 'Tenants', to: '/admin/tenants' }, { label: 'Onboarding' }]} />
      <PageHeader title="Onboard a Tenant" description="Configure a new organization step by step. Progress is validated and can be saved as a draft at any point." />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <Stepper steps={STEPS.map((label, i) => ({ label, done: i < step && validity[i] }))} current={step} onStep={setStep} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* Step body */}
        <div className="flex flex-col gap-5">
          <Card>
            {step === 0 && <StepOrganization draft={draft} set={set} />}
            {step === 1 && <StepLocation draft={draft} set={set} buildings={buildings.data ?? []} floors={floors.data ?? []} />}
            {step === 2 && <StepEnergy draft={draft} set={set} />}
            {step === 3 && <StepRates tariff={currentTariff} baseKw={baseKw} />}
            {step === 4 && <StepAlerts draft={draft} set={set} />}
            {step === 5 && <StepPortal draft={draft} set={set} />}
            {step === 6 && <StepReview draft={draft} validity={validity} totalArea={totalArea} />}
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="md" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><ArrowLeft className="h-4 w-4" />Previous</Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" onClick={() => commit(false)}><Save className="h-4 w-4" />Save draft</Button>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" size="md" disabled={!stepValid} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next<ArrowRight className="h-4 w-4" /></Button>
              ) : (
                <Button variant="success" size="md" disabled={completeness < 100} onClick={() => commit(true)}><Check className="h-4 w-4" />Activate Tenant</Button>
              )}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <PreviewPanel draft={draft} totalArea={totalArea} baseKw={baseKw} completeness={completeness} tariffName={currentTariff?.name} />
      </div>
    </Page>
  );
}

/* --------------------------------------------------------------- steps */

function StepHead({ icon, title, subtitle }: { icon: typeof Zap; title: string; subtitle: string }) {
  return <CardHeader title={title} subtitle={subtitle} icon={<IconBox icon={icon} tone="primary" size="sm" />} />;
}

function StepOrganization({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <StepHead icon={Building2} title="Organization" subtitle="Who is the tenant?" />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Organization name" required><Input value={draft.name} onChange={(e) => set({ name: e.target.value, code: draft.code || e.target.value.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="e.g. Orbital Dynamics" /></Field>
        <Field label="Legal name" optional><Input value={draft.legalName} onChange={(e) => set({ legalName: e.target.value })} placeholder="Registered legal entity" /></Field>
        <Field label="Organization type" required><SimpleSelect value={draft.organizationType} onChange={(v) => set({ organizationType: v })} options={ORG_TYPES} /></Field>
        <Field label="Short code" required hint="Used in references and meter IDs"><Input value={draft.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="ORBIT" maxLength={8} /></Field>
        <Field label="Registration No." optional><Input value={draft.registrationNo} onChange={(e) => set({ registrationNo: e.target.value })} placeholder="SECP-123456" /></Field>
        <Field label="NTN / Tax ID" optional><Input value={draft.ntn} onChange={(e) => set({ ntn: e.target.value })} placeholder="1234567-8" /></Field>
        <div className="col-span-full"><Separator className="my-1" /><p className="mb-3 mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Primary contact</p></div>
        <Field label="Contact name" required><Input value={draft.contactName} onChange={(e) => set({ contactName: e.target.value })} placeholder="Full name" /></Field>
        <Field label="Designation" optional><Input value={draft.contactDesignation} onChange={(e) => set({ contactDesignation: e.target.value })} placeholder="Facilities Lead" /></Field>
        <Field label="Email" required><Input type="email" value={draft.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} placeholder="name@company.com.pk" /></Field>
        <Field label="Phone" optional><Input value={draft.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} placeholder="+92 3XX XXXXXXX" /></Field>
      </CardBody>
    </>
  );
}

function StepLocation({ draft, set, buildings, floors }: { draft: Draft; set: (p: Partial<Draft>) => void; buildings: import('../../data/types').Building[]; floors: import('../../data/types').Floor[] }) {
  const addOffice = () => set({ offices: [...draft.offices, { key: `o${draft.offices.length + 1}-${Date.now().toString(36)}`, label: `Suite ${draft.offices.length + 1}`, areaSqft: 1000 }] });
  const update = (key: string, patch: Partial<OfficeDraft>) => set({ offices: draft.offices.map((o) => (o.key === key ? { ...o, ...patch } : o)) });
  const remove = (key: string) => set({ offices: draft.offices.filter((o) => o.key !== key) });
  const total = draft.offices.reduce((s, o) => s + (o.areaSqft || 0), 0);

  return (
    <>
      <StepHead icon={Building2} title="Location & Spaces" subtitle="Where does the tenant sit, and how much space?" />
      <CardBody className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Building" required><SimpleSelect value={draft.buildingId} onChange={(v) => set({ buildingId: v, floorId: '' })} placeholder="Select a building" options={buildings.map((b) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="Floor" required><SimpleSelect value={draft.floorId} onChange={(v) => set({ floorId: v })} placeholder={draft.buildingId ? 'Select a floor' : 'Select a building first'} options={floors.map((f) => ({ value: f.id, label: f.name }))} /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Offices / Spaces</p>
            <Button variant="secondary" size="xs" onClick={addOffice}><Plus className="h-3.5 w-3.5" />Add office</Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {draft.offices.map((o, i) => (
              <div key={o.key} className="flex items-end gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
                <Field label={i === 0 ? 'Label' : ''} className="flex-1"><Input value={o.label} onChange={(e) => update(o.key, { label: e.target.value })} placeholder="Suite 1" /></Field>
                <Field label={i === 0 ? 'Area (ft²)' : ''} className="w-40"><Input type="number" value={o.areaSqft} onChange={(e) => update(o.key, { areaSqft: Number(e.target.value) })} /></Field>
                <Button variant="ghost" size="icon" className="mb-0.5 text-subtle hover:text-critical" disabled={draft.offices.length === 1} onClick={() => remove(o.key)} aria-label="Remove office"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary-muted/40 px-3.5 py-2.5">
            <span className="text-[12px] text-muted">{draft.offices.length} office{draft.offices.length === 1 ? '' : 's'} · Building → Floor → Offices</span>
            <span className="tnum text-[13px] font-semibold text-foreground">{area(total)} total</span>
          </div>
        </div>
      </CardBody>
    </>
  );
}

function StepEnergy({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <StepHead icon={Gauge} title="Energy Infrastructure" subtitle="Assign a sub-meter to each space" />
      <CardBody className="flex flex-col gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3.5 text-[12px] leading-relaxed text-muted">
          Every tenant is metered by <span className="font-medium text-foreground">sub-meters</span>. The floor's main meter belongs to building infrastructure and is not assigned to the tenant. Consumption and charges come from these sub-meters.
        </div>
        {draft.offices.map((o, i) => {
          const serial = `${draft.code || 'NEW'}${i + 1}`;
          return (
            <div key={o.key} className="flex items-end gap-3 rounded-xl border border-border-subtle bg-surface p-3">
              <div className="flex items-center gap-2.5">
                <IconBox icon={Gauge} tone="energy" size="sm" />
                <div>
                  <p className="text-[12.5px] font-medium text-foreground">{o.label}</p>
                  <p className="tnum text-[11px] text-subtle">Serial {serial}</p>
                </div>
              </div>
              <Field label={i === 0 ? 'Meter name' : ''} className="flex-1"><Input value={draft.meterNames[o.key] ?? `${draft.name || 'Tenant'} Sub-meter ${i + 1}`} onChange={(e) => set({ meterNames: { ...draft.meterNames, [o.key]: e.target.value } })} /></Field>
              <StatusBadge tone="online" size="sm" className="mb-2.5">Ready</StatusBadge>
            </div>
          );
        })}
      </CardBody>
    </>
  );
}

function StepRates({ tariff, baseKw }: { tariff?: import('../../data/types').Tariff; baseKw: number }) {
  const rate = (c: string) => tariff?.rates.find((r) => r.component === c)?.rate ?? 0;
  const monthlyKwh = baseKw * 12 * 26; // rough working-hours estimate
  return (
    <>
      <StepHead icon={Zap} title="Energy Configuration" subtitle="Applicable, globally-configured rates" />
      <CardBody className="flex flex-col gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3.5 text-[12px] text-muted">
          Rates are configured centrally and are not customised per tenant. This tenant will bill against <span className="font-medium text-foreground">{tariff?.name ?? 'the current schedule'}</span>.
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RateTile label="Energy" value={rate('energy')} />
          <RateTile label="Genset" value={rate('genset')} />
          <RateTile label="Peak" value={rate('peak')} />
          <RateTile label="Off-Peak" value={rate('off_peak')} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">How charges are calculated</p>
          <p className="mt-2 text-[13px] text-foreground">Consumption <span className="text-subtle">×</span> Applicable Rate <span className="text-subtle">=</span> Energy Charge</p>
          <p className="mt-2 text-[12px] text-muted">Estimated monthly usage ≈ <span className="tnum font-medium text-foreground">{num(monthlyKwh)} kWh</span>, roughly <span className="tnum font-medium text-foreground">{currency(monthlyKwh * rate('off_peak'), { compact: true })}</span> at the off-peak rate.</p>
        </div>
      </CardBody>
    </>
  );
}

function RateTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-center">
      <p className="tnum text-[18px] font-semibold text-foreground">{value.toFixed(2)}</p>
      <p className="text-[10px] text-subtle">PKR / kWh</p>
      <p className="mt-1 text-[11px] font-medium text-muted">{label}</p>
    </div>
  );
}

function StepAlerts({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const update = (i: number, patch: Partial<AlertRule>) => set({ alerts: draft.alerts.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });
  return (
    <>
      <StepHead icon={Bell} title="Energy Alerts" subtitle="Enable and tune tenant-level alerts (sensible defaults applied)" />
      <CardBody className="flex flex-col gap-2.5">
        {draft.alerts.map((a, i) => (
          <div key={a.kind} className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface p-3">
            <Switch checked={a.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">{ALERT_KIND_LABEL[a.kind]}</p>
              <p className="text-[11px] text-subtle">Severity: {a.severity}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" value={a.threshold} disabled={!a.enabled} onChange={(e) => update(i, { threshold: Number(e.target.value) })} className="h-8 w-28 text-[12px]" />
              <span className="w-16 text-[11px] text-subtle">{a.unit}</span>
            </div>
          </div>
        ))}
      </CardBody>
    </>
  );
}

function StepPortal({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <StepHead icon={UserRound} title="Portal Access" subtitle="Configure the primary tenant user" />
      <CardBody className="flex flex-col gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3.5 text-[12px] text-muted">
          One primary user is configured now. Additional users and roles can be added later without changing the tenant. On activation, an invitation is generated for this user.
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required><Input value={draft.portalName} onChange={(e) => set({ portalName: e.target.value })} placeholder={draft.contactName || 'Full name'} /></Field>
          <Field label="Email" required hint="Invitation is sent here"><Input type="email" value={draft.portalEmail} onChange={(e) => set({ portalEmail: e.target.value })} placeholder={draft.contactEmail || 'name@company.com.pk'} /></Field>
          <Field label="Phone" optional><Input value={draft.portalPhone} onChange={(e) => set({ portalPhone: e.target.value })} placeholder="+92 3XX XXXXXXX" /></Field>
          <div className="flex items-end">
            <Button variant="subtle" size="sm" onClick={() => set({ portalName: draft.contactName, portalEmail: draft.contactEmail, portalPhone: draft.contactPhone })}>Copy from primary contact</Button>
          </div>
        </div>
      </CardBody>
    </>
  );
}

function StepReview({ draft, validity, totalArea }: { draft: Draft; validity: boolean[]; totalArea: number }) {
  const warnings: string[] = [];
  if (!validity[0]) warnings.push('Organization details are incomplete.');
  if (!validity[1]) warnings.push('A building, floor and at least one office are required.');
  if (!validity[5]) warnings.push('A primary portal user (name and email) is required.');
  if (!draft.legalName) warnings.push('Legal name is empty (optional, but recommended).');

  return (
    <>
      <StepHead icon={Check} title="Review & Activate" subtitle="Confirm the configuration before activating" />
      <CardBody className="flex flex-col gap-4">
        {warnings.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-dim/40 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="text-[12px] text-muted">
              <p className="font-medium text-foreground">Before you activate</p>
              <ul className="mt-1 list-disc pl-4">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          </div>
        )}
        <ReviewBlock title="Organization" items={[['Name', draft.name || '—'], ['Legal name', draft.legalName || '—'], ['Type', ORG_TYPE_LABEL[draft.organizationType]], ['Code', draft.code || '—'], ['Contact', draft.contactName || '—'], ['Email', draft.contactEmail || '—']]} />
        <ReviewBlock title="Location & Spaces" items={[['Offices', `${draft.offices.length}`], ['Total area', area(totalArea)]]} />
        <ReviewBlock title="Energy" items={[['Sub-meters', `${draft.offices.length}`], ['Rate schedule', 'FY26 Standard'], ['Alerts enabled', `${draft.alerts.filter((a) => a.enabled).length} of ${draft.alerts.length}`]]} />
        <ReviewBlock title="Portal" items={[['Primary user', draft.portalName || '—'], ['Email', draft.portalEmail || '—']]} />
      </CardBody>
    </>
  );
}

function ReviewBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset/40 p-3.5">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{title}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k}><dt className="text-[10.5px] text-subtle">{k}</dt><dd className="truncate text-[12.5px] text-foreground">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------- preview panel */

function PreviewPanel({ draft, totalArea, baseKw, completeness, tariffName }: { draft: Draft; totalArea: number; baseKw: number; completeness: number; tariffName?: string }) {
  return (
    <div className="lg:sticky lg:top-4 lg:self-start">
      <Card>
        <CardHeader title="Live Preview" subtitle="Updates as you configure" />
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <TenantMark name={draft.name || 'New Tenant'} hue={210} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-foreground">{draft.name || 'New Tenant'}</p>
              <p className="truncate text-[11.5px] text-subtle">{draft.code || '—'} · {ORG_TYPE_LABEL[draft.organizationType]}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11.5px]"><span className="text-subtle">Configuration</span><span className="tnum font-medium text-foreground">{completeness}%</span></div>
            <ProgressBar value={completeness} tone={completeness === 100 ? 'success' : 'primary'} className="mt-1.5" />
          </div>

          <Separator />
          <dl className="flex flex-col gap-2.5 text-[12px]">
            <Row label="Contact" value={draft.contactName || '—'} />
            <Row label="Offices" value={`${draft.offices.length}`} />
            <Row label="Total area" value={area(totalArea)} />
            <Row label="Sub-meters" value={`${draft.offices.length}`} />
            <Row label="Est. base load" value={`${num(baseKw, 1)} kW`} />
            <Row label="Rate schedule" value={tariffName ?? 'FY26 Standard'} />
            <Row label="Alerts" value={`${draft.alerts.filter((a) => a.enabled).length} enabled`} />
            <Row label="Portal user" value={draft.portalName || '—'} />
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-baseline justify-between gap-3"><span className="text-subtle">{label}</span><span className="truncate text-right font-medium text-foreground">{value}</span></div>;
}

/* ---------------------------------------------------------- validation */

function validate(d: Draft): boolean[] {
  return [
    Boolean(d.name && d.code && d.contactName && /.+@.+/.test(d.contactEmail)),
    Boolean(d.buildingId && d.floorId && d.offices.length > 0 && d.offices.every((o) => o.areaSqft > 0)),
    d.offices.length > 0,
    true,
    true,
    Boolean(d.portalName && /.+@.+/.test(d.portalEmail)),
    true,
  ];
}

/* ------------------------------------------------------- build payload */

function build(d: Draft, activate: boolean, baseKw: number): Parameters<typeof simulation.commitOnboarding>[0] {
  const now = Date.now();
  const id = `t-${(d.code || 'new').toLowerCase()}-${now.toString(36).slice(-4)}`;
  const status = activate ? 'active' : validate(d)[0] && validate(d)[1] ? 'pending_activation' : 'pending_configuration';
  const w = simulation.getState();
  const building = w.buildingById[d.buildingId];
  const floor = w.floorById[d.floorId];
  const level = floor?.level ?? 0;
  const bcode = building?.code ?? 'NEW';

  const offices: OfficeSpace[] = [];
  const meters: Meter[] = [];
  d.offices.forEach((o, i) => {
    const officeId = `${bcode}-${level}-N${i + 1}-${now.toString(36).slice(-3)}`;
    const meterId = `MTR-${d.code}-${i + 1}`;
    offices.push({
      id: officeId, code: officeId, label: o.label, buildingId: d.buildingId, floorId: d.floorId,
      tenantId: id, areaSqft: o.areaSqft, status: activate ? 'occupied' : 'vacant', meterId,
    });
    meters.push({
      id: meterId, serial: `${d.code}${i + 1}`, name: d.meterNames[o.key] ?? `${d.name} Sub-meter ${i + 1}`,
      kind: 'sub', buildingId: d.buildingId, floorId: d.floorId, tenantId: id, officeId,
      status: 'online', model: 'Schneider PM5560', ctRatio: '400/5A', installedAt: now, lastReadingAt: now,
      live: makeSnapshot(baseKw / Math.max(1, d.offices.length)), totalKwh: 0,
    });
  });

  const tenant: Tenant = {
    id, name: d.name, legalName: d.legalName || d.name, code: d.code, organizationType: d.organizationType,
    registrationNo: d.registrationNo || undefined, ntn: d.ntn || undefined, status,
    primaryContact: { name: d.contactName, designation: d.contactDesignation, email: d.contactEmail, phone: d.contactPhone },
    buildingId: d.buildingId, floorIds: d.floorId ? [d.floorId] : [], officeIds: offices.map((o) => o.id), meterIds: meters.map((m) => m.id),
    logoSeed: Math.floor(Math.random() * 1000), brandHue: Math.floor(Math.random() * 360),
    createdAt: now, activatedAt: activate ? now : undefined,
    contractStart: activate ? now : undefined, contractEnd: activate ? now + 365 * 86_400_000 : undefined,
    configScore: activate ? 1 : status === 'pending_activation' ? 0.9 : 0.5,
  };

  const user: TenantUser | undefined = d.portalName
    ? { id: `u-${id}-1`, tenantId: id, name: d.portalName, email: d.portalEmail, phone: d.portalPhone, role: 'primary', status: activate ? 'invited' : 'invited', invitedAt: now, avatarSeed: Math.floor(Math.random() * 1000) }
    : undefined;

  return { tenant, offices, meters, user, alertRules: d.alerts, readings: makeReadingSeries(baseKw) };
}
