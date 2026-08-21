/**
 * Tenant Portal — Home (§46).
 *
 * Answers the three questions a tenant opens the portal with: how are we using
 * energy, who is visiting us, and what needs our attention. Deliberately calm —
 * no electrical metrics on the homepage; those live deeper in Energy.
 */

import { ArrowRight, CalendarPlus, DoorOpen, FilePlus2, Wrench, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { StatCard, PageHeader, Timeline, MetricValue } from '../../components/common';
import { Button, IconBox, StatusBadge } from '../../components/ui/primitives';
import { Sparkline } from '../../components/charts';
import { useSession } from '../../store/session';
import { useLive } from '../../data/live';
import { tenantPortalSnapshot } from '../../data/selectors';
import { ACTIVITY_ICON } from '../../lib/activityMeta';
import { VisitorStatusBadge } from '../../components/status';
import { ago, cn, currency, energy, fmtTime, num } from '../../lib/utils';

export default function PortalHome() {
  const { tenantId } = useSession();
  const navigate = useNavigate();
  const tenant = useLive((w) => w.tenantById[tenantId]);
  const snap = useLive((w) => tenantPortalSnapshot(w, tenantId));
  const daily = useLive((w) => w.readings[tenantId]?.daily ?? []);
  const activity = useLive((w) => w.activity.filter((a) => a.tenantId === tenantId).slice(0, 7));
  const inside = useLive((w) => w.visitors.filter((v) => v.tenantId === tenantId && (v.status === 'in_building' || v.status === 'overstaying')).slice(0, 4));

  if (!tenant) return null;
  const spark = daily.slice(-14).map((d) => d.kwh);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Page>
      <PageHeader
        title={`${greeting}, ${tenant.primaryContact.name.split(' ')[0]}`}
        description={`Here's what's happening across ${tenant.name} today.`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/portal/visitors/schedule')}><CalendarPlus className="h-4 w-4" />Schedule Visitor</Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/portal/service/new')}><FilePlus2 className="h-4 w-4" />New Request</Button>
          </div>
        }
      />

      {/* Energy snapshot */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Energy Snapshot" subtitle="Current billing period" icon={<IconBox icon={Zap} tone="energy" size="sm" />} actions={<Button variant="ghost" size="xs" onClick={() => navigate('/portal/energy')}>Open Energy<ArrowRight className="h-3.5 w-3.5" /></Button>} />
          <CardBody className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <SnapshotStat label="Current Load" value={energy(snap.currentLoadKw, 'kW').value} unit={energy(snap.currentLoadKw, 'kW').unit} />
            <SnapshotStat label="Period Usage" value={energy(snap.periodKwh).value} unit={energy(snap.periodKwh).unit} />
            <SnapshotStat label="Period Charges" value={currency(snap.periodCharges, { symbol: false, compact: true })} unit="PKR" />
            <SnapshotStat label="Active Alerts" value={num(snap.activeAlerts)} tone={snap.activeAlerts ? 'warning' : 'success'} />
            <div className="col-span-2 sm:col-span-4">
              <Sparkline data={spark} height={56} color="var(--module-energy)" />
              <p className="mt-1 text-[11px] text-subtle">Daily consumption, last 14 days · {snap.activeMeters}/{snap.totalMeters} meters online</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Visitors" subtitle="Today" icon={<IconBox icon={DoorOpen} tone="visitor" size="sm" />} actions={<Button variant="ghost" size="xs" onClick={() => navigate('/portal/visitors')}>All</Button>} />
          <CardBody className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Scheduled" value={snap.visitorsScheduledToday} tone="info" />
              <MiniStat label="Inside" value={snap.visitorsInside} tone="success" />
              <MiniStat label="Next" value={snap.nextVisitor ? fmtTime(snap.nextVisitor.expectedArrival) : '—'} tone="neutral" small />
            </div>
            {snap.nextVisitor ? (
              <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-subtle">Next visitor</p>
                <p className="mt-1 text-[13px] font-medium text-foreground">{snap.nextVisitor.fullName}</p>
                <p className="text-[11.5px] text-muted">{snap.nextVisitor.company ?? snap.nextVisitor.purpose} · {fmtTime(snap.nextVisitor.expectedArrival)}</p>
              </div>
            ) : (
              <p className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3 text-[12px] text-subtle">No upcoming visitors scheduled.</p>
            )}
            {inside.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {inside.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-muted">{v.fullName}</span>
                    <VisitorStatusBadge status={v.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Service + activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <StatCard label="Open Requests" value={num(snap.openRequests)} icon={Wrench} tone="service" caption="Service Center" onClick={() => navigate('/portal/service')} />
        <StatCard label="In Progress" value={num(snap.inProgressRequests)} icon={Wrench} tone="primary" caption="Being handled by NASTP" onClick={() => navigate('/portal/service')} />
        <StatCard label="Waiting for You" value={num(snap.waitingRequests)} icon={Wrench} tone={snap.waitingRequests ? 'warning' : 'neutral'} caption={snap.waitingRequests ? 'Action needed' : 'Nothing pending'} onClick={() => navigate('/portal/service')} />
      </div>

      <Card>
        <CardHeader title="Recent Activity" subtitle="Your organization's timeline" />
        <CardBody>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-subtle">No recent activity.</p>
          ) : (
            <Timeline
              items={activity.map((a) => ({
                id: a.id,
                icon: ACTIVITY_ICON[a.kind],
                tone: a.domain === 'energy' ? 'energy' : a.domain === 'visitor' ? 'visitor' : a.domain === 'service' ? 'service' : 'primary',
                title: a.title,
                detail: a.detail,
                meta: ago(a.ts),
              }))}
            />
          )}
        </CardBody>
      </Card>
    </Page>
  );
}

function SnapshotStat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'success' | 'warning' }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-subtle">{label}</p>
      <div className="mt-1.5">
        <MetricValue value={value} unit={unit} size="lg" className={tone === 'warning' ? '[&>span:first-child]:text-warning' : ''} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone, small }: { label: string; value: number | string; tone: 'info' | 'success' | 'neutral'; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-2.5 text-center">
      <p className={cn('tnum font-semibold text-foreground', small ? 'text-[15px]' : 'text-[22px]')}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-subtle">{label}</p>
      <StatusBadge tone={tone} size="sm" className="mt-1.5" dot={false}>{tone === 'info' ? 'today' : tone === 'success' ? 'now' : 'ETA'}</StatusBadge>
    </div>
  );
}
