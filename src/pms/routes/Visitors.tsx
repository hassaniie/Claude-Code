/**
 * Visitors.
 *
 * The register of everyone who is not an employee: who is on site now, who
 * has overstayed, and the full visit history with charges. Registration is the
 * primary action and stays in the toolbar rather than behind a menu.
 */

import {
  Building2, Clock, CreditCard, IdCard, Phone, Ticket, TriangleAlert, UserPlus,
  UserSquare, Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, currency, duration, fmtDateTime, num } from '../lib/utils';
import { Page, Toolbar } from '../components/ui/page';
import { Card } from '../components/ui/card';
import { Badge, Button, Separator, StatusPill } from '../components/ui/primitives';
import { SearchInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/form';
import { DataTable, DefList, type Column } from '../components/ui/data';
import { SidePanel, SidePanelContent, SidePanelHeader } from '../components/ui/overlay';
import { StatTile, PlateTag } from '../components/pms/atoms';
import { CameraFeed } from '../components/pms/CameraFeed';
import { Timeline } from '../components/pms/feed';
import { VisitorRegistrationDialog, estimateCharge } from '../components/pms/VisitorRegistration';
import { parkingApi } from '../data/api';
import { useAsync, useDebounced } from '../hooks/useAsync';
import type { Visitor } from '../data/types';

type StatusFilter = 'all' | 'inside' | 'overstay' | 'departed';

export default function Visitors() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Visitor | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const debounced = useDebounced(query);

  const visitors = useAsync(() => parkingApi.getVisitors(debounced), {
    deps: [debounced],
    refreshMs: 15_000,
    retries: 2,
  });

  const rows = useMemo(() => {
    const list = visitors.data ?? [];
    return status === 'all' ? list : list.filter((v) => v.status === status);
  }, [visitors.data, status]);

  const stats = useMemo(() => {
    const list = visitors.data ?? [];
    return {
      inside: list.filter((v) => v.status === 'inside').length,
      overstay: list.filter((v) => v.status === 'overstay').length,
      today: list.filter((v) => v.entryTime > Date.now() - 86_400_000).length,
      revenue: list.filter((v) => v.paymentStatus === 'paid').reduce((s, v) => s + v.charges, 0),
      unpaid: list.filter((v) => v.paymentStatus === 'unpaid' && v.exitTime).length,
    };
  }, [visitors.data]);

  const columns: Column<Visitor>[] = [
    {
      key: 'ticket', header: 'Ticket', width: '96px',
      cell: (v) => <span className="font-mono text-[12px] text-foreground">{v.ticket}</span>,
      sortValue: (v) => v.ticket,
    },
    {
      key: 'plate', header: 'Plate', width: '116px',
      cell: (v) => <PlateTag plate={v.plate} size="sm" />,
      sortValue: (v) => v.plate,
    },
    {
      key: 'name', header: 'Visitor',
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-foreground">{v.name}</p>
          <p className="truncate text-[10.5px] text-subtle">{v.company}</p>
        </div>
      ),
      sortValue: (v) => v.name,
    },
    {
      key: 'host', header: 'Host', hideBelow: 'lg',
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate text-[12px]">{v.host}</p>
          <p className="truncate text-[10.5px] text-subtle">{v.hostDepartment}</p>
        </div>
      ),
      sortValue: (v) => v.host,
    },
    {
      key: 'purpose', header: 'Purpose', hideBelow: 'xl',
      cell: (v) => v.purpose,
      sortValue: (v) => v.purpose,
    },
    {
      key: 'entry', header: 'Entry', width: '128px', hideBelow: 'md',
      cell: (v) => <span className="tnum">{fmtDateTime(v.entryTime)}</span>,
      sortValue: (v) => v.entryTime,
    },
    {
      key: 'duration', header: 'Duration', width: '96px', align: 'right',
      cell: (v) => (
        <span className={cn('tnum', v.status === 'overstay' && 'text-warning')}>
          {duration((v.exitTime ?? Date.now()) - v.entryTime)}
        </span>
      ),
      sortValue: (v) => (v.exitTime ?? Date.now()) - v.entryTime,
    },
    {
      key: 'charges', header: 'Charges', width: '104px', align: 'right',
      cell: (v) => (
        <span className="tnum">
          {v.charges ? currency(v.charges) : <span className="text-subtle">pending</span>}
        </span>
      ),
      sortValue: (v) => v.charges,
    },
    {
      key: 'status', header: 'Status', width: '104px',
      cell: (v) => (
        <Badge tone={v.status === 'inside' ? 'success' : v.status === 'overstay' ? 'warning' : 'neutral'} size="sm">
          {v.status}
        </Badge>
      ),
      sortValue: (v) => v.status,
    },
  ];

  return (
    <Page className="h-full min-h-0">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <StatTile label="Visitors Inside" value={num(stats.inside)} icon={Users} tone="primary" />
        <StatTile
          label="Overstaying"
          value={num(stats.overstay)}
          icon={TriangleAlert}
          tone={stats.overstay ? 'warning' : 'neutral'}
          caption="beyond 8 hours"
        />
        <StatTile label="Registered (24h)" value={num(stats.today)} icon={UserPlus} tone="info" />
        <StatTile label="Visitor Revenue" value={currency(stats.revenue, { compact: true })} icon={CreditCard} tone="success" />
        <StatTile
          label="Unsettled"
          value={num(stats.unpaid)}
          icon={Ticket}
          tone={stats.unpaid ? 'danger' : 'neutral'}
          caption="departed without payment"
        />
      </div>

      <Toolbar className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Name, plate, company or ticket…"
          size="sm"
          className="w-[260px]"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visitors</SelectItem>
            <SelectItem value="inside">Currently inside</SelectItem>
            <SelectItem value="overstay">Overstaying</SelectItem>
            <SelectItem value="departed">Departed</SelectItem>
          </SelectContent>
        </Select>

        <StatusPill tone="neutral">{num(rows.length)} records</StatusPill>

        <div className="ml-auto">
          <Button variant="primary" size="sm" onClick={() => setRegisterOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Register visitor
          </Button>
        </div>
      </Toolbar>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(v) => v.id}
          onRowClick={setSelected}
          selectedKey={selected?.id}
          loading={visitors.status === 'loading'}
          error={visitors.status === 'error' ? visitors.error : undefined}
          onRetry={visitors.refetch}
          pageSize={25}
          emptyTitle="No visitors match this filter"
          emptyDescription="Clear the search or switch the status filter to see more."
          emptyAction={
            <Button size="sm" variant="secondary" onClick={() => setRegisterOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Register a visitor
            </Button>
          }
          className="h-full"
        />
      </Card>

      <VisitorRegistrationDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={() => visitors.refetch()}
      />

      <VisitorPanel visitor={selected} onClose={() => setSelected(null)} />
    </Page>
  );
}

function VisitorPanel({ visitor, onClose }: { visitor: Visitor | null; onClose: () => void }) {
  if (!visitor) return null;
  const dwell = (visitor.exitTime ?? Date.now()) - visitor.entryTime;
  const projected = estimateCharge(visitor.vehicleClass, dwell / 3_600_000);

  return (
    <SidePanel open={Boolean(visitor)} onOpenChange={(o) => !o && onClose()}>
      <SidePanelContent width="480px">
        <SidePanelHeader
          title={visitor.name}
          subtitle={`${visitor.company} · ticket ${visitor.ticket}`}
          badge={
            <Badge tone={visitor.status === 'inside' ? 'success' : visitor.status === 'overstay' ? 'warning' : 'neutral'}>
              {visitor.status}
            </Badge>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-4">
            <CameraFeed seed={visitor.entryTime % 9999} state="snapshot" label="Entry capture" plate={visitor.plate} lane />
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center gap-3">
              <PlateTag plate={visitor.plate} size="lg" />
              <div className="min-w-0">
                <p className="text-[12.5px] capitalize text-foreground">{visitor.vehicleClass}</p>
                <p className="text-[11px] text-subtle">Bay {visitor.spaceCode ?? '—'}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="p-4">
            <DefList
              columns={2}
              items={[
                { label: 'Ticket', value: <span className="font-mono">{visitor.ticket}</span> },
                { label: 'Purpose', value: visitor.purpose },
                { label: 'Phone', value: visitor.phone },
                { label: 'CNIC / ID', value: <span className="font-mono">{visitor.cnic}</span> },
                { label: 'Host', value: visitor.host },
                { label: 'Host department', value: visitor.hostDepartment },
                { label: 'Entry time', value: <span className="tnum">{fmtDateTime(visitor.entryTime)}</span> },
                {
                  label: 'Exit time',
                  value: <span className="tnum">{visitor.exitTime ? fmtDateTime(visitor.exitTime) : 'Still inside'}</span>,
                },
              ]}
            />
          </div>

          <Separator />

          <div className="p-4">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Charges</h4>
            <div className="rounded-xl border border-border bg-surface-inset p-3.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-subtle">Duration</span>
                <span className="tnum font-medium text-foreground">{duration(dwell)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-subtle">{visitor.exitTime ? 'Settled amount' : 'Projected charge'}</span>
                <span className="tnum text-[15px] font-semibold text-foreground">
                  {currency(visitor.charges || projected)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-subtle">Payment status</span>
                <Badge tone={visitor.paymentStatus === 'paid' ? 'success' : 'warning'} size="sm">
                  {visitor.paymentStatus}
                </Badge>
              </div>
            </div>

            {visitor.status === 'overstay' && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-dim/40 px-3 py-2.5">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <p className="text-[11.5px] leading-relaxed text-foreground">
                  This vehicle has been on site beyond the 8-hour visitor limit. Contact the host or apply the
                  overstay penalty at the exit terminal.
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="p-4">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Visit timeline</h4>
            <Timeline
              items={[
                {
                  id: 'reg',
                  title: 'Visitor registered',
                  detail: `Ticket ${visitor.ticket} issued at the entry lane`,
                  ts: visitor.entryTime,
                  tone: 'info' as const,
                  icon: IdCard,
                },
                {
                  id: 'bay',
                  title: 'Bay assigned',
                  detail: visitor.spaceCode ? `Directed to ${visitor.spaceCode}` : 'Free choice of bay',
                  ts: visitor.entryTime + 120_000,
                  tone: 'neutral' as const,
                  icon: Building2,
                },
                ...(visitor.exitTime
                  ? [
                      {
                        id: 'pay',
                        title: 'Payment completed',
                        detail: currency(visitor.charges),
                        ts: visitor.exitTime - 60_000,
                        tone: 'success' as const,
                        icon: CreditCard,
                      },
                      {
                        id: 'exit',
                        title: 'Vehicle exited',
                        detail: `Total duration ${duration(dwell)}`,
                        ts: visitor.exitTime,
                        tone: 'neutral' as const,
                        icon: Clock,
                      },
                    ]
                  : []),
              ].sort((a, b) => b.ts - a.ts)}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border bg-surface px-4 py-3">
          <Button variant="secondary" size="sm" className="flex-1">
            <Phone className="h-3.5 w-3.5" />
            Call visitor
          </Button>
          <Button variant="secondary" size="sm" className="flex-1">
            <UserSquare className="h-3.5 w-3.5" />
            Notify host
          </Button>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
