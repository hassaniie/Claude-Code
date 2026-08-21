/**
 * Admin — Energy Alerts (§18). Active and historical alerts with severity,
 * source, tenant and meter, and acknowledge / resolve actions.
 */

import { Bell, Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Page, StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { PageHeader, StatCard } from '../../../components/common';
import { Button, IconBox } from '../../../components/ui/primitives';
import { Segmented } from '../../../components/ui/tabs';
import { EmptyState } from '../../../components/ui/data';
import { AlertSeverityBadge } from '../../../components/status';
import { ALERT_KIND_LABEL } from '../../../lib/meta';
import { simulation, useLive } from '../../../data/live';
import { ago, num } from '../../../lib/utils';
import type { EnergyAlert } from '../../../data/types';

export default function EnergyAlerts() {
  const [filter, setFilter] = useState<'active' | 'acknowledged' | 'all'>('active');
  const alerts = useLive((w) => w.alerts.map((a) => ({ ...a, tenantName: w.tenantById[a.tenantId]?.name ?? '—' })));

  const shown = alerts.filter((a) => (filter === 'all' ? true : a.status === filter));
  const active = alerts.filter((a) => a.status === 'active').length;
  const critical = alerts.filter((a) => a.status === 'active' && a.severity === 'critical').length;
  const warning = alerts.filter((a) => a.status === 'active' && a.severity === 'warning').length;

  return (
    <Page>
      <PageHeader title="Energy Alerts" description="Threshold, demand, offline and unusual-consumption alerts across tenants." />

      <StatGrid cols={3}>
        <StatCard label="Active" value={num(active)} icon={Bell} tone={active ? 'warning' : 'success'} />
        <StatCard label="Critical" value={num(critical)} icon={Bell} tone={critical ? 'critical' : 'success'} />
        <StatCard label="Warning" value={num(warning)} icon={Bell} tone={warning ? 'warning' : 'success'} />
      </StatGrid>

      <Card>
        <CardHeader
          title="Alerts"
          subtitle={`${shown.length} shown`}
          icon={<IconBox icon={Bell} tone="warning" size="sm" />}
          actions={<Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Active' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'all', label: 'All' }]} size="sm" />}
        />
        <CardBody className="flex flex-col gap-2">
          {shown.length === 0 ? (
            <EmptyState title="No alerts here" description={filter === 'active' ? 'Every tenant is within thresholds.' : 'Nothing to show for this filter.'} icon={<Bell className="h-5 w-5" />} />
          ) : (
            shown.map((a) => <AlertRow key={a.id} alert={a} tenantName={a.tenantName} />)
          )}
        </CardBody>
      </Card>
    </Page>
  );
}

function AlertRow({ alert: a, tenantName }: { alert: EnergyAlert; tenantName: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-inset/40 p-3.5">
      <IconBox icon={Bell} tone={a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'energy'} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-foreground">{a.title}</p>
          <AlertSeverityBadge severity={a.severity} size="sm" />
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10.5px] text-subtle">{ALERT_KIND_LABEL[a.kind]}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">{a.description}</p>
        <p className="mt-1 text-[11px] text-subtle">{tenantName} · {a.source}{a.value !== undefined ? ` · value ${num(a.value)} vs threshold ${num(a.threshold ?? 0)}` : ''} · {ago(a.ts)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {a.status === 'active' && (
          <Button variant="ghost" size="xs" onClick={() => simulation.acknowledgeAlert(a.id)}><Check className="h-3.5 w-3.5" />Ack</Button>
        )}
        {a.status !== 'resolved' && (
          <Button variant="secondary" size="xs" onClick={() => simulation.resolveAlert(a.id)}><CheckCheck className="h-3.5 w-3.5" />Resolve</Button>
        )}
      </div>
    </div>
  );
}
