/**
 * Chart theme bridge.
 *
 * Recharts wants literal colour strings, but the palette lives in CSS custom
 * properties so light/dark stay in one place. This hook resolves the tokens
 * once per theme change and hands charts plain hex.
 *
 * The categorical order is fixed and validated (see `styles/theme.css`) —
 * always take slots in order, never cycle past slot 6, and never borrow a
 * status hue for a series.
 */

import { useEffect, useState } from 'react';
import { useSession } from '../../store/session';

export interface VizTheme {
  series: string[];
  sequential: string[];
  grid: string;
  axis: string;
  surface: string;
  text: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  vacant: string;
  occupied: string;
  isDark: boolean;
}

const read = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

function resolve(isDark: boolean): VizTheme {
  return {
    series: [
      read('--viz-1', '#3987e5'),
      read('--viz-2', '#d95926'),
      read('--viz-3', '#199e70'),
      read('--viz-4', '#c98500'),
      read('--viz-5', '#d55181'),
      read('--viz-6', '#9085e9'),
    ],
    sequential: [
      read('--seq-1', '#0d366b'),
      read('--seq-2', '#184f95'),
      read('--seq-3', '#256abf'),
      read('--seq-4', '#3987e5'),
      read('--seq-5', '#6da7ec'),
      read('--seq-6', '#9ec5f4'),
      read('--seq-7', '#cde2fb'),
    ],
    grid: read('--viz-grid', '#1b2330'),
    axis: read('--viz-axis', '#63728a'),
    surface: read('--viz-surface', '#0e1219'),
    text: read('--foreground', '#e8eef7'),
    muted: read('--foreground-muted', '#93a2b8'),
    success: read('--success', '#22c55e'),
    warning: read('--warning', '#f59e0b'),
    danger: read('--danger', '#f43f5e'),
    info: read('--info', '#06b6d4'),
    vacant: read('--state-vacant', '#22c55e'),
    occupied: read('--state-occupied', '#ef4444'),
    isDark,
  };
}

export function useVizTheme(): VizTheme {
  const { prefs } = useSession();
  const [theme, setTheme] = useState<VizTheme>(() => resolve(prefs.theme === 'dark'));

  useEffect(() => {
    // One frame after the attribute flips, so computed styles are current.
    const id = requestAnimationFrame(() => setTheme(resolve(prefs.theme === 'dark')));
    return () => cancelAnimationFrame(id);
  }, [prefs.theme]);

  return theme;
}

/** Map 0–1 magnitude onto the sequential ramp (light → dark by intensity). */
export function seqColor(theme: VizTheme, t: number) {
  const ramp = theme.isDark ? theme.sequential : [...theme.sequential].reverse();
  const idx = Math.round(Math.max(0, Math.min(1, t)) * (ramp.length - 1));
  return ramp[idx];
}
