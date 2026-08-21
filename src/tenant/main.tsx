import { StrictMode, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  AlarmClock, BadgePercent, BarChart3, Bell, Building2, CalendarClock, DoorOpen, FileBarChart,
  Gauge, History, Repeat, Settings, Users, Wallet, Zap,
} from 'lucide-react';
import { AdminShell, PortalShell } from './app/Shell';
import { SessionProvider, useSession } from './store/session';
import { LoadingState } from './components/ui/data';
import { scaffold } from './routes/Scaffold';
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
const PortalHome = lazy(() => import('./routes/portal/Home'));

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

/* Section scaffolds — replaced with full builds through phases 2–6. */
const P2 = 'Phase 2 · Tenant Management';
const P3 = 'Phase 3 · Energy';
const P4 = 'Phase 4 · Visitors';
const P5 = 'Phase 5 · Service Center';
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

            <Route path="/admin/tenants" element={<Scaf title="All Tenants" icon={Building2} phase={P2} description="A management workspace over every tenant — search, filter and act." points={['Table and card views over all tenants', 'Building, floor, status and energy filters', 'Quick actions: open, activate, suspend, view portal']} />} />
            <Route path="/admin/tenants/new" element={<Scaf title="Tenant Onboarding" icon={Building2} phase={P2} description="A guided, multi-step onboarding wizard with a live preview." points={['Seven steps: organization → spaces → energy → alerts → portal → review', 'Save as draft, autosave, and step validation', 'Live configuration summary and preview panel']} />} />
            <Route path="/admin/tenants/:id" element={<Scaf title="Tenant Detail Workspace" icon={Building2} phase={P2} description="An operational workspace for a single tenant." points={['Overview, Spaces, Energy, Visitors, Service, Users, Configuration, Activity', 'Lifecycle actions with confirmation', 'Unified chronological activity timeline']} />} />

            <Route path="/admin/energy" element={<Scaf title="Energy Overview" icon={Zap} phase={P3} description="Park-wide energy intelligence for the admin." points={['Consumption, load, peak demand, charges', 'Peak vs off-peak comparison', 'Highest consuming tenants, offline meters']} />} />
            <Route path="/admin/energy/consumption" element={<Scaf title="Tenant Consumption" icon={BarChart3} phase={P3} description="Compare consumption across tenants." points={['Per-tenant consumption ranking and trends', 'Date ranges and drill-down', 'Export-ready tables']} />} />
            <Route path="/admin/energy/meters" element={<Scaf title="Meters" icon={Gauge} phase={P3} description="The meter registry — infrastructure mains and tenant sub-meters." points={['Main vs sub-meter clearly distinguished', 'Live electrical snapshot per meter', 'Status, health and last-reading tracking']} />} />
            <Route path="/admin/energy/tariffs" element={<Scaf title="Tariffs & Rates" icon={BadgePercent} phase={P3} description="Globally-configured rates with effective periods." points={['Energy, genset, peak and off-peak rates', 'Effective periods preserve historical bills', 'Impact preview before applying a change']} />} />
            <Route path="/admin/energy/billing" element={<Scaf title="Charges & Billing" icon={Wallet} phase={P3} description="Charges and invoices across tenants." points={['Billing periods, breakdown and payment status', 'Downloadable invoice architecture', 'Outstanding and overdue tracking']} />} />
            <Route path="/admin/energy/alerts" element={<Scaf title="Energy Alerts" icon={Bell} phase={P3} description="Active and historical energy alerts." points={['Severity, source, tenant and meter', 'Acknowledge and resolve', 'Configured thresholds per tenant']} />} />

            <Route path="/admin/visitors" element={<Scaf title="Visitor Operations" icon={DoorOpen} phase={P4} description="Reception-integrated visitor operations." points={['Overview across scheduled, inside and overstaying', 'Tenant, date, status and building filters', 'Visit timeline and reception state updates']} />} />
            <Route path="/admin/visitors/scheduled" element={<Scaf title="Scheduled Visitors" icon={CalendarClock} phase={P4} description="Everyone expected across the park." points={['Filter by tenant, date and building', 'Verify at reception and mark in-building', 'Full visitor details']} />} />
            <Route path="/admin/visitors/inside" element={<Scaf title="Visitors In Building" icon={DoorOpen} phase={P4} description="Live in-building tracking." points={['Who is inside right now, by tenant', 'Expected departure and dwell time', 'Check-out from reception']} />} />
            <Route path="/admin/visitors/overstaying" element={<Scaf title="Overstaying Visitors" icon={AlarmClock} phase={P4} description="Visitors past their expected departure." points={['Overstay detection against wall-clock time', 'Prominent, but not treated as a security incident', 'Notify the relevant tenant']} />} />
            <Route path="/admin/visitors/history" element={<Scaf title="Visitor History" icon={History} phase={P4} description="The full visit ledger." points={['Search and filter across all visits', 'No-shows, cancellations and completed visits', 'Per-tenant visitor activity']} />} />

            <Route path="/admin/service" element={<Scaf title="Service Requests" icon={BarChart3} phase={P5} description="A powerful service management workspace." points={['Table, board and detail views', 'Category, priority, status, tenant and overdue filters', 'Assign, update and resolve']} />} />
            <Route path="/admin/service/board" element={<Scaf title="Service Board" icon={BarChart3} phase={P5} description="Kanban workflow across request states." points={['Submitted → Acknowledged → Assigned → In Progress → Waiting → Resolved', 'Drag-free status transitions', 'Priority and SLA signals']} />} />
            <Route path="/admin/service/performance" element={<Scaf title="Service Performance" icon={BarChart3} phase={P5} description="Service center analytics." points={['Volume, category and priority distribution', 'Average resolution time', 'Overdue and per-tenant activity']} />} />

            <Route path="/admin/reports" element={<Scaf title="Reports" icon={FileBarChart} phase={P6} description="Tenant, energy, visitor and service reports." points={['Date range selection and filtering', 'Export to CSV and print-ready PDF', 'Standard report catalogue']} />} />
            <Route path="/admin/notifications" element={<Scaf title="Notifications" icon={Bell} phase={P6} description="The shared notification center." points={['Energy, visitor and service categories', 'In-app now, email/SMS/push architecture ready', 'Mark read and jump to source']} />} />
            <Route path="/admin/settings" element={<Scaf title="Settings" icon={Settings} phase={P6} description="Preferences, theme and API diagnostics." points={['Theme, density and units', 'Live cadence controls', 'API fault injection to exercise every state']} />} />
            <Route path="/admin/settings/buildings" element={<Scaf title="Buildings & Spaces" icon={Building2} phase={P6} description="The physical catalog." points={['Buildings, floors and offices', 'Main meter per floor', 'Occupancy and leasable area']} />} />
            <Route path="/admin/settings/users" element={<Scaf title="Users" icon={Users} phase={P6} description="Administrative users and roles." points={['Admin role today, scalable to more', 'Role architecture without redesign', 'Access and audit']} />} />
          </Route>

          {/* -------------------------------------------------- Portal */}
          <Route element={<PortalLayout />}>
            <Route path="/portal" element={<L><PortalHome /></L>} />

            <Route path="/portal/energy" element={<Scaf title="Energy — Overview" icon={Zap} phase={P3} description="How much energy are we using, and what are we being charged?" points={['Current load, demand and period consumption', 'Consumption and demand over time', 'Peak vs off-peak, historical comparison']} />} />
            <Route path="/portal/energy/consumption" element={<Scaf title="Energy — Consumption" icon={BarChart3} phase={P3} description="Consumption over time with flexible date ranges." points={['Today, 7/30 days, this/previous month, custom', 'Daily usage and comparisons', 'Table view for accessibility']} />} />
            <Route path="/portal/energy/demand" element={<Scaf title="Energy — Demand & Load" icon={Gauge} phase={P3} description="Current load and demand trends." points={['Current and maximum demand', 'Load curve over time', 'Peak demand tracking']} />} />
            <Route path="/portal/energy/details" element={<Scaf title="Energy — Details" icon={Gauge} phase={P3} description="Progressive exploration of electrical parameters." points={['Summary → Consumption → Demand → Electrical → Historical', 'Voltage, current, power factor, frequency', 'Reactive and apparent power']} />} />
            <Route path="/portal/energy/billing" element={<Scaf title="Energy — Billing & Charges" icon={Wallet} phase={P3} description="Complete billing and charge information." points={['Period, consumption and peak/off-peak split', 'Energy and genset charges with applicable rates', 'Historical bills and downloadable invoices']} />} />
            <Route path="/portal/energy/alerts" element={<Scaf title="Energy — Alerts" icon={Bell} phase={P3} description="Relevant alerts for your organization." points={['Consumption, demand and cost thresholds', 'Meter offline and unusual usage', 'Severity and history']} />} />

            <Route path="/portal/visitors" element={<Scaf title="Visitors — Upcoming" icon={DoorOpen} phase={P4} description="Who is visiting your organization." points={['Upcoming and scheduled visitors', 'Live in-building status', 'Quick access to schedule a visitor']} />} />
            <Route path="/portal/visitors/schedule" element={<Scaf title="Schedule a Visitor" icon={CalendarClock} phase={P4} description="Register an individual visitor for reception." points={['Clear required vs optional fields', 'Host, vehicle, purpose and timing', 'Visitor arrives and is verified at reception']} />} />
            <Route path="/portal/visitors/recurring" element={<Scaf title="Recurring Visitors" icon={Repeat} phase={P4} description="Vendors, contractors and regular contacts." points={['Daily, weekly, monthly or custom recurrence', 'Pause, resume, edit future occurrences', 'Individual visit instances generated']} />} />
            <Route path="/portal/visitors/inside" element={<Scaf title="Visitors Inside" icon={DoorOpen} phase={P4} description="Live status of visitors currently in the building." points={['Real-time in-building tracking', 'Expected departure and overstay signals', 'Visit timeline']} />} />
            <Route path="/portal/visitors/history" element={<Scaf title="Visitor History" icon={History} phase={P4} description="Your organization's past visits." points={['Completed, cancelled and no-show visits', 'Search and filter', 'Visit details']} />} />

            <Route path="/portal/service" element={<Scaf title="Service Center — My Requests" icon={BarChart3} phase={P5} description="Your open and recent service requests." points={['Status, priority and last update', 'Timeline, comments and attachments', 'Confirm resolution, reopen, rate']} />} />
            <Route path="/portal/service/new" element={<Scaf title="New Service Request" icon={BarChart3} phase={P5} description="Raise a request with the NASTP service team." points={['Title, description, category and priority', 'Office/location and attachments', 'Sensible required fields only']} />} />
            <Route path="/portal/service/history" element={<Scaf title="Service History" icon={History} phase={P5} description="Your closed and confirmed requests." points={['Full request history', 'Ratings and feedback', 'Reopen where needed']} />} />

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
