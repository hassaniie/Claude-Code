import { StrictMode, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Bell, Building2, FileBarChart, Settings, Users } from 'lucide-react';
import { AdminShell, PortalShell } from './app/Shell';
import { SessionProvider, useSession } from './store/session';
import { LoadingState } from './components/ui/data';
import { scaffold } from './routes/Scaffold';
import { AdminVisitorList } from './routes/admin/visitors/List';
import { PortalVisitorList } from './routes/portal/visitors/List';
import { PortalServiceList } from './routes/portal/service/List';
import './styles/theme.css';

/**
 * NASTP Tenant Operations — a peer module to Nexus PMS in the same suite.
 *
 * One entry, two experiences: the NASTP Admin control plane under `/admin` and
 * the Tenant Portal under `/portal`. HashRouter keeps deep links working when
 * the build is served as static files. Screens are added phase by phase (§54);
 * routes that are navigable but not yet deepened render an honest section
 * scaffold rather than a fake dashboard.
 */

const AdminDashboard = lazy(() => import('./routes/admin/Dashboard'));
const Tenants = lazy(() => import('./routes/admin/Tenants'));
const TenantOnboarding = lazy(() => import('./routes/admin/TenantOnboarding'));
const TenantDetail = lazy(() => import('./routes/admin/TenantDetail'));

const AdminEnergyOverview = lazy(() => import('./routes/admin/energy/Overview'));
const AdminConsumption = lazy(() => import('./routes/admin/energy/Consumption'));
const AdminMeters = lazy(() => import('./routes/admin/energy/Meters'));
const AdminTariffs = lazy(() => import('./routes/admin/energy/Tariffs'));
const AdminBilling = lazy(() => import('./routes/admin/energy/Billing'));
const AdminEnergyAlerts = lazy(() => import('./routes/admin/energy/Alerts'));

const AdminVisitorsOverview = lazy(() => import('./routes/admin/visitors/Overview'));
const AdminServiceRequests = lazy(() => import('./routes/admin/service/Requests'));
const AdminServiceBoard = lazy(() => import('./routes/admin/service/Board'));
const AdminServicePerformance = lazy(() => import('./routes/admin/service/Performance'));

const PortalHome = lazy(() => import('./routes/portal/Home'));
const EnergyLayout = lazy(() => import('./routes/portal/energy/EnergyLayout'));
const PEOverview = lazy(() => import('./routes/portal/energy/Overview'));
const PEConsumption = lazy(() => import('./routes/portal/energy/Consumption'));
const PEDemand = lazy(() => import('./routes/portal/energy/Demand'));
const PEDetails = lazy(() => import('./routes/portal/energy/Details'));
const PEBilling = lazy(() => import('./routes/portal/energy/Billing'));
const PEAlerts = lazy(() => import('./routes/portal/energy/Alerts'));
const VisitorsLayout = lazy(() => import('./routes/portal/visitors/VisitorsLayout'));
const ScheduleVisitor = lazy(() => import('./routes/portal/visitors/Schedule'));
const RecurringVisitors = lazy(() => import('./routes/portal/visitors/Recurring'));
const ServiceLayout = lazy(() => import('./routes/portal/service/ServiceLayout'));
const NewRequest = lazy(() => import('./routes/portal/service/New'));

const L = ({ children }: { children: ReactNode }) => <Suspense fallback={<LoadingState label="Loading…" />}>{children}</Suspense>;

/** Keep the session's experience in step with the URL so the switcher, rail and
 *  notification scope always match what's on screen. */
function AdminLayout() {
  const { enterAdmin } = useSession();
  useEffect(() => { enterAdmin(); }, [enterAdmin]);
  return <AdminShell />;
}
function PortalLayout() {
  const { experience, enterPortal, tenantId } = useSession();
  useEffect(() => { if (experience !== 'portal') enterPortal(tenantId); }, [experience, enterPortal, tenantId]);
  return <PortalShell />;
}

/* Section scaffolds — replaced with full builds through phases 3–6. */
const P6 = 'Phase 6 · Cross-system';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* -------------------------------------------------- Admin */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<L><AdminDashboard /></L>} />

            <Route path="/admin/tenants" element={<L><Tenants /></L>} />
            <Route path="/admin/tenants/new" element={<L><TenantOnboarding /></L>} />
            <Route path="/admin/tenants/:id" element={<L><TenantDetail /></L>} />

            <Route path="/admin/energy" element={<L><AdminEnergyOverview /></L>} />
            <Route path="/admin/energy/consumption" element={<L><AdminConsumption /></L>} />
            <Route path="/admin/energy/meters" element={<L><AdminMeters /></L>} />
            <Route path="/admin/energy/tariffs" element={<L><AdminTariffs /></L>} />
            <Route path="/admin/energy/billing" element={<L><AdminBilling /></L>} />
            <Route path="/admin/energy/alerts" element={<L><AdminEnergyAlerts /></L>} />

            <Route path="/admin/visitors" element={<L><AdminVisitorsOverview /></L>} />
            <Route path="/admin/visitors/scheduled" element={<AdminVisitorList kind="scheduled" />} />
            <Route path="/admin/visitors/inside" element={<AdminVisitorList kind="inside" />} />
            <Route path="/admin/visitors/overstaying" element={<AdminVisitorList kind="overstaying" />} />
            <Route path="/admin/visitors/history" element={<AdminVisitorList kind="history" />} />

            <Route path="/admin/service" element={<L><AdminServiceRequests /></L>} />
            <Route path="/admin/service/board" element={<L><AdminServiceBoard /></L>} />
            <Route path="/admin/service/performance" element={<L><AdminServicePerformance /></L>} />

            <Route path="/admin/reports" element={<Scaf title="Reports" icon={FileBarChart} phase={P6} description="Tenant, energy, visitor and service reports." points={['Date range selection and filtering', 'Export to CSV and print-ready PDF', 'Standard report catalogue']} />} />
            <Route path="/admin/notifications" element={<Scaf title="Notifications" icon={Bell} phase={P6} description="The shared notification center." points={['Energy, visitor and service categories', 'In-app now, email/SMS/push architecture ready', 'Mark read and jump to source']} />} />
            <Route path="/admin/settings" element={<Scaf title="Settings" icon={Settings} phase={P6} description="Preferences, theme and API diagnostics." points={['Theme, density and units', 'Live cadence controls', 'API fault injection to exercise every state']} />} />
            <Route path="/admin/settings/buildings" element={<Scaf title="Buildings & Spaces" icon={Building2} phase={P6} description="The physical catalog." points={['Buildings, floors and offices', 'Main meter per floor', 'Occupancy and leasable area']} />} />
            <Route path="/admin/settings/users" element={<Scaf title="Users" icon={Users} phase={P6} description="Administrative users and roles." points={['Admin role today, scalable to more', 'Role architecture without redesign', 'Access and audit']} />} />
          </Route>

          {/* -------------------------------------------------- Portal */}
          <Route element={<PortalLayout />}>
            <Route path="/portal" element={<L><PortalHome /></L>} />

            <Route path="/portal/energy" element={<L><EnergyLayout /></L>}>
              <Route index element={<L><PEOverview /></L>} />
              <Route path="consumption" element={<L><PEConsumption /></L>} />
              <Route path="demand" element={<L><PEDemand /></L>} />
              <Route path="details" element={<L><PEDetails /></L>} />
              <Route path="billing" element={<L><PEBilling /></L>} />
              <Route path="alerts" element={<L><PEAlerts /></L>} />
            </Route>

            <Route path="/portal/visitors" element={<L><VisitorsLayout /></L>}>
              <Route index element={<PortalVisitorList kind="upcoming" />} />
              <Route path="schedule" element={<L><ScheduleVisitor /></L>} />
              <Route path="recurring" element={<L><RecurringVisitors /></L>} />
              <Route path="inside" element={<PortalVisitorList kind="inside" />} />
              <Route path="history" element={<PortalVisitorList kind="history" />} />
            </Route>

            <Route path="/portal/service" element={<L><ServiceLayout /></L>}>
              <Route index element={<PortalServiceList kind="open" />} />
              <Route path="new" element={<L><NewRequest /></L>} />
              <Route path="history" element={<PortalServiceList kind="history" />} />
            </Route>

            <Route path="/portal/notifications" element={<Scaf title="Notifications" icon={Bell} phase={P6} description="Energy, visitor and service notifications for your organization." points={['Scoped strictly to your tenant', 'Mark read and jump to source', 'In-app now, more channels ready']} />} />
            <Route path="/portal/organization" element={<Scaf title="Organization" icon={Building2} phase={P6} description="Your organization profile and users." points={['Contacts, offices and meters', 'Users and roles', 'Contract and configuration summary']} />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  </StrictMode>,
);

/** Thin wrapper so route declarations stay one-liners. */
function Scaf(props: { title: string; description: string; icon: Parameters<typeof scaffold>[0]['icon']; points: string[]; phase: string }) {
  const C = scaffold(props);
  return <C />;
}
