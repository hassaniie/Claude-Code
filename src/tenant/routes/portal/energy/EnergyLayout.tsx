/**
 * Tenant Portal — Energy section shell. A single page title with secondary
 * navigation across the six energy views (§45), rendering the active view.
 */

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Page } from '../../../components/ui/page';
import { PageHeader } from '../../../components/common';
import { TabBar } from '../../../components/ui/tabs';
import { PORTAL_ENERGY_TABS } from '../../../app/nav';

export default function EnergyLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const active = [...PORTAL_ENERGY_TABS].sort((a, b) => b.path.length - a.path.length).find((t) => loc.pathname === t.path || loc.pathname.startsWith(t.path + '/'))?.id ?? 'overview';

  return (
    <Page>
      <PageHeader title="Energy" description="How much energy are we using, what are we being charged, and how does it compare?" />
      <div className="overflow-x-auto">
        <TabBar value={active} onChange={(id) => nav(PORTAL_ENERGY_TABS.find((t) => t.id === id)!.path)} tabs={PORTAL_ENERGY_TABS.map((t) => ({ value: t.id, label: t.label }))} />
      </div>
      <Outlet />
    </Page>
  );
}
