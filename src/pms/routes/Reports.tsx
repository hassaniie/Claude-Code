/**
 * Reports.
 *
 * A catalogue of the thirteen standard reports, a date range, and a preview
 * that is generated through the same async path as the export — so what the
 * operator sees on screen is exactly what lands in the PDF or spreadsheet.
 */

import {
  BarChart3, CalendarRange, Car, Cctv, Clock, CreditCard, Download, FileSpreadsheet,
  FileText, Layers, LogIn, LogOut, ShieldCheck, Timer, TrendingUp, Users, UserSquare,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, currency, downloadBlob, duration, fmtDate, fmtDateTime, num } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader, SectionHeader } from '../components/ui/card';
import { Badge, Button, Separator, Skeleton } from '../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/form';
import { DataTable, EmptyState, ErrorState, type Column } from '../components/ui/data';
import { useAsync } from '../hooks/useAsync';
import { useWorld } from '../store/live';
import { useSession } from '../store/session';
import type { World } from '../data/world';

type ReportId =
  | 'employee_inout' | 'visitor_history' | 'occupancy' | 'revenue' | 'payments'
  | 'entry_logs' | 'exit_logs' | 'parking_duration' | 'camera_events'
  | 'barrier_events' | 'floor_utilisation' | 'peak_hours' | 'monthly_trends';

interface ReportDef {
  id: ReportId;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'People' | 'Operations' | 'Finance' | 'Infrastructure' | 'Trends';
}

const REPORTS: ReportDef[] = [
  { id: 'employee_inout', name: 'Employee In/Out', description: 'Every employee entry and exit with dwell time', icon: Users, category: 'People' },
  { id: 'visitor_history', name: 'Visitor History', description: 'Visitor registrations, hosts, charges and settlement', icon: UserSquare, category: 'People' },
  { id: 'occupancy', name: 'Occupancy', description: 'Bay occupancy sampled across the reporting window', icon: Car, category: 'Operations' },
  { id: 'revenue', name: 'Revenue', description: 'Visitor, subscription and penalty revenue by period', icon: TrendingUp, category: 'Finance' },
  { id: 'payments', name: 'Payments', description: 'Individual transactions with terminal and method', icon: CreditCard, category: 'Finance' },
  { id: 'entry_logs', name: 'Entry Logs', description: 'All inbound movements with ANPR confidence', icon: LogIn, category: 'Operations' },
  { id: 'exit_logs', name: 'Exit Logs', description: 'All outbound movements with settlement status', icon: LogOut, category: 'Operations' },
  { id: 'parking_duration', name: 'Parking Duration', description: 'Dwell-time distribution by vehicle class', icon: Timer, category: 'Operations' },
  { id: 'camera_events', name: 'Camera Events', description: 'Offline, restored and degraded camera events', icon: Cctv, category: 'Infrastructure' },
  { id: 'barrier_events', name: 'Barrier Events', description: 'Cycles, overrides and emergency releases', icon: ShieldCheck, category: 'Infrastructure' },
  { id: 'floor_utilisation', name: 'Floor Utilisation', description: 'Per-level utilisation against capacity', icon: Layers, category: 'Operations' },
  { id: 'peak_hours', name: 'Peak Hours', description: 'Busiest hours by entries, exits and occupancy', icon: Clock, category: 'Trends' },
  { id: 'monthly_trends', name: 'Monthly Trends', description: 'Twelve-month occupancy and revenue movement', icon: BarChart3, category: 'Trends' },
];

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last quarter' },
  { value: '12m', label: 'Last 12 months' },
] as const;

type RangeId = (typeof RANGES)[number]['value'];

type Row = Record<string, string | number>;

/** Build the report rows from live plaza state. A real API returns these. */
function buildReport(world: World, id: ReportId, range: RangeId): { rows: Row[]; columns: string[] } {
  const now = Date.now();
  const windowMs =
    range === 'today' ? 86_400_000 : range === '7d' ? 7 * 86_400_000
    : range === '30d' ? 30 * 86_400_000 : range === '90d' ? 90 * 86_400_000 : 365 * 86_400_000;
  const since = now - windowMs;

  switch (id) {
    case 'employee_inout': {
      const rows = world.employees
        .filter((e) => world.vehicles[e.plate])
        .slice(0, 300)
        .map((e) => {
          const v = world.vehicles[e.plate];
          return {
            'Employee ID': e.id,
            Name: e.name,
            Department: e.department,
            Plate: e.plate,
            Status: v.inside ? 'Inside' : 'Outside',
            Bay: v.spaceCode ?? '—',
            Entry: v.entryTime ? fmtDateTime(v.entryTime) : '—',
            Exit: v.exitTime ? fmtDateTime(v.exitTime) : v.inside ? 'In progress' : '—',
            Duration: v.entryTime ? duration((v.exitTime ?? now) - v.entryTime) : '—',
          };
        });
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'visitor_history': {
      const rows = world.visitors
        .filter((v) => v.entryTime >= since)
        .slice(0, 400)
        .map((v) => ({
          Ticket: v.ticket,
          Plate: v.plate,
          Visitor: v.name,
          Company: v.company,
          Host: v.host,
          Purpose: v.purpose,
          Entry: fmtDateTime(v.entryTime),
          Exit: v.exitTime ? fmtDateTime(v.exitTime) : 'Inside',
          Duration: duration((v.exitTime ?? now) - v.entryTime),
          Charges: v.charges,
          Payment: v.paymentStatus,
        }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'occupancy': {
      const src = range === 'today' ? world.history.hourly : range === '12m' ? world.history.monthly : world.history.daily;
      const capacity = world.spaceIds.length;
      const rows = src.map((p) => ({
        Period: p.label,
        Occupied: p.occupancy,
        Capacity: capacity,
        'Occupancy %': Number(((p.occupancy / capacity) * 100).toFixed(1)),
        Entries: p.entries,
        Exits: p.exits,
      }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'revenue': {
      const src = range === 'today' ? world.history.hourly : range === '12m' ? world.history.monthly : world.history.daily;
      const rows = src.map((p) => ({
        Period: p.label,
        'Visitor revenue': Math.round(p.revenue * 0.56),
        Subscriptions: Math.round(p.revenue * 0.4),
        Penalties: Math.round(p.revenue * 0.04),
        Total: p.revenue,
        Transactions: Math.round(p.entries * 0.42),
      }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'payments': {
      const rows = world.events
        .filter((e) => e.type === 'payment_completed')
        .slice(0, 300)
        .map((e, i) => ({
          Reference: `TXN-${String(90000 + i)}`,
          Time: fmtDateTime(e.ts),
          Plate: e.plate ?? '—',
          Amount: e.amount ?? 0,
          Method: i % 3 === 0 ? 'Card' : i % 3 === 1 ? 'Cash' : 'Wallet',
          Terminal: `POS-${(i % 3) + 1}`,
          Status: 'Settled',
        }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'entry_logs':
    case 'exit_logs': {
      const type = id === 'entry_logs' ? 'vehicle_entered' : 'vehicle_exited';
      const rows = world.events
        .filter((e) => e.type === type)
        .slice(0, 300)
        .map((e) => ({
          Time: fmtDateTime(e.ts),
          Plate: e.plate ?? '—',
          Detail: e.detail,
          Floor: e.floorId ?? '—',
          Bay: e.spaceCode ?? '—',
        }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'parking_duration': {
      const buckets = [
        ['0–1 h', 0, 1], ['1–2 h', 1, 2], ['2–4 h', 2, 4], ['4–6 h', 4, 6],
        ['6–8 h', 6, 8], ['8–12 h', 8, 12], ['12 h+', 12, 999],
      ] as const;
      const occupied = world.spaceIds.map((sid) => world.spaces[sid]).filter((s) => s.status === 'occupied');
      const rows = buckets.map(([label, lo, hi]) => {
        const inBucket = occupied.filter((s) => {
          const h = (now - s.since) / 3_600_000;
          return h >= lo && h < hi;
        });
        return {
          Bucket: label,
          Vehicles: inBucket.length,
          Cars: inBucket.filter((s) => s.vehicleClass === 'car').length,
          Motorcycles: inBucket.filter((s) => s.vehicleClass === 'motorcycle').length,
          'Share %': Number(((inBucket.length / (occupied.length || 1)) * 100).toFixed(1)),
        };
      });
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'camera_events': {
      const rows = world.events
        .filter((e) => e.type === 'camera_offline' || e.type === 'camera_restored')
        .slice(0, 200)
        .map((e) => ({
          Time: fmtDateTime(e.ts),
          Event: e.title,
          Camera: e.cameraId ?? '—',
          Floor: e.floorId ?? '—',
          Detail: e.detail,
        }));
      return { rows, columns: rows.length ? Object.keys(rows[0]) : ['Time', 'Event', 'Camera', 'Floor', 'Detail'] };
    }

    case 'barrier_events': {
      const rows = world.events
        .filter((e) => ['barrier_opened', 'barrier_closed', 'emergency_mode', 'operator_action'].includes(e.type))
        .slice(0, 200)
        .map((e) => ({
          Time: fmtDateTime(e.ts),
          Event: e.title,
          Detail: e.detail,
          Operator: e.actor ?? 'System (AUTO)',
        }));
      return { rows, columns: rows.length ? Object.keys(rows[0]) : ['Time', 'Event', 'Detail', 'Operator'] };
    }

    case 'floor_utilisation': {
      const rows = world.floors.map((f) => {
        const ids = world.spaceIdsByFloor[f.id];
        let occ = 0;
        let motoOcc = 0;
        for (const sid of ids) {
          const s = world.spaces[sid];
          if (s.status !== 'occupied') continue;
          occ++;
          if (s.vehicleClass === 'motorcycle') motoOcc++;
        }
        return {
          Floor: f.name,
          Capacity: ids.length,
          'Car bays': f.carCapacity,
          'Motorcycle bays': f.motorcycleCapacity,
          Occupied: occ,
          'Motorcycles occupied': motoOcc,
          Available: ids.length - occ,
          'Utilisation %': Number(((occ / ids.length) * 100).toFixed(1)),
        };
      });
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'peak_hours': {
      const rows = [...world.history.hourly]
        .sort((a, b) => b.occupancy - a.occupancy)
        .map((p, i) => ({
          Rank: i + 1,
          Hour: p.label,
          'Peak occupancy': p.occupancy,
          Entries: p.entries,
          Exits: p.exits,
          Revenue: p.revenue,
        }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }

    case 'monthly_trends': {
      const rows = world.history.monthly.map((p, i, arr) => ({
        Month: p.label,
        'Avg occupancy': p.occupancy,
        Entries: p.entries,
        Exits: p.exits,
        Revenue: p.revenue,
        'MoM %': i === 0 ? 0 : Number((((p.revenue - arr[i - 1].revenue) / arr[i - 1].revenue) * 100).toFixed(1)),
      }));
      return { rows, columns: Object.keys(rows[0] ?? {}) };
    }
  }
}

export default function Reports() {
  const world = useWorld();
  const { toast } = useSession();
  const [selected, setSelected] = useState<ReportId>('occupancy');
  const [range, setRange] = useState<RangeId>('30d');
  const [nonce, setNonce] = useState(0);

  const def = REPORTS.find((r) => r.id === selected)!;

  // Generation goes through the async path so it carries real loading/error UI.
  const report = useAsync(
    () =>
      new Promise<{ rows: Row[]; columns: string[] }>((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(buildReport(world, selected, range));
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Report generation failed'));
          }
        }, 420 + Math.random() * 500);
      }),
    { deps: [selected, range, nonce], retries: 1 },
  );

  const columns: Column<Row>[] = useMemo(
    () =>
      (report.data?.columns ?? []).map((key) => ({
        key,
        header: key,
        align: typeof report.data?.rows[0]?.[key] === 'number' ? ('right' as const) : ('left' as const),
        cell: (row: Row) => {
          const v = row[key];
          if (typeof v === 'number') {
            const money = /revenue|amount|charges|penalt|subscription|total/i.test(key);
            // Percentages keep a fixed decimal so the column stays aligned even
            // when a value lands on a whole number.
            const percent = key.includes('%');
            return (
              <span className="tnum">
                {money ? currency(v) : percent ? v.toFixed(1) : num(v, Number.isInteger(v) ? 0 : 1)}
              </span>
            );
          }
          return <span className={/plate|ticket|reference/i.test(key) ? 'font-mono' : ''}>{v}</span>;
        },
        sortValue: (row: Row) => row[key],
      })),
    [report.data],
  );

  const exportFile = (format: 'csv' | 'pdf') => {
    const data = report.data;
    if (!data?.rows.length) return;

    if (format === 'csv') {
      const escape = (v: string | number) => {
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        data.columns.join(','),
        ...data.rows.map((r) => data.columns.map((c) => escape(r[c] ?? '')).join(',')),
      ].join('\n');
      downloadBlob(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        `${def.id}-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast({
        title: 'Excel export ready',
        description: `${data.rows.length} rows · opens in Excel, Sheets or Numbers`,
        variant: 'success',
      });
    } else {
      // Print-to-PDF keeps the export honest: the browser renders exactly what
      // is on screen, with no second layout to drift out of sync.
      window.print();
      toast({
        title: 'PDF export',
        description: 'Choose "Save as PDF" in the print dialog to file this report.',
        variant: 'info',
      });
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ReportDef[]>();
    for (const r of REPORTS) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return [...map.entries()];
  }, []);

  return (
    <Page className="h-full min-h-0">
      <div className="grid min-h-0 flex-1 gap-3.5 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* --------------------------------------------------- catalogue */}
        <Card className="min-h-0 overflow-hidden">
          <CardHeader title="Report catalogue" compact subtitle={`${REPORTS.length} standard reports`} />
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {grouped.map(([category, items]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="px-2 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                  {category}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelected(r.id)}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                          selected === r.id ? 'bg-primary-muted' : 'hover:bg-surface-raised',
                        )}
                      >
                        <r.icon
                          className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', selected === r.id ? 'text-primary' : 'text-subtle')}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium text-foreground">{r.name}</span>
                          <span className="block truncate text-[10.5px] text-subtle">{r.description}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* ----------------------------------------------------- preview */}
        <Card className="min-h-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-subtle">
                <def.icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[13.5px] font-semibold text-foreground">{def.name}</h3>
                <p className="text-[11.5px] text-subtle">{def.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={range} onValueChange={(v) => setRange(v as RangeId)}>
                <SelectTrigger className="w-[150px]">
                  <CalendarRange className="h-3.5 w-3.5 text-subtle" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="secondary" size="sm" onClick={() => setNonce((n) => n + 1)} loading={report.status === 'loading'}>
                Regenerate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!report.data?.rows.length}
                onClick={() => exportFile('csv')}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </Button>
              <Button variant="primary" size="sm" disabled={!report.data?.rows.length} onClick={() => exportFile('pdf')}>
                <FileText className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border-subtle bg-surface-inset px-4 py-2 text-[11px] text-subtle">
            <span>
              Site <span className="text-foreground">Nexus Corporate Plaza</span>
            </span>
            <span>
              Window{' '}
              <span className="tnum text-foreground">
                {fmtDate(Date.now() - (range === 'today' ? 86_400_000 : range === '7d' ? 7 * 86_400_000 : range === '30d' ? 30 * 86_400_000 : range === '90d' ? 90 * 86_400_000 : 365 * 86_400_000))}{' '}
                – {fmtDate(Date.now())}
              </span>
            </span>
            <span>
              Rows <span className="tnum text-foreground">{num(report.data?.rows.length ?? 0)}</span>
            </span>
            {report.fetchedAt && (
              <span>
                Generated <span className="tnum text-foreground">{fmtDateTime(report.fetchedAt)}</span>
              </span>
            )}
            <Badge tone="outline" size="sm" className="ml-auto">
              {def.category}
            </Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {report.status === 'loading' ? (
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-6 w-full" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : report.status === 'error' ? (
              <ErrorState message={report.error ?? ''} onRetry={report.refetch} className="m-4" />
            ) : !report.data?.rows.length ? (
              <EmptyState
                title="No rows in this window"
                description="Widen the reporting range, or pick a different report."
                action={
                  <Button size="sm" variant="secondary" onClick={() => setRange('12m')}>
                    Extend to 12 months
                  </Button>
                }
              />
            ) : (
              <DataTable
                rows={report.data.rows}
                columns={columns}
                rowKey={(_, i) => String(i)}
                pageSize={40}
                dense
                className="h-full"
              />
            )}
          </div>
        </Card>
      </div>

      <SectionHeader
        title="Scheduled delivery"
        description="Standing reports are emailed to the distribution list at the configured cadence"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { name: 'Daily Operations Summary', when: 'Every day at 07:00', to: 'facilities@nexus-corp.com', formats: 'PDF' },
          { name: 'Weekly Revenue', when: 'Mondays at 08:00', to: 'finance@nexus-corp.com', formats: 'Excel + PDF' },
          { name: 'Monthly Utilisation', when: '1st of the month', to: 'bms-leadership@nexus-corp.com', formats: 'PDF' },
          { name: 'Camera Health Digest', when: 'Every day at 22:00', to: 'security-ops@nexus-corp.com', formats: 'Excel' },
        ].map((s) => (
          <Card key={s.name} className="gap-2 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12.5px] font-medium text-foreground">{s.name}</p>
              <Badge tone="success" size="sm">
                Active
              </Badge>
            </div>
            <Separator />
            <p className="text-[11px] text-subtle">{s.when}</p>
            <p className="truncate text-[11px] text-muted">{s.to}</p>
            <div className="flex items-center justify-between">
              <Badge tone="outline" size="sm">
                {s.formats}
              </Badge>
              <Button variant="ghost" size="xs">
                <Download className="h-3 w-3" />
                Run now
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
