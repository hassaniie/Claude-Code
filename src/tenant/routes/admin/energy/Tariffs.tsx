/**
 * Admin — Tariffs & Rates (§14, §15). Rates are globally configured, never
 * per-tenant. Effective periods keep historical bills bound to the rate that
 * applied when they were metered, and an impact preview shows the park-wide
 * effect of a change before it is applied. Peak windows are data-driven.
 */

import { BadgePercent, Clock, Info, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Page } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { PageHeader } from '../../../components/common';
import { Button, IconBox, StatusBadge } from '../../../components/ui/primitives';
import { Field, Input } from '../../../components/ui/form';
import { DataTable, type Column } from '../../../components/ui/data';
import { useLive } from '../../../data/live';
import { computeAdminKpis } from '../../../data/selectors';
import { currency, fmtDateFull, num } from '../../../lib/utils';
import type { ChargeComponent, Tariff } from '../../../data/types';

const COMPONENT_LABEL: Record<ChargeComponent, string> = { energy: 'Energy', genset: 'Genset', peak: 'Peak', off_peak: 'Off-Peak' };

export default function Tariffs() {
  const tariffs = useLive((w) => [...w.tariffs].sort((a, b) => b.effectiveFrom - a.effectiveFrom));
  const peakWindows = useLive((w) => w.peakWindows);
  const kpis = useLive(computeAdminKpis);
  const current = tariffs.find((t) => t.effectiveTo === null) ?? tariffs[0];

  const rateOf = (t: Tariff, c: ChargeComponent) => t.rates.find((r) => r.component === c)?.rate ?? 0;
  const [draft, setDraft] = useState<Record<ChargeComponent, number>>({
    energy: rateOf(current, 'energy'), genset: rateOf(current, 'genset'), peak: rateOf(current, 'peak'), off_peak: rateOf(current, 'off_peak'),
  });

  // Approximate blended current bill vs proposed, from month-to-date consumption.
  const impact = useMemo(() => {
    const kwh = kpis.totalConsumptionKwh;
    const blended = (r: Record<ChargeComponent, number>) => r.peak * 0.3 + r.off_peak * 0.7;
    const currentBill = kwh * blended({ energy: rateOf(current, 'energy'), genset: rateOf(current, 'genset'), peak: rateOf(current, 'peak'), off_peak: rateOf(current, 'off_peak') });
    const proposedBill = kwh * blended(draft);
    return { currentBill, proposedBill, delta: proposedBill - currentBill };
  }, [draft, kpis.totalConsumptionKwh, current]);

  const columns: Column<Tariff>[] = [
    { key: 'name', header: 'Schedule', cell: (t) => <span className="font-medium text-foreground">{t.name}</span> },
    { key: 'period', header: 'Effective period', cell: (t) => <span className="tnum text-muted">{fmtDateFull(t.effectiveFrom)} → {t.effectiveTo ? fmtDateFull(t.effectiveTo) : 'current'}</span> },
    { key: 'energy', header: 'Energy', align: 'right', cell: (t) => <span className="tnum">{rateOf(t, 'energy').toFixed(2)}</span> },
    { key: 'genset', header: 'Genset', align: 'right', cell: (t) => <span className="tnum">{rateOf(t, 'genset').toFixed(2)}</span> },
    { key: 'peak', header: 'Peak', align: 'right', cell: (t) => <span className="tnum">{rateOf(t, 'peak').toFixed(2)}</span> },
    { key: 'offpeak', header: 'Off-Peak', align: 'right', cell: (t) => <span className="tnum">{rateOf(t, 'off_peak').toFixed(2)}</span> },
    { key: 'status', header: '', cell: (t) => t.effectiveTo === null ? <StatusBadge tone="success" size="sm">Current</StatusBadge> : <StatusBadge tone="neutral" size="sm" dot={false}>Superseded</StatusBadge> },
  ];

  return (
    <Page>
      <PageHeader title="Tariffs & Rates" description="Globally configured energy rates with effective periods." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Current Schedule" subtitle={current.name} icon={<IconBox icon={BadgePercent} tone="energy" size="sm" />} actions={<StatusBadge tone="success" size="sm">Active</StatusBadge>} />
          <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['energy', 'genset', 'peak', 'off_peak'] as ChargeComponent[]).map((c) => (
              <div key={c} className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-center">
                <p className="tnum text-[20px] font-semibold text-foreground">{rateOf(current, c).toFixed(2)}</p>
                <p className="text-[10px] text-subtle">PKR / kWh</p>
                <p className="mt-1 text-[11px] font-medium text-muted">{COMPONENT_LABEL[c]}</p>
              </div>
            ))}
            <div className="col-span-full flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-inset/40 p-3 text-[11.5px] text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <span>Charge = Consumption × Applicable Rate. Historical consumption stays bound to the rate that applied during its period — a rate change never recomputes a past bill.</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Adjust & Preview Impact" subtitle="Model a rate change before applying" icon={<IconBox icon={TriangleAlert} tone="warning" size="sm" />} />
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {(['energy', 'genset', 'peak', 'off_peak'] as ChargeComponent[]).map((c) => (
                <Field key={c} label={`${COMPONENT_LABEL[c]} (PKR/kWh)`}>
                  <Input type="number" step="0.25" value={draft[c]} onChange={(e) => setDraft((d) => ({ ...d, [c]: Number(e.target.value) }))} />
                </Field>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-subtle">Current monthly (blended)</span>
                <span className="tnum font-medium text-foreground">{currency(impact.currentBill, { compact: true })}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px]">
                <span className="text-subtle">Proposed monthly</span>
                <span className="tnum font-medium text-foreground">{currency(impact.proposedBill, { compact: true })}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2 text-[12.5px]">
                <span className="font-medium text-foreground">Park-wide impact</span>
                <span className={`tnum font-semibold ${impact.delta >= 0 ? 'text-critical' : 'text-success'}`}>{impact.delta >= 0 ? '+' : ''}{currency(impact.delta, { compact: true })}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft({ energy: rateOf(current, 'energy'), genset: rateOf(current, 'genset'), peak: rateOf(current, 'peak'), off_peak: rateOf(current, 'off_peak') })}>Reset</Button>
              <Button variant="primary" size="sm" disabled>Schedule new period</Button>
            </div>
            <p className="text-[11px] text-subtle">Applying opens a new effective period from the chosen date; existing bills are untouched.</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Rate History" subtitle="Every schedule and its effective window" icon={<IconBox icon={Clock} tone="primary" size="sm" />} />
        <DataTable rows={tariffs} columns={columns} rowKey={(t) => t.id} />
      </Card>

      <Card>
        <CardHeader title="Peak / Off-Peak Windows" subtitle="Data-driven, never hardcoded" icon={<IconBox icon={Clock} tone="energy" size="sm" />} />
        <CardBody className="flex flex-col gap-2">
          {peakWindows.map((pw) => (
            <div key={pw.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
              <div>
                <p className="text-[12.5px] font-medium text-foreground">{pw.label}</p>
                <p className="text-[11.5px] text-subtle">Mon–Fri</p>
              </div>
              <span className="tnum rounded-lg bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground">{String(pw.startHour).padStart(2, '0')}:00 – {String(pw.endHour).padStart(2, '0')}:00</span>
            </div>
          ))}
          <p className="mt-1 text-[11.5px] text-subtle">All hours outside these windows are billed at the off-peak rate. <span className="tnum">{num(kpis.metersTotal)}</span> meters are evaluated against these windows.</p>
        </CardBody>
      </Card>
    </Page>
  );
}
