/**
 * Admin — Service Performance (§30). Analytics that support decisions: request
 * volume over time, category and priority distribution, resolution time and
 * per-tenant activity.
 */

import { BarChart3, Clock, Wrench } from 'lucide-react';
import { Page, StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { PageHeader, StatCard } from '../../../components/common';
import { IconBox } from '../../../components/ui/primitives';
import { BarSeriesChart, DonutChart } from '../../../components/charts';
import { useLive } from '../../../data/live';
import { NOW } from '../../../data/world';
import { SERVICE_CATEGORY_LABEL } from '../../../data/catalog';
import { duration, num } from '../../../lib/utils';

export default function Performance() {
  const requests = useLive((w) => w.requests.map((r) => ({ ...r, tenantName: w.tenantById[r.tenantId]?.name ?? '—', tenantCode: w.tenantById[r.tenantId]?.code ?? '—' })));

  const isOpen = (s: string) => !['closed', 'confirmed', 'cancelled'].includes(s);
  const resolvedTimes = requests.filter((r) => r.resolvedAt).map((r) => r.resolvedAt! - r.createdAt);
  const avg = resolvedTimes.length ? resolvedTimes.reduce((s, x) => s + x, 0) / resolvedTimes.length : 0;

  // Category distribution.
  const byCategory = Object.keys(SERVICE_CATEGORY_LABEL).map((c) => ({ label: SERVICE_CATEGORY_LABEL[c], value: requests.filter((r) => r.category === c).length })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);

  // Priority distribution.
  const byPriority = (['critical', 'high', 'medium', 'low'] as const).map((p) => ({ label: p[0].toUpperCase() + p.slice(1), value: requests.filter((r) => r.priority === p).length }));

  // Volume over the last 14 days.
  const volume = Array.from({ length: 14 }).map((_, i) => {
    const day = new Date(NOW - (13 - i) * 86_400_000);
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 86_400_000;
    return { label: day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), created: requests.filter((r) => r.createdAt >= start.getTime() && r.createdAt < end).length, resolved: requests.filter((r) => r.resolvedAt && r.resolvedAt >= start.getTime() && r.resolvedAt < end).length };
  });

  // Per-tenant activity.
  const perTenant = Object.values(requests.reduce((acc, r) => { (acc[r.tenantCode] ??= { label: r.tenantCode, value: 0 }).value++; return acc; }, {} as Record<string, { label: string; value: number }>)).sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <Page>
      <PageHeader title="Service Performance" description="Volume, distribution and resolution analytics for the service center." />

      <StatGrid cols={4}>
        <StatCard label="Total Requests" value={num(requests.length)} icon={Wrench} tone="service" />
        <StatCard label="Open" value={num(requests.filter((r) => isOpen(r.status)).length)} icon={Wrench} tone="primary" />
        <StatCard label="Avg Resolution" value={avg ? duration(avg) : '—'} icon={Clock} tone="neutral" />
        <StatCard label="Resolved" value={num(requests.filter((r) => r.resolvedAt).length)} icon={Wrench} tone="success" />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Request Volume" subtitle="Created vs resolved, last 14 days" icon={<IconBox icon={BarChart3} tone="service" size="sm" />} />
          <CardBody><BarSeriesChart data={volume} series={[{ key: 'created', label: 'Created' }, { key: 'resolved', label: 'Resolved', color: 'var(--viz-3)' }]} height={240} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Priority Distribution" icon={<IconBox icon={Wrench} tone="service" size="sm" />} />
          <CardBody>
            <DonutChart height={200} centreValue={num(requests.length)} centreLabel="total" data={byPriority.map((p, i) => ({ label: p.label, value: p.value, color: ['var(--critical)', 'var(--warning)', 'var(--info)', 'var(--neutral)'][i] }))} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Category Distribution" icon={<IconBox icon={BarChart3} tone="service" size="sm" />} />
          <CardBody><BarSeriesChart data={byCategory} series={[{ key: 'value', label: 'Requests' }]} horizontal height={280} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Per-Tenant Activity" subtitle="Most requests raised" icon={<IconBox icon={BarChart3} tone="primary" size="sm" />} />
          <CardBody><BarSeriesChart data={perTenant} series={[{ key: 'value', label: 'Requests', color: 'var(--viz-6)' }]} horizontal height={280} /></CardBody>
        </Card>
      </div>
    </Page>
  );
}
