/**
 * Tenant Portal — visitor lists (Upcoming, Inside, History), scoped strictly to
 * the tenant. Reuses the shared table and reception drawer (read-mostly here;
 * the tenant can cancel a scheduled visit).
 */

import { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { VisitorTable, VisitorDrawer } from '../../visitorsShared';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import type { Visitor, VisitorStatus } from '../../../data/types';

export type PortalVisitorKind = 'upcoming' | 'inside' | 'history';

const MATCH: Record<PortalVisitorKind, (s: VisitorStatus) => boolean> = {
  upcoming: (s) => s === 'scheduled',
  inside: (s) => s === 'in_building' || s === 'overstaying',
  history: (s) => s === 'checked_out' || s === 'cancelled' || s === 'no_show',
};

const EMPTY: Record<PortalVisitorKind, { title: string; description: string }> = {
  upcoming: { title: 'No upcoming visitors', description: 'Schedule a visitor and they will appear here.' },
  inside: { title: 'No visitors inside', description: 'Nobody from your visitor list is currently in the building.' },
  history: { title: 'No past visits', description: 'Completed and cancelled visits will appear here.' },
};

export function PortalVisitorList({ kind }: { kind: PortalVisitorKind }) {
  const { tenantId } = useSession();
  const [open, setOpen] = useState<Visitor | null>(null);
  const visitors = useLive((w) => w.visitors.filter((v) => v.tenantId === tenantId && MATCH[kind](v.status)));

  return (
    <>
      <Card>
        <VisitorTable
          visitors={visitors}
          onOpen={setOpen}
          selectedKey={open?.id}
          emptyTitle={EMPTY[kind].title}
          emptyDescription={EMPTY[kind].description}
        />
      </Card>
      <VisitorDrawer visitor={open} open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)} mode="tenant" />
    </>
  );
}
