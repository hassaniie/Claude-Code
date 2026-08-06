import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function currency(value: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(value) >= 1000) return `PKR ${compact(value)}`;
  return `PKR ${num(Math.round(value))}`;
}

export function pct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const TIME_S = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const DATETIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const fmtTime = (ts: number) => TIME.format(ts);
export const fmtTimeSec = (ts: number) => TIME_S.format(ts);
export const fmtDate = (ts: number) => DATE.format(ts);
export const fmtDateTime = (ts: number) => DATETIME.format(ts);

/** "2h 14m" — parking durations are read at a glance, never in seconds. */
export function duration(ms: number) {
  if (ms < 0) ms = 0;
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (h < 24) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Relative time for feeds: "just now", "4m ago". */
export function ago(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Download a Blob under `filename` — used by every report export path. */
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
