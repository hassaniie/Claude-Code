/**
 * Session state for the whole ecosystem: which experience is on screen (the
 * NASTP Admin control plane, or a specific tenant's portal), the admin
 * identity, theme and workspace preferences, and toasts.
 *
 * The `experience` + `tenantId` pair is what makes this feel like one product
 * rather than two: an admin can drop into any tenant's portal to see exactly
 * what that tenant sees, and the portal's data layer stays scoped to that id.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { simulation } from '../data/live';
import { transport } from '../data/api';

export type Theme = 'dark' | 'light';
export type Density = 'comfortable' | 'compact';
export type Experience = 'admin' | 'portal';
export type AreaUnitPref = 'sqft' | 'sqm';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'warning' | 'critical' | 'info';
  action?: { label: string; onClick: () => void };
  duration: number;
}

export interface Admin {
  id: string;
  name: string;
  role: string;
  org: string;
}

export interface Preferences {
  theme: Theme;
  density: Density;
  areaUnit: AreaUnitPref;
  liveUpdates: boolean;
  tickMs: number;
  /** Simulated API failure rate, 0–1 — surfaced in Settings → Diagnostics. */
  failureRate: number;
  latencyProfile: 'fast' | 'normal' | 'slow';
}

interface SessionValue {
  admin: Admin;
  experience: Experience;
  /** Active tenant for the portal experience. */
  tenantId: string;
  setTenantId: (id: string) => void;
  enterPortal: (tenantId: string) => void;
  enterAdmin: () => void;
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  toggleTheme: () => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismissToast: (id: string) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const SessionContext = createContext<SessionValue | null>(null);
const STORAGE_KEY = 'nastp-tenant-ops.prefs';

const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  density: 'comfortable',
  areaUnit: 'sqft',
  liveUpdates: true,
  tickMs: 4000,
  failureRate: 0,
  latencyProfile: 'normal',
};

const LATENCY: Record<Preferences['latencyProfile'], [number, number]> = {
  fast: [60, 160],
  normal: [160, 480],
  slow: [800, 2000],
};

function loadPrefs(): Preferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** The first active tenant — the portal's default identity. */
const DEFAULT_TENANT_ID = 't-orbit';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(loadPrefs);
  const [experience, setExperience] = useState<Experience>('admin');
  const [tenantId, setTenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const admin = useMemo<Admin>(
    () => ({ id: 'ADM-01', name: 'A. Raza', role: 'NASTP Administrator', org: 'NASTP Operations' }),
    [],
  );

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — preferences stay session-scoped */
      }
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => setPrefs({ theme: loadPrefs().theme === 'dark' ? 'light' : 'dark' }), [setPrefs]);

  const enterPortal = useCallback((id: string) => {
    setTenantId(id);
    setExperience('portal');
  }, []);
  const enterAdmin = useCallback(() => setExperience('admin'), []);

  /* --- side effects: theme, transport, simulation cadence ---------------- */

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.theme, prefs.density]);

  useEffect(() => {
    transport.failureRate = prefs.failureRate;
    const [min, max] = LATENCY[prefs.latencyProfile];
    transport.minLatency = min;
    transport.maxLatency = max;
  }, [prefs.failureRate, prefs.latencyProfile]);

  useEffect(() => {
    simulation.stop();
    if (prefs.liveUpdates) simulation.start(prefs.tickMs);
    return () => simulation.stop();
  }, [prefs.liveUpdates, prefs.tickMs]);

  /* --- toasts ------------------------------------------------------------ */

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback<SessionValue['toast']>(
    (input) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = input.duration ?? (input.variant === 'critical' ? 7000 : 4200);
      setToasts((prev) => [{ ...input, id, duration }, ...prev].slice(0, 4));
      timers.current.set(id, setTimeout(() => dismissToast(id), duration));
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  /* --- command palette shortcut ------------------------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      admin, experience, tenantId, setTenantId, enterPortal, enterAdmin,
      prefs, setPrefs, toggleTheme, toasts, toast, dismissToast, paletteOpen, setPaletteOpen,
    }),
    [admin, experience, tenantId, enterPortal, enterAdmin, prefs, setPrefs, toggleTheme, toasts, toast, dismissToast, paletteOpen],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export const useToast = () => useSession().toast;
export const usePrefs = () => useSession().prefs;
