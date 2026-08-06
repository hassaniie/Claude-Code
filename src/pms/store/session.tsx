/**
 * Session state: who is on shift, theme, toasts, command palette, and the
 * transport preferences that let an operator prove the UI's error handling.
 *
 * Deliberately separate from plaza state — this survives a lost API link.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { simulation } from '../data/world';
import { transport } from '../data/api';

export type Theme = 'dark' | 'light';
export type Density = 'comfortable' | 'compact';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  action?: { label: string; onClick: () => void };
  duration: number;
}

export interface Operator {
  id: string;
  name: string;
  role: 'Operator' | 'Supervisor' | 'Administrator';
  shift: string;
  site: string;
}

export interface Preferences {
  theme: Theme;
  density: Density;
  liveUpdates: boolean;
  tickMs: number;
  soundAlerts: boolean;
  reduceMotion: boolean;
  /** Simulated API failure rate, 0–1. Surfaced in Settings → Diagnostics. */
  failureRate: number;
  latencyProfile: 'fast' | 'normal' | 'slow';
}

interface SessionValue {
  operator: Operator;
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  toggleTheme: () => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismissToast: (id: string) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** Global "help" sheet, bound to `?`. */
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const STORAGE_KEY = 'nexus-pms.prefs';

const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  density: 'comfortable',
  liveUpdates: true,
  tickMs: 2200,
  soundAlerts: false,
  reduceMotion: false,
  failureRate: 0,
  latencyProfile: 'normal',
};

const LATENCY: Record<Preferences['latencyProfile'], [number, number]> = {
  fast: [60, 160],
  normal: [180, 520],
  slow: [900, 2200],
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(loadPrefs);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const operator = useMemo<Operator>(
    () => ({
      id: 'OP-114',
      name: 'S. Malik',
      role: 'Supervisor',
      shift: 'Shift B · 14:00–22:00',
      site: 'Nexus Corporate Plaza',
    }),
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

  const toggleTheme = useCallback(
    () => setPrefs({ theme: loadPrefs().theme === 'dark' ? 'light' : 'dark' }),
    [setPrefs],
  );

  /* --- side effects: theme, motion, transport, simulation cadence --------- */

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.density = prefs.density;
    document.documentElement.style.setProperty(
      '--motion-scale',
      prefs.reduceMotion ? '0' : '1',
    );
  }, [prefs.theme, prefs.density, prefs.reduceMotion]);

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

  /* --- toasts ------------------------------------------------------------- */

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback<SessionValue['toast']>(
    (input) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = input.duration ?? (input.variant === 'danger' ? 7000 : 4200);
      setToasts((prev) => [{ ...input, id, duration }, ...prev].slice(0, 4));
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), duration),
      );
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  /* --- global shortcuts ---------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing) return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      }
      if (e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      operator, prefs, setPrefs, toggleTheme, toasts, toast, dismissToast,
      paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen,
    }),
    [operator, prefs, setPrefs, toggleTheme, toasts, toast, dismissToast, paletteOpen, shortcutsOpen],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export const useToast = () => useSession().toast;
