/**
 * Application shell: rail, top bar, and the global surfaces that sit above
 * every screen (command palette, toasts, shortcut help, emergency action).
 *
 * The rail is always visible on desktop and collapses to icons — an operator
 * should never lose the site map, but on a 1280px control-room browser the
 * 60px saved matters. Below `lg` it becomes a slide-over.
 */

import {
  AlertTriangle, Bell, ChevronsLeft, ChevronsRight, CircleHelp, Menu, Moon,
  PanelLeftClose, Pause, Play, Search, Siren, Sun, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ago, cn } from '../lib/utils';
import { NAV_GROUPS, NAV_ITEMS, findNav } from './nav';
import { CommandPalette } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { useSession } from '../store/session';
import { simulation, useActiveAlerts, useHealth, useKpis } from '../store/live';
import { Badge, Button, Kbd, StatusPill } from '../components/ui/primitives';
import { Toaster } from '../components/ui/toast';
import { Tooltip, TooltipProvider } from '../components/ui/overlay';
import { LiveDot } from '../components/pms/atoms';

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 px-3', collapsed && 'justify-center px-0')}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-primary to-[#1e40af] shadow-[0_2px_10px_rgba(59,130,246,0.35)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M8 17V7h4.6a3.2 3.2 0 0 1 0 6.4H8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-foreground">Nexus PMS</p>
          <p className="truncate text-[10px] uppercase tracking-[0.12em] text-subtle">Parking Operations</p>
        </div>
      )}
    </div>
  );
}

function Rail({
  collapsed,
  onToggle,
  onNavigate,
  mobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const alerts = useActiveAlerts();
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const kpis = useKpis();

  return (
    <nav
      className={cn(
        'flex h-full flex-col border-r border-border bg-background',
        collapsed ? 'w-[68px]' : 'w-[236px]',
        'transition-[width] duration-200 ease-out',
      )}
      aria-label="Primary"
    >
      <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-border">
        <Brand collapsed={collapsed} />
        {!mobile && !collapsed && (
          <button
            onClick={onToggle}
            className="mr-2 rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label="Collapse navigation"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group.id);
          return (
            <div key={group.id} className="mb-4 last:mb-0">
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                  {group.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const badge =
                    item.id === 'alerts' && alerts.length
                      ? alerts.length
                      : item.id === 'cctv' && kpis.offlineCameras
                        ? kpis.offlineCameras
                        : null;

                  const link = (
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[12.5px] font-medium transition-all duration-150',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-primary-muted text-foreground'
                            : 'text-muted hover:bg-surface-raised hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-full bg-primary" aria-hidden />
                          )}
                          <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {badge !== null && (
                            <span
                              className={cn(
                                'tnum ml-auto flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                                item.id === 'alerts' && criticalCount > 0
                                  ? 'bg-danger text-white'
                                  : 'bg-surface-inset text-muted',
                                collapsed && 'absolute right-1.5 top-1 ml-0 h-3.5 min-w-[14px] text-[9px]',
                              )}
                            >
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );

                  return (
                    <li key={item.id}>
                      {collapsed ? (
                        <Tooltip side="right" content={<span>{item.label}</span>}>
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border p-2.5">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-lg py-2 text-subtle transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label="Expand navigation"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">Plaza load</span>
              <span className="tnum text-[11px] font-semibold text-foreground">{kpis.occupancyPct.toFixed(1)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-inset">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  kpis.occupancyPct >= 95 ? 'bg-danger' : kpis.occupancyPct >= 80 ? 'bg-warning' : 'bg-success',
                )}
                style={{ width: `${kpis.occupancyPct}%` }}
              />
            </div>
            <p className="tnum mt-1.5 text-[10.5px] text-subtle">
              {kpis.available.toLocaleString()} bays free of {kpis.totalSpaces.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}

function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { setPaletteOpen, setShortcutsOpen, prefs, setPrefs, operator, toast } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const health = useHealth();
  const alerts = useActiveAlerts();
  const nav = findNav(location.pathname);
  const critical = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged);

  const connectionTone =
    health.connection === 'connected' ? 'success' : health.connection === 'degraded' ? 'warning' : 'danger';

  return (
    <header className="flex h-[54px] shrink-0 items-center gap-3 border-b border-border bg-background px-3 lg:px-4">
      <button
        onClick={onOpenMobileNav}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[14px] font-semibold tracking-[-0.015em] text-foreground">
          {nav?.label ?? 'Nexus PMS'}
        </h1>
        <p className="hidden truncate text-[11px] text-subtle sm:block">{nav?.description}</p>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className={cn(
          'hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface-inset px-2.5 text-[12px] text-subtle',
          'transition-colors hover:border-border-strong hover:text-muted md:flex md:w-[240px] xl:w-[300px]',
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search plates, screens, commands…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <Tooltip content={`Live updates ${prefs.liveUpdates ? 'running' : 'paused'} · ${prefs.tickMs}ms cadence`}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPrefs({ liveUpdates: !prefs.liveUpdates })}
            aria-label={prefs.liveUpdates ? 'Pause live updates' : 'Resume live updates'}
          >
            {prefs.liveUpdates ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-warning" />}
          </Button>
        </Tooltip>

        <Tooltip
          content={
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">Parking API — {health.connection}</span>
              <span className="tnum text-subtle">
                {health.latencyMs}ms · synced {ago(health.lastSync)} · {health.nodesOnline}/{health.nodesTotal} nodes
              </span>
            </div>
          }
        >
          <span className="hidden md:block">
            <StatusPill tone={connectionTone} pulse={health.connection !== 'connected'}>
              <span className="tnum">{health.latencyMs}ms</span>
            </StatusPill>
          </span>
        </Tooltip>

        <Tooltip content={`${alerts.length} active alerts`}>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('/alerts')} className="relative" aria-label="Alerts">
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span
                className={cn(
                  'tnum absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white',
                  critical.length ? 'bg-danger' : 'bg-warning',
                )}
              >
                {alerts.length}
              </span>
            )}
          </Button>
        </Tooltip>

        <Tooltip content={`Switch to ${prefs.theme === 'dark' ? 'light' : 'dark'} theme`}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
            aria-label="Toggle theme"
          >
            {prefs.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </Tooltip>

        <Tooltip content="Keyboard shortcuts (?)">
          <Button variant="ghost" size="icon-sm" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
            <CircleHelp className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Engage plaza-wide emergency release">
          <Button
            variant="danger"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => {
              simulation.emergencyAll(`${operator.name} (${operator.id})`);
              toast({
                title: 'Emergency release engaged',
                description: 'All barriers held open. Return lanes to auto when the incident clears.',
                variant: 'danger',
                action: {
                  label: 'Open barrier control',
                  onClick: () => navigate('/barriers'),
                },
              });
            }}
          >
            <Siren className="h-3.5 w-3.5" />
            Emergency
          </Button>
        </Tooltip>

        <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 lg:flex">
          <div className="text-right">
            <p className="text-[11.5px] font-medium leading-tight text-foreground">{operator.name}</p>
            <p className="text-[10px] leading-tight text-subtle">{operator.role}</p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3b6fb5] to-[#1f2f4a] text-[11px] font-semibold text-white">
            SM
          </span>
        </div>
      </div>
    </header>
  );
}

/** Banner shown when an unacknowledged critical alert is live. */
function CriticalBanner() {
  const alerts = useActiveAlerts();
  const navigate = useNavigate();
  const critical = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged);
  if (!critical.length) return null;

  return (
    <div className="flex items-center gap-3 border-b border-danger/30 bg-danger-dim/60 px-4 py-2">
      <AlertTriangle className="h-4 w-4 shrink-0 animate-[pulse-ring_2.4s_ease-in-out_infinite] text-danger" />
      <p className="min-w-0 flex-1 truncate text-[12px] text-foreground">
        <span className="font-semibold">{critical[0].title}</span>
        <span className="text-muted"> — {critical[0].message}</span>
      </p>
      {critical.length > 1 && (
        <Badge tone="danger" size="sm">
          +{critical.length - 1} more
        </Badge>
      )}
      <Button size="xs" variant="danger" onClick={() => navigate('/alerts')}>
        Review
      </Button>
    </div>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { prefs } = useSession();

  // `g` then a letter — chord navigation, the way ops tools have always done it.
  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout>;

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (armed) {
        const item = NAV_ITEMS.find((n) => n.chord === e.key.toLowerCase());
        armed = false;
        clearTimeout(timer);
        if (item) {
          e.preventDefault();
          navigate(item.path);
        }
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        armed = true;
        timer = setTimeout(() => (armed = false), 1400);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [navigate]);

  // Route change closes the mobile drawer and returns scroll to the top.
  useEffect(() => {
    setMobileNav(false);
    document.getElementById('main-scroll')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <TooltipProvider delayDuration={220} skipDelayDuration={400}>
      <div className={cn('flex h-full w-full overflow-hidden bg-canvas', prefs.density === 'compact' && 'text-[13px]')}>
        <div className="hidden lg:block">
          <Rail collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>

        {mobileNav && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-[fade-in_0.16s_ease-out]"
              onClick={() => setMobileNav(false)}
            />
            <div className="absolute inset-y-0 left-0 animate-[slide-in_0.24s_cubic-bezier(0.22,1,0.36,1)]">
              <Rail collapsed={false} onToggle={() => setMobileNav(false)} onNavigate={() => setMobileNav(false)} mobile />
            </div>
            <button
              onClick={() => setMobileNav(false)}
              className="absolute right-3 top-3 rounded-lg bg-surface-raised p-2 text-muted"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenMobileNav={() => setMobileNav(true)} />
          <CriticalBanner />
          <main id="main-scroll" className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        <CommandPalette />
        <ShortcutsDialog />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export { PanelLeftClose, LiveDot };
