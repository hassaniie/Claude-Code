/**
 * Alerts.
 *
 * The full alert register with the triage actions inline. Grouped by severity
 * so the critical column is never buried, with a rules panel that documents
 * exactly what raises and clears each alert — operators trust an alert system
 * far more when its thresholds are visible.
 */

import {
  Ban, BellOff, CheckCheck, CircleAlert, Radio, ShieldAlert, ShieldCheck,
  Siren, TriangleAlert, VideoOff, WifiOff,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, num } from '../lib/utils';
import { Page, Toolbar } from '../components/ui/page';
import { Card, CardHeader } from '../components/ui/card';
import { Badge, Button, StatusPill } from '../components/ui/primitives';
import { Segmented } from '../components/ui/tabs';
import { SearchInput } from '../components/ui/form';
import { EmptyState } from '../components/ui/data';
import { StatTile } from '../components/pms/atoms';
import { AlertCard } from '../components/pms/cards';
import { simulation, useAlerts } from '../store/live';
import { useSession } from '../store/session';
import type { Alert, AlertType } from '../data/types';

type Scope = 'active' | 'acknowledged' | 'resolved' | 'all';

const RULES: Array<{ type: AlertType; icon: typeof TriangleAlert; rule: string; clears: string }> = [
  { type: 'occupancy_80', icon: TriangleAlert, rule: 'Plaza occupancy reaches 80%', clears: 'Occupancy falls below 76% (hysteresis)' },
  { type: 'parking_full', icon: Ban, rule: 'Plaza occupancy reaches 99.5%', clears: 'Any bay becomes vacant' },
  { type: 'floor_full', icon: Ban, rule: 'A level reaches 99% occupancy', clears: 'Level falls below 96%' },
  { type: 'camera_offline', icon: VideoOff, rule: 'No camera heartbeat for 30 s', clears: 'Heartbeat resumes or operator restores' },
  { type: 'recognition_failed', icon: CircleAlert, rule: 'Every 5th failed ANPR read in a day', clears: 'Manually resolved after calibration' },
  { type: 'barrier_offline', icon: ShieldAlert, rule: 'Barrier controller misses 3 polls', clears: 'Controller link re-established' },
  { type: 'api_failure', icon: WifiOff, rule: 'Parking API returns 5xx or times out', clears: 'Two consecutive healthy responses' },
  { type: 'communication_failure', icon: Radio, rule: 'Device drops 2 heartbeats in 5 min', clears: 'Device reports in again' },
  { type: 'emergency_mode', icon: Siren, rule: 'Any barrier placed in emergency release', clears: 'Lane returned to automatic mode' },
];

export default function Alerts() {
  const alerts = useAlerts();
  const { operator, toast } = useSession();
  const [scope, setScope] = useState<Scope>('active');
  const [severity, setSeverity] = useState<'all' | Alert['severity']>('all');
  const [query, setQuery] = useState('');

  const operatorLabel = `${operator.name} (${operator.id})`;

  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.resolved);
    return {
      active: active.length,
      critical: active.filter((a) => a.severity === 'critical').length,
      warning: active.filter((a) => a.severity === 'warning').length,
      unacked: active.filter((a) => !a.acknowledged).length,
      resolved: alerts.filter((a) => a.resolved).length,
    };
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (scope === 'active' && (a.resolved || a.acknowledged)) return false;
      if (scope === 'acknowledged' && (!a.acknowledged || a.resolved)) return false;
      if (scope === 'resolved' && !a.resolved) return false;
      if (severity !== 'all' && a.severity !== severity) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q) && !a.source.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [alerts, scope, severity, query]);

  const grouped = useMemo(
    () => ({
      critical: filtered.filter((a) => a.severity === 'critical'),
      warning: filtered.filter((a) => a.severity === 'warning'),
      info: filtered.filter((a) => a.severity === 'info'),
    }),
    [filtered],
  );

  return (
    <Page>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <StatTile
          label="Active Alerts"
          value={num(counts.active)}
          icon={TriangleAlert}
          tone={counts.active ? 'warning' : 'success'}
        />
        <StatTile label="Critical" value={num(counts.critical)} icon={Siren} tone={counts.critical ? 'danger' : 'success'} />
        <StatTile label="Warnings" value={num(counts.warning)} icon={CircleAlert} tone={counts.warning ? 'warning' : 'neutral'} />
        <StatTile
          label="Unacknowledged"
          value={num(counts.unacked)}
          icon={BellOff}
          tone={counts.unacked ? 'danger' : 'success'}
        />
        <StatTile label="Resolved" value={num(counts.resolved)} icon={ShieldCheck} tone="success" caption="in this window" />
      </div>

      <Toolbar className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: 'active', label: 'Needs action' },
            { value: 'acknowledged', label: 'Acknowledged' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Segmented
          size="sm"
          value={severity}
          onChange={setSeverity}
          options={[
            { value: 'all', label: 'Any severity' },
            { value: 'critical', label: 'Critical' },
            { value: 'warning', label: 'Warning' },
            { value: 'info', label: 'Info' },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search alerts…" size="sm" className="w-[220px]" />

        <StatusPill tone={filtered.length ? 'warning' : 'success'}>{num(filtered.length)} shown</StatusPill>

        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            disabled={!counts.unacked}
            onClick={() => {
              simulation.acknowledgeAll(operatorLabel);
              toast({ title: `${counts.unacked} alerts acknowledged`, variant: 'success' });
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Acknowledge all
          </Button>
        </div>
      </Toolbar>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ShieldCheck className="h-5 w-5 text-success" />}
                title={scope === 'active' ? 'Nothing needs your attention' : 'No alerts match this filter'}
                description={
                  scope === 'active'
                    ? 'Every monitored subsystem — cameras, barriers, ANPR and the API link — is reporting normally.'
                    : 'Change the scope or severity filter to see other alerts.'
                }
              />
            </Card>
          ) : (
            (['critical', 'warning', 'info'] as const).map((sev) => {
              const list = grouped[sev];
              if (!list.length) return null;
              return (
                <section key={sev}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        sev === 'critical' ? 'bg-danger' : sev === 'warning' ? 'bg-warning' : 'bg-info',
                      )}
                    />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-subtle">
                      {sev} · {list.length}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2" role="list">
                    {list.map((a) => (
                      <AlertCard
                        key={a.id}
                        alert={a}
                        onAcknowledge={(id) => {
                          simulation.acknowledgeAlert(id, operatorLabel);
                          toast({ title: 'Alert acknowledged', description: a.title, variant: 'success' });
                        }}
                        onResolve={(id) => {
                          simulation.resolveAlert(id);
                          toast({ title: 'Alert resolved', description: a.title, variant: 'success' });
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Alert rules"
            subtitle="What raises each alert, and what clears it"
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
          />
          <ul className="divide-y divide-border-subtle">
            {RULES.map((r) => {
              const live = alerts.filter((a) => a.type === r.type && !a.resolved).length;
              return (
                <li key={r.type} className="flex gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-subtle">
                    <r.icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium capitalize text-foreground">
                        {r.type.replace(/_/g, ' ')}
                      </p>
                      {live > 0 && (
                        <Badge tone="danger" size="sm">
                          {live} live
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      <span className="text-subtle">Raises:</span> {r.rule}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      <span className="text-subtle">Clears:</span> {r.clears}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
