import { FilePlus2 } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Page } from '../../../components/ui/page';
import { PageHeader } from '../../../components/common';
import { Button } from '../../../components/ui/primitives';
import { TabBar } from '../../../components/ui/tabs';
import { PORTAL_SERVICE_TABS } from '../../../app/nav';

export default function ServiceLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const active = [...PORTAL_SERVICE_TABS].sort((a, b) => b.path.length - a.path.length).find((t) => loc.pathname === t.path || loc.pathname.startsWith(t.path + '/'))?.id ?? 'my-requests';
  return (
    <Page>
      <PageHeader
        title="Service Center"
        description="Raise and track building service requests with the NASTP team."
        actions={<Button variant="primary" size="sm" onClick={() => nav('/portal/service/new')}><FilePlus2 className="h-4 w-4" />New Request</Button>}
      />
      <div className="overflow-x-auto">
        <TabBar value={active} onChange={(id) => nav(PORTAL_SERVICE_TABS.find((t) => t.id === id)!.path)} tabs={PORTAL_SERVICE_TABS.map((t) => ({ value: t.id, label: t.label }))} />
      </div>
      <Outlet />
    </Page>
  );
}
