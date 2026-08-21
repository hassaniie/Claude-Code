/**
 * Admin — Visitor Operations Overview (§24). A read of the day across scheduled,
 * inside and overstaying, with quick lists and the reception drawer.
 */

import { AlarmClock, CalendarClock, DoorClosed, DoorOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { PageHeader, StatCard } from '../../../components/common';
import { Button, IconBox } from '../../../components/ui/primitives';
import { VisitorStatusBadge } from '../../../components/status';
import { VisitorDrawer } from '../../visitorsShared';
import { useLive } from '../../../data/live';
import { computeAdminKpis } from '../../../data/selectors';
import { startOfToday } from '../../../data/world';
import { fmtTime, num } from '../../../lib/utils';
import type { Visitor } from '../../../data/types';

export default function VisitorsOverview() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Visitor | null>(null);
  const kpis = useLive(computeAdminKpis);
  const data = useLive((w) => ({
    scheduledToday: w.visitors.filter((v) => v.status === 'scheduled' && v.visitDate >= startOfToday && v.visitDate < startOfToday + 86_400_000).sort((a, b) => a.expectedArrival - b.expectedArrival),
    inside: w.visitors.filter((v) => v.status === 'in_building' || v.status === 'overstaying'),
    overstaying: w.visitors.filter((v) => v.status === 'overstaying'),
    nameFor: (id: string) => w.tenantById[id]?.name ?? '—',
  }));

  return (
    <Page>
      <PageHeader title="Visitor Operations" description="Reception-integrated visitor operations across the NASTP park." />

      <StatGrid cols={4}>
        <StatCard label="Scheduled Today" value={num(kpis.visitorsScheduledToday)} icon={CalendarClock} tone="info" onClick={() => navigate('/admin/visitors/scheduled')} />
        <StatCard label="Currently Inside" value={num(kpis.visitorsInside)} icon={DoorOpen} tone="visitor" onClick={() => navigate('/admin/visitors/inside')} />
        <StatCard label="Overstaying" value={num(kpis.visitorsOverstaying)} icon={AlarmClock} tone={kpis.visitorsOverstaying ? 'critical' : 'success'} onClick={() => navigate('/admin/visitors/overstaying')} />
        <StatCard label="Checked Out Today" value={num(kpis.visitorsCheckedOutToday)} icon={DoorClosed} tone="neutral" onClick={() => navigate('/admin/visitors/history')} />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-3">
        <QuickList title="Scheduled Today" icon={CalendarClock} tone="info" visitors={data.scheduledToday} nameFor={data.nameFor} onOpen={setOpen} onAll={() => navigate('/admin/visitors/scheduled')} empty="No visitors scheduled today." />
        <QuickList title="Currently Inside" icon={DoorOpen} tone="visitor" visitors={data.inside} nameFor={data.nameFor} onOpen={setOpen} onAll={() => navigate('/admin/visitors/inside')} empty="No visitors inside." />
        <QuickList title="Overstaying" icon={AlarmClock} tone="critical" visitors={data.overstaying} nameFor={data.nameFor} onOpen={setOpen} onAll={() => navigate('/admin/visitors/overstaying')} empty="No overstays right now." />
      </div>

      <VisitorDrawer visitor={open} open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)} mode="admin" tenantName={open ? data.nameFor(open.tenantId) : undefined} />
    </Page>
  );
}

function QuickList({ title, icon, tone, visitors, nameFor, onOpen, onAll, empty }: { title: string; icon: typeof DoorOpen; tone: 'info' | 'visitor' | 'critical'; visitors: Visitor[]; nameFor: (id: string) => string; onOpen: (v: Visitor) => void; onAll: () => void; empty: string }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={`${visitors.length}`} icon={<IconBox icon={icon} tone={tone} size="sm" />} actions={<Button variant="ghost" size="xs" onClick={onAll}>All</Button>} />
      <CardBody className="flex flex-col gap-1.5">
        {visitors.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-subtle">{empty}</p>
        ) : (
          visitors.slice(0, 6).map((v) => (
            <button key={v.id} onClick={() => onOpen(v)} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-raised">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-foreground">{v.fullName}</p>
                <p className="truncate text-[11px] text-subtle">{nameFor(v.tenantId)} · {fmtTime(v.expectedArrival)}</p>
              </div>
              <VisitorStatusBadge status={v.status} size="sm" />
            </button>
          ))
        )}
      </CardBody>
    </Card>
  );
}
