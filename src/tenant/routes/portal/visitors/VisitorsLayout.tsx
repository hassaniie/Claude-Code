import { CalendarPlus } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Page } from '../../../components/ui/page';
import { PageHeader } from '../../../components/common';
import { Button } from '../../../components/ui/primitives';
import { TabBar } from '../../../components/ui/tabs';
import { PORTAL_VISITOR_TABS } from '../../../app/nav';

export default function VisitorsLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const active = [...PORTAL_VISITOR_TABS].sort((a, b) => b.path.length - a.path.length).find((t) => loc.pathname === t.path || loc.pathname.startsWith(t.path + '/'))?.id ?? 'upcoming';
  return (
    <Page>
      <PageHeader
        title="Visitors"
        description="Schedule visitors and track who is coming to your organization."
        actions={<Button variant="primary" size="sm" onClick={() => nav('/portal/visitors/schedule')}><CalendarPlus className="h-4 w-4" />Schedule Visitor</Button>}
      />
      <div className="overflow-x-auto">
        <TabBar value={active} onChange={(id) => nav(PORTAL_VISITOR_TABS.find((t) => t.id === id)!.path)} tabs={PORTAL_VISITOR_TABS.map((t) => ({ value: t.id, label: t.label }))} />
      </div>
      <Outlet />
    </Page>
  );
}
