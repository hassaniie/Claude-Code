/**
 * Tenant Portal — Energy Alerts (§18). The tenant's own alerts, scoped strictly
 * to their meters, with acknowledge.
 */

import { Bell, Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { StatGrid } from '../../../components/ui/page';
import { StatCard } from '../../../components/common';
import { Button, IconBox } from '../../../components/ui/primitives';
import { EmptyState } from '../../../components/ui/data';
import { AlertSeverityBadge } from '../../../components/status';
import { ALERT_KIND_LABEL } from '../../../lib/meta';
import { useSession } from '../../../store/session';
import { simulation, useLive } from '../../../data/live';
import { ago, num } from '../../../lib/utils';

export default function PortalEnergyAlerts() {
  const { tenantId } = useSession();
  const alerts = useLive((w) => w.alerts.filter((a) => a.tenantId === tenantId));
  const active = alerts.filter((a) => a.status === 'active');

  return (
    <>
      <StatGrid cols={3}>
        <StatCard label="Active" value={num(active.length)} icon={Bell} tone={active.length ? 'warning' : 'success'} />
        <StatCard label="Acknowledged" value={num(alerts.filter((a) => a.status === 'acknowledged').length)} icon={Bell} tone="neutral" />
        <StatCard label="Critical" value={num(active.filter((a) => a.severity === 'critical').length)} icon={Bell} tone={active.some((a) => a.severity === 'critical') ? 'critical' : 'success'} />
      </StatGrid>

      <Card>
        <CardHeader title="Your Alerts" subtitle={`${alerts.length} total`} icon={<IconBox icon={Bell} tone="warning" size="sm" />} />
        <CardBody className="flex flex-col gap-2">
          {alerts.length === 0 ? (
            <EmptyState title="No alerts" description="Your energy usage is within all configured thresholds." icon={<Bell className="h-5 w-5" />} />
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-inset/40 p-3.5">
                <IconBox icon={Bell} tone={a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'energy'} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground">{a.title}</p>
                    <AlertSeverityBadge severity={a.severity} size="sm" />
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[10.5px] text-subtle">{ALERT_KIND_LABEL[a.kind]}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">{a.description}</p>
                  <p className="mt-1 text-[11px] text-subtle">{a.source} · {ago(a.ts)}</p>
                </div>
                {a.status === 'active' && <Button variant="ghost" size="xs" onClick={() => simulation.acknowledgeAlert(a.id)}><Check className="h-3.5 w-3.5" />Acknowledge</Button>}
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </>
  );
}
