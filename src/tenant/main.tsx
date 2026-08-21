import { StrictMode, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminShell, PortalShell } from './app/Shell';
import { SessionProvider, useSession } from './store/session';
import { LoadingState } from './components/ui/data';
import { AdminVisitorList } from './routes/admin/visitors/List';
import { PortalVisitorList } from './routes/portal/visitors/List';
import { PortalServiceList } from './routes/portal/service/List';
import { NotificationsPage } from './routes/NotificationsPage';
import './styles/theme.css';

/**
 * NASTP Tenant Operations — a peer module to Nexus PMS in the same suite.
 *
 * One entry, two experiences: the NASTP Admin control plane under `/admin` and
 * the Tenant Portal under `/portal`. HashRouter keeps deep links working when
 * the build is served as static files. Screens are code-split so the first
 * paint of either experience never waits on the whole product.
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

const Reports = lazy(() => import('./routes/admin/Reports'));
const AdminSettings = lazy(() => import('./routes/admin/Settings'));
const Buildings = lazy(() => import('./routes/admin/Buildings'));
const AdminUsers = lazy(() => import('./routes/admin/Users'));
const Organization = lazy(() => import('./routes/portal/Organization'));

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

            <Route path="/admin/reports" element={<L><Reports /></L>} />
            <Route path="/admin/notifications" element={<NotificationsPage scope="admin" />} />
            <Route path="/admin/settings" element={<L><AdminSettings /></L>} />
            <Route path="/admin/settings/buildings" element={<L><Buildings /></L>} />
            <Route path="/admin/settings/users" element={<L><AdminUsers /></L>} />
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

            <Route path="/portal/notifications" element={<NotificationsPage scope="tenant" />} />
            <Route path="/portal/organization" element={<L><Organization /></L>} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  </StrictMode>,
);
