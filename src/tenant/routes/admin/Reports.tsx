/**
 * Admin — Reports (§34). A catalogue of tenant, energy, visitor and service
 * reports, each generating a live preview from the ecosystem with CSV and
 * print/PDF export. Export-ready structures; the preview is exactly what ships.
 */

import { Download, FileBarChart, Printer, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { PageHeader } from '../../components/common';
import { Button, IconBox, StatusBadge } from '../../components/ui/primitives';
import { EmptyState } from '../../components/ui/data';
import { useLive } from '../../data/live';
import type { World } from '../../data/world';
import { tenantSummary } from '../../data/selectors';
import { SERVICE_CATEGORY_LABEL } from '../../data/catalog';
import { area, cn, currency, downloadBlob, fmtDateFull, num, toCsv } from '../../lib/utils';

type Row = Record<string, string | number>;
interface ReportDef { id: string; category: 'Tenant' | 'Energy' | 'Visitor' | 'Service'; title: string; description: string; build: (w: World) => Row[]; }

const REPORTS: ReportDef[] = [
  { id: 'tenant-directory', category: 'Tenant', title: 'Tenant Directory', description: 'Every tenant with location, spaces and status.', build: (w) => w.tenants.map((t) => { const s = tenantSummary(w, t.id); return { Tenant: t.name, Code: t.code, Building: s.buildingName, Floors: s.floorNames.join('; '), Offices: s.officeCount, Area: area(s.totalAreaSqft), 'Sub-meters': s.meterCount, Status: t.status }; }) },
  { id: 'tenant-status', category: 'Tenant', title: 'Tenant Status', description: 'Lifecycle state and contract dates.', build: (w) => w.tenants.map((t) => ({ Tenant: t.name, Status: t.status, Activated: t.activatedAt ? fmtDateFull(t.activatedAt) : '—', 'Contract end': t.contractEnd ? fmtDateFull(t.contractEnd) : '—', 'Config %': Math.round(t.configScore * 100) })) },
  { id: 'space-utilisation', category: 'Tenant', title: 'Space Utilisation', description: 'Offices and area by tenant.', build: (w) => w.offices.filter((o) => o.tenantId).map((o) => ({ Office: o.code, Label: o.label, Tenant: w.tenantById[o.tenantId!]?.name ?? '—', Area: area(o.areaSqft), Status: o.status, Metered: o.meterId ? 'Yes' : 'No' })) },
  { id: 'energy-consumption', category: 'Energy', title: 'Energy Consumption', description: 'Period consumption and charges by tenant.', build: (w) => w.tenants.filter((t) => t.status === 'active').map((t) => { const s = tenantSummary(w, t.id); return { Tenant: t.name, 'Load (kW)': num(s.currentLoadKw, 1), 'Period kWh': s.periodKwh, Charges: currency(s.periodCharges), Meters: s.meterCount, Offline: s.offlineMeters }; }) },
  { id: 'meter-data', category: 'Energy', title: 'Meter Data', description: 'Every meter with live load and status.', build: (w) => w.meters.map((m) => ({ Serial: m.serial, Name: m.name, Type: m.kind === 'main' ? 'Main' : 'Sub-meter', 'Assigned to': m.tenantId ? (w.tenantById[m.tenantId]?.name ?? '—') : 'Infrastructure', 'Load (kW)': num(m.live.powerKw, 1), PF: m.live.powerFactor.toFixed(2), Status: m.status })) },
  { id: 'charges', category: 'Energy', title: 'Charges & Invoices', description: 'Issued invoices and payment status.', build: (w) => w.invoices.map((i) => ({ Invoice: i.number, Tenant: w.tenantById[i.tenantId]?.name ?? '—', Period: i.periodLabel, kWh: i.totalKwh, Amount: currency(i.total), Due: fmtDateFull(i.dueDate), Status: i.paymentStatus })) },
  { id: 'visitor-history', category: 'Visitor', title: 'Visitor History', description: 'All visits with status and timing.', build: (w) => w.visitors.map((v) => ({ Reference: v.reference, Visitor: v.fullName, Company: v.company ?? '—', Tenant: w.tenantById[v.tenantId]?.name ?? '—', Date: fmtDateFull(v.visitDate), Status: v.status })) },
  { id: 'visitor-tenant', category: 'Visitor', title: 'Tenant Visitor Activity', description: 'Visitor counts per tenant.', build: (w) => w.tenants.filter((t) => t.status === 'active').map((t) => { const vs = w.visitors.filter((v) => v.tenantId === t.id); return { Tenant: t.name, Total: vs.length, Inside: vs.filter((v) => v.status === 'in_building' || v.status === 'overstaying').length, 'No-shows': vs.filter((v) => v.status === 'no_show').length }; }) },
  { id: 'service-volume', category: 'Service', title: 'Service Request Volume', description: 'All requests with category and priority.', build: (w) => w.requests.map((r) => ({ Reference: r.reference, Tenant: w.tenantById[r.tenantId]?.name ?? '—', Category: SERVICE_CATEGORY_LABEL[r.category], Priority: r.priority, Status: r.status, Created: fmtDateFull(r.createdAt) })) },
  { id: 'service-category', category: 'Service', title: 'Category Distribution', description: 'Request counts per category.', build: (w) => Object.entries(SERVICE_CATEGORY_LABEL).map(([c, label]) => ({ Category: label, Requests: w.requests.filter((r) => r.category === c).length, Open: w.requests.filter((r) => r.category === c && !['closed', 'confirmed', 'cancelled'].includes(r.status)).length })).filter((x) => x.Requests > 0) },
];

const CATEGORIES = ['Tenant', 'Energy', 'Visitor', 'Service'] as const;
const CAT_TONE = { Tenant: 'primary', Energy: 'energy', Visitor: 'visitor', Service: 'service' } as const;

export default function Reports() {
  const world = useLive((w) => w);
  const [selected, setSelected] = useState<string | null>('tenant-directory');
  const report = REPORTS.find((r) => r.id === selected) ?? null;
  const rows = useMemo(() => (report ? report.build(world) : []), [report, world]);

  const exportCsv = () => report && downloadBlob(toCsv(rows), `${report.id}.csv`);

  return (
    <Page>
      <PageHeader title="Reports" description="Generate and export operational reports across the ecosystem." />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Report Catalogue" icon={<IconBox icon={FileBarChart} tone="primary" size="sm" />} />
          <CardBody className="flex flex-col gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">{cat}</p>
                <div className="flex flex-col gap-1">
                  {REPORTS.filter((r) => r.category === cat).map((r) => (
                    <button key={r.id} onClick={() => setSelected(r.id)} className={cn('rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors', selected === r.id ? 'bg-primary-muted text-foreground' : 'text-muted hover:bg-surface-raised hover:text-foreground')}>
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          {report ? (
            <>
              <CardHeader
                title={report.title}
                subtitle={report.description}
                icon={<IconBox icon={Table2} tone={CAT_TONE[report.category]} size="sm" />}
                actions={
                  <div className="flex items-center gap-2">
                    <StatusBadge tone="neutral" size="sm" dot={false}>{rows.length} rows</StatusBadge>
                    <Button variant="secondary" size="sm" onClick={exportCsv}><Download className="h-4 w-4" />CSV</Button>
                    <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</Button>
                  </div>
                }
              />
              <div className="max-h-[600px] overflow-auto">
                {rows.length === 0 ? (
                  <EmptyState title="No data" description="This report has no rows for the current ecosystem." />
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-surface-inset">
                      <tr>
                        {Object.keys(rows[0]).map((k) => (
                          <th key={k} className="whitespace-nowrap border-b border-border px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-subtle">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b border-border-subtle">
                          {Object.keys(rows[0]).map((k) => (
                            <td key={k} className="whitespace-nowrap px-3.5 py-2.5 text-[12.5px] text-muted">{String(row[k])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <EmptyState title="Select a report" description="Choose a report from the catalogue to generate a preview." />
          )}
        </Card>
      </div>
    </Page>
  );
}
