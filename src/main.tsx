import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './pms/app/AppShell';
import { SessionProvider } from './pms/store/session';
import { LoadingState } from './pms/components/ui/data';
import './pms/styles/theme.css';

/**
 * Nexus PMS — Parking Management System for the Nexus BMS suite.
 *
 * Screens are code-split: the command centre is what an operator opens at the
 * start of a shift, and it should not wait on the analytics or report bundles.
 * `HashRouter` keeps deep links working when the build is served as static
 * files without a rewrite rule.
 */
const Dashboard = lazy(() => import('./pms/routes/Dashboard'));
const Plaza = lazy(() => import('./pms/routes/Plaza'));
const VehicleSearch = lazy(() => import('./pms/routes/VehicleSearch'));
const Gates = lazy(() => import('./pms/routes/Gates'));
const Visitors = lazy(() => import('./pms/routes/Visitors'));
const Employees = lazy(() => import('./pms/routes/Employees'));
const CCTV = lazy(() => import('./pms/routes/CCTV'));
const Barriers = lazy(() => import('./pms/routes/Barriers'));
const Reports = lazy(() => import('./pms/routes/Reports'));
const Analytics = lazy(() => import('./pms/routes/Analytics'));
const Alerts = lazy(() => import('./pms/routes/Alerts'));
const Administration = lazy(() => import('./pms/routes/Administration'));
const Settings = lazy(() => import('./pms/routes/Settings'));
const NotFound = lazy(() => import('./pms/routes/NotFound'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={
                <Suspense fallback={<LoadingState label="Loading command centre…" />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route path="/plaza" element={<Lazy><Plaza /></Lazy>} />
            <Route path="/search" element={<Lazy><VehicleSearch /></Lazy>} />
            <Route path="/gates" element={<Lazy><Gates /></Lazy>} />
            <Route path="/visitors" element={<Lazy><Visitors /></Lazy>} />
            <Route path="/employees" element={<Lazy><Employees /></Lazy>} />
            <Route path="/cctv" element={<Lazy><CCTV /></Lazy>} />
            <Route path="/barriers" element={<Lazy><Barriers /></Lazy>} />
            <Route path="/reports" element={<Lazy><Reports /></Lazy>} />
            <Route path="/analytics" element={<Lazy><Analytics /></Lazy>} />
            <Route path="/alerts" element={<Lazy><Alerts /></Lazy>} />
            <Route path="/admin" element={<Lazy><Administration /></Lazy>} />
            <Route path="/settings" element={<Lazy><Settings /></Lazy>} />
            <Route path="*" element={<Lazy><NotFound /></Lazy>} />
          </Route>
        </Routes>
      </HashRouter>
    </SessionProvider>
  </StrictMode>,
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading module…" />}>{children}</Suspense>;
}
