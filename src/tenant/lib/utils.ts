import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------- numbers */

/** 1234567 -> "1,234,567" */
export function num(value: number, digits = 0) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Compact form for axis labels and dense tiles: 12400 -> "12.4K" */
export function compact(value: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function pct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** NASTP bills in Pakistani rupees. */
export function currency(value: number, opts: { compact?: boolean; symbol?: boolean } = {}) {
  const prefix = opts.symbol === false ? '' : 'PKR ';
  if (opts.compact && Math.abs(value) >= 1000) return `${prefix}${compact(value)}`;
  return `${prefix}${num(Math.round(value))}`;
}

/* --------------------------------------------------------------- energy */

/**
 * Energy figures carry a unit that must stay visually secondary but always
 * attached to its number. These helpers return the number only; the unit is
 * rendered alongside so it can be styled down (see MetricValue / StatCard).
 */
export const UNITS = {
  power: 'kW',
  energy: 'kWh',
  apparent: 'kVA',
  reactive: 'kVAr',
  voltage: 'V',
  current: 'A',
  frequency: 'Hz',
  demand: 'kW',
} as const;

/** Format a kWh/kW value, switching to MWh/MW past 4 digits to stay scannable. */
export function energy(value: number, unit: 'kWh' | 'kW' = 'kWh') {
  if (Math.abs(value) >= 1_000_000) return { value: num(value / 1_000_000, 2), unit: unit === 'kWh' ? 'GWh' : 'GW' };
  if (Math.abs(value) >= 10_000) return { value: num(value / 1000, 2), unit: unit === 'kWh' ? 'MWh' : 'MW' };
  return { value: num(value, value < 100 ? 1 : 0), unit };
}

/* ----------------------------------------------------------------- area */

export type AreaUnit = 'sqft' | 'sqm';
const SQFT_PER_SQM = 10.7639;

export function area(valueSqft: number, unit: AreaUnit = 'sqft') {
  const v = unit === 'sqm' ? valueSqft / SQFT_PER_SQM : valueSqft;
  return `${num(Math.round(v))} ${unit === 'sqm' ? 'm²' : 'ft²'}`;
}

/* ----------------------------------------------------------------- time */

const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
const DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const DATE_YEAR = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const DATETIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export const fmtTime = (ts: number) => TIME.format(ts);
export const fmtDate = (ts: number) => DATE.format(ts);
export const fmtDateFull = (ts: number) => DATE_YEAR.format(ts);
export const fmtDateTime = (ts: number) => DATETIME.format(ts);

/** "2h 14m" — durations are read at a glance, never in seconds. */
export function duration(ms: number) {
  if (ms < 0) ms = 0;
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (h < 24) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Relative time for feeds: "just now", "4m ago", "in 3h". */
export function ago(ts: number, now = Date.now()) {
  const diff = now - ts;
  const future = diff < 0;
  const s = Math.round(Math.abs(diff) / 1000);
  const fmt = (label: string) => (future ? `in ${label}` : `${label} ago`);
  if (s < 10) return future ? 'shortly' : 'just now';
  if (s < 60) return fmt(`${s}s`);
  const m = Math.floor(s / 60);
  if (m < 60) return fmt(`${m}m`);
  const h = Math.floor(m / 60);
  if (h < 24) return fmt(`${h}h`);
  return fmt(`${Math.floor(h / 24)}d`);
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Download a Blob under `filename` — used by every report/invoice export path. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Turn an array of flat records into a CSV blob for the export paths. */
export function toCsv(rows: Array<Record<string, string | number>>): Blob {
  if (!rows.length) return new Blob([''], { type: 'text/csv;charset=utf-8' });
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(','))];
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
}
