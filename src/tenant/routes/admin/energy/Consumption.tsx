/**
 * Admin — Tenant Consumption (§13). Compare consumption across tenants: a
 * ranking, a multi-tenant trend comparison, and a sortable table.
 */

import { BarChart3, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { PageHeader } from '../../../components/common';
import { IconBox } from '../../../components/ui/primitives';
import { BarSeriesChart, MultiLineChart } from '../../../components/charts';
import { DataTable, type Column } from '../../../components/ui/data';
import { AlertLevelBadge } from '../../../components/status';
import { useLive } from '../../../data/live';
import { alertLevelForTenant, tenantSummary } from '../../../data/selectors';
import { currency, num } from '../../../lib/utils';
import type { TenantSummary } from '../../../data/types';

export default function TenantConsumption() {
  const navigate = useNavigate();
  const ranking = useLive((w) => w.tenants.filter((t) => t.status === 'active').map((t) => ({ summary: tenantSummary(w, t.id), level: alertLevelForTenant(w, t.id) })).sort((a, b) => b.summary.periodKwh - a.summary.periodKwh));
  const comparison = useLive((w) => {
    const top = [...w.tenants].filter((t) => t.status === 'active').map((t) => tenantSummary(w, t.id)).sort((a, b) => b.periodKwh - a.periodKwh).slice(0, 5);
    const first = w.readings[top[0]?.tenant.id]?.daily ?? [];
    return first.map((base, i) => {
      const row: Record<string, string | number> = { label: base.label };
      for (const t of top) row[t.tenant.code] = w.readings[t.tenant.id]?.daily?.[i]?.kwh ?? 0;
      return row;
    });
  });
  const topCodes = ranking.slice(0, 5).map((r) => r.summary.tenant.code);

  const columns: Column<{ summary: TenantSummary; level: import('../../../data/types').AlertLevel }>[] = [
    { key: 'tenant', header: 'Tenant', cell: (r) => <span className="font-medium text-foreground">{r.summary.tenant.name}</span>, sortValue: (r) => r.summary.tenant.name },
    { key: 'building', header: 'Building', cell: (r) => r.summary.buildingName, hideBelow: 'md' },
    { key: 'load', header: 'Load', align: 'right', cell: (r) => <span className="tnum">{num(r.summary.currentLoadKw, 1)} kW</span>, sortValue: (r) => r.summary.currentLoadKw },
    { key: 'kwh', header: 'Period kWh', align: 'right', cell: (r) => <span className="tnum font-medium text-foreground">{num(r.summary.periodKwh)}</span>, sortValue: (r) => r.summary.periodKwh },
    { key: 'charges', header: 'Charges', align: 'right', cell: (r) => <span className="tnum">{currency(r.summary.periodCharges, { compact: true })}</span>, sortValue: (r) => r.summary.periodCharges, hideBelow: 'lg' },
    { key: 'level', header: 'Energy', cell: (r) => <AlertLevelBadge level={r.level} size="sm" /> },
  ];

  return (
    <Page>
      <PageHeader title="Tenant Consumption" description="Compare energy consumption across every active tenant." />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Ranking" subtitle="By period consumption" icon={<IconBox icon={BarChart3} tone="primary" size="sm" />} />
          <CardBody>
            <BarSeriesChart data={ranking.slice(0, 10).map((r) => ({ label: r.summary.tenant.code, kwh: r.summary.periodKwh }))} series={[{ key: 'kwh', label: 'kWh' }]} horizontal height={300} valueFormatter={(v) => `${num(v)} kWh`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Trend Comparison" subtitle="Top 5 tenants, last 30 days" icon={<IconBox icon={Zap} tone="energy" size="sm" />} />
          <CardBody>
            <MultiLineChart data={comparison} series={topCodes.map((c) => ({ key: c, label: c }))} height={300} unit="kWh" valueFormatter={(v) => `${num(v)} kWh`} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="All Tenants" subtitle={`${ranking.length} active`} icon={<IconBox icon={BarChart3} tone="primary" size="sm" />} />
        <DataTable rows={ranking} columns={columns} rowKey={(r) => r.summary.tenant.id} onRowClick={(r) => navigate(`/admin/tenants/${r.summary.tenant.id}`)} pageSize={12} />
      </Card>
    </Page>
  );
}
