/**
 * Chart library for Tenant Operations.
 *
 * One measure per axis, a recessive grid, thin marks, a hover tooltip by
 * default, a legend whenever two or more series are on screen, and a table view
 * for the cases where colour alone would carry meaning. Colours come from the
 * validated categorical ramp in slot order — assign in order, never cycle past
 * slot 6, never borrow a status or module hue for a series.
 *
 * The theme is resolved from CSS custom properties (so light/dark live in one
 * place) and refreshed one frame after the theme attribute flips.
 */

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Table2, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn, compact, num } from '../lib/utils';
import { useSession } from '../store/session';
import { Button } from './ui/primitives';

/* ------------------------------------------------------------- theme bridge */

export interface VizTheme {
  series: string[];
  sequential: string[];
  grid: string;
  axis: string;
  surface: string;
  warning: string;
  isDark: boolean;
}

const read = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

function resolve(isDark: boolean): VizTheme {
  return {
    series: [read('--viz-1', '#3987e5'), read('--viz-2', '#d95926'), read('--viz-3', '#199e70'), read('--viz-4', '#c98500'), read('--viz-5', '#d55181'), read('--viz-6', '#9085e9')],
    sequential: [read('--seq-1', '#0d366b'), read('--seq-2', '#184f95'), read('--seq-3', '#256abf'), read('--seq-4', '#3987e5'), read('--seq-5', '#6da7ec'), read('--seq-6', '#9ec5f4'), read('--seq-7', '#cde2fb')],
    grid: read('--viz-grid', '#222b3a'),
    axis: read('--viz-axis', '#6b7a91'),
    surface: read('--viz-surface', '#141924'),
    warning: read('--warning', '#f59e0b'),
    isDark,
  };
}

export function useVizTheme(): VizTheme {
  const { prefs } = useSession();
  const [theme, setTheme] = useState<VizTheme>(() => resolve(prefs.theme === 'dark'));
  useEffect(() => {
    const id = requestAnimationFrame(() => setTheme(resolve(prefs.theme === 'dark')));
    return () => cancelAnimationFrame(id);
  }, [prefs.theme]);
  return theme;
}

export function seqColor(theme: VizTheme, t: number) {
  const ramp = theme.isDark ? theme.sequential : [...theme.sequential].reverse();
  const idx = Math.round(Math.max(0, Math.min(1, t)) * (ramp.length - 1));
  return ramp[idx];
}

/* ------------------------------------------------------------------ shared */

const AXIS_STYLE = { fontSize: 10.5, fontFamily: 'var(--font-sans)' } as const;

function ChartTooltip({ active, payload, label, formatter, unit }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string | number }>; label?: string | number; formatter?: (v: number, key: string) => string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pointer-events-none rounded-lg border border-border bg-surface-overlay px-2.5 py-2 shadow-[var(--shadow-lg)]">
      <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-subtle">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[11.5px]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-muted">{p.name}</span>
            <span className="tnum ml-auto pl-3 font-medium text-foreground">
              {formatter ? formatter(p.value ?? 0, String(p.dataKey)) : num(p.value ?? 0)}
              {unit ? ` ${unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendRow({ series, theme }: { series: SeriesSpec[]; theme: VizTheme }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-[3px]" style={{ background: s.color ?? theme.series[i % theme.series.length] }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function DataTableView({ data, categoryKey, series }: { data: any[]; categoryKey: string; series: SeriesSpec[] }) {
  return (
    <div className="max-h-[260px] overflow-auto rounded-lg border border-border">
      <table className="w-full text-left text-[11.5px]">
        <thead className="sticky top-0 bg-surface-inset">
          <tr>
            <th className="px-2.5 py-1.5 font-semibold uppercase tracking-[0.08em] text-subtle">Period</th>
            {series.map((s) => (
              <th key={s.key} className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border-subtle">
              <td className="px-2.5 py-1.5 text-muted">{row[categoryKey]}</td>
              {series.map((s) => (
                <td key={s.key} className="tnum px-2.5 py-1.5 text-right text-foreground">{num(Number(row[s.key] ?? 0))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartFrame({ children, data, categoryKey, series, height = 220, className, toolbar }: { children: ReactNode; data?: any[]; categoryKey?: string; series?: SeriesSpec[]; height?: number; className?: string; toolbar?: ReactNode }) {
  const theme = useVizTheme();
  const [asTable, setAsTable] = useState(false);
  const canTable = Boolean(data && categoryKey && series);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(series || toolbar || canTable) && (
        <div className="flex items-start justify-between gap-3">
          {series ? <LegendRow series={series} theme={theme} /> : <span />}
          <div className="flex shrink-0 items-center gap-1">
            {toolbar}
            {canTable && (
              <Button variant="ghost" size="icon-sm" onClick={() => setAsTable((v) => !v)} aria-label={asTable ? 'Show chart' : 'Show data table'} title={asTable ? 'Show chart' : 'Show data table'}>
                {asTable ? <TrendingUp className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      )}
      {asTable && canTable ? <DataTableView data={data!} categoryKey={categoryKey!} series={series!} /> : <div style={{ height }}>{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ Area / line */

export interface SeriesSpec {
  key: string;
  label: string;
  color?: string;
}

export function TrendChart({
  data,
  categoryKey = 'label',
  series,
  height = 220,
  yFormatter = compact,
  valueFormatter,
  unit,
  referenceValue,
  referenceLabel,
  fill = true,
  stacked,
}: {
  data: any[];
  categoryKey?: string;
  series: SeriesSpec[];
  height?: number;
  yFormatter?: (v: number) => string;
  valueFormatter?: (v: number, key: string) => string;
  unit?: string;
  referenceValue?: number;
  referenceLabel?: string;
  fill?: boolean;
  stacked?: boolean;
}) {
  const theme = useVizTheme();
  const colors = series.map((s, i) => s.color ?? theme.series[i % theme.series.length]);
  return (
    <ChartFrame data={data} categoryKey={categoryKey} series={series} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -16 }}>
          <defs>
            {colors.map((c, i) => (
              <linearGradient key={i} id={`tg-${i}-${c.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.26} />
                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey={categoryKey} tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} minTickGap={18} />
          <YAxis tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} width={46} tickFormatter={yFormatter} />
          <Tooltip cursor={{ stroke: theme.axis, strokeWidth: 1, strokeDasharray: '3 3' }} content={<ChartTooltip formatter={valueFormatter} unit={unit} />} />
          {referenceValue !== undefined && (
            <ReferenceLine y={referenceValue} stroke={theme.warning} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: referenceLabel, position: 'insideTopRight', fill: theme.warning, fontSize: 10 }} />
          )}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'a' : undefined}
              stroke={colors[i]}
              strokeWidth={2}
              fill={fill ? `url(#tg-${i}-${colors[i].replace('#', '')})` : 'transparent'}
              activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function MultiLineChart({ data, categoryKey = 'label', series, height = 220, yFormatter = compact, valueFormatter, unit }: { data: any[]; categoryKey?: string; series: SeriesSpec[]; height?: number; yFormatter?: (v: number) => string; valueFormatter?: (v: number, key: string) => string; unit?: string }) {
  const theme = useVizTheme();
  return (
    <ChartFrame data={data} categoryKey={categoryKey} series={series} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey={categoryKey} tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} width={46} tickFormatter={yFormatter} />
          <Tooltip cursor={{ stroke: theme.axis, strokeWidth: 1, strokeDasharray: '3 3' }} content={<ChartTooltip formatter={valueFormatter} unit={unit} />} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? theme.series[i % theme.series.length]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* --------------------------------------------------------------------- Bar */

export function BarSeriesChart({ data, categoryKey = 'label', series, height = 220, stacked, horizontal, yFormatter = compact, valueFormatter, unit }: { data: any[]; categoryKey?: string; series: SeriesSpec[]; height?: number; stacked?: boolean; horizontal?: boolean; yFormatter?: (v: number) => string; valueFormatter?: (v: number, key: string) => string; unit?: string }) {
  const theme = useVizTheme();
  return (
    <ChartFrame data={data} categoryKey={categoryKey} series={series} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 10, bottom: 0, left: horizontal ? 8 : -16 }} barGap={2} barCategoryGap={horizontal ? '22%' : '28%'}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} tickFormatter={yFormatter} />
              <YAxis type="category" dataKey={categoryKey} tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={categoryKey} tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} minTickGap={12} />
              <YAxis tick={{ fill: theme.axis, ...AXIS_STYLE }} axisLine={false} tickLine={false} width={46} tickFormatter={yFormatter} />
            </>
          )}
          <Tooltip cursor={{ fill: theme.grid, opacity: 0.35 }} content={<ChartTooltip formatter={valueFormatter} unit={unit} />} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId={stacked ? 'a' : undefined} fill={s.color ?? theme.series[i % theme.series.length]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------- Donut */

export function DonutChart({ data, height = 200, centreLabel, centreValue }: { data: Array<{ label: string; value: number; color?: string }>; height?: number; centreLabel?: string; centreValue?: string }) {
  const theme = useVizTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="94%" paddingAngle={2} stroke={theme.surface} strokeWidth={2} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color ?? theme.series[i % theme.series.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatter={(v) => `${num(v)} (${total ? ((v / total) * 100).toFixed(1) : '0'}%)`} />} />
          </PieChart>
        </ResponsiveContainer>
        {(centreValue || centreLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-[20px] font-semibold tracking-[-0.02em] text-foreground">{centreValue}</span>
            <span className="text-[10px] uppercase tracking-[0.1em] text-subtle">{centreLabel}</span>
          </div>
        )}
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: d.color ?? theme.series[i % theme.series.length] }} />
            <span className="truncate text-muted">{d.label}</span>
            <span className="tnum ml-auto font-medium text-foreground">{num(d.value)}</span>
            <span className="tnum w-11 text-right text-subtle">{total ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- Sparkline */

export function Sparkline({ data, color, height = 34, className }: { data: number[]; color?: string; height?: number; className?: string }) {
  const theme = useVizTheme();
  const stroke = color ?? theme.series[0];
  const path = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = 100 / (data.length - 1);
    const pts = data.map((v, i) => [i * step, 100 - ((v - min) / range) * 100] as const);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    return { line, area: `${line} L100,100 L0,100 Z` };
  }, [data]);
  const id = `spark-${stroke.replace('#', '')}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" height={height} className={cn('w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${id})`} />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
