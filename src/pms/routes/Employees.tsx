/**
 * Employees.
 *
 * The synchronised staff register: who they are, what they drive, whether the
 * subscription is current, and where the vehicle is right now. The presence
 * column is the one operators actually use, so it leads the table.
 */

import {
  Car, Bike, CheckCircle2, CreditCard, Download, Mail, Phone,
  RefreshCw, ShieldCheck, TriangleAlert, Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, currency, downloadBlob, duration, fmtDate, num } from '../lib/utils';
import { DEPARTMENTS } from '../data/names';
import { Page, Toolbar } from '../components/ui/page';
import { Card } from '../components/ui/card';
import { Avatar, Badge, Button, Meter, Separator, StatusPill } from '../components/ui/primitives';
import { SearchInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/form';
import { DataTable, DefList, type Column } from '../components/ui/data';
import { SidePanel, SidePanelContent, SidePanelHeader } from '../components/ui/overlay';
import { StatTile, PlateTag } from '../components/pms/atoms';
import { Timeline } from '../components/pms/feed';
import { parkingApi } from '../data/api';
import { useAsync, useDebounced } from '../hooks/useAsync';
import { useWorld } from '../store/live';
import { useSession } from '../store/session';
import type { Employee } from '../data/types';

const SUB_TONE = { none: 'neutral', monthly: 'primary', quarterly: 'info', annual: 'success' } as const;

export default function Employees() {
  const world = useWorld();
  const { toast } = useSession();
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [presence, setPresence] = useState<'all' | 'inside' | 'outside'>('all');
  const [selected, setSelected] = useState<Employee | null>(null);
  const debounced = useDebounced(query);

  const employees = useAsync(() => parkingApi.getEmployees(debounced), {
    deps: [debounced],
    retries: 2,
  });

  const isInside = (e: Employee) => Boolean(world.vehicles[e.plate]?.inside);

  const rows = useMemo(() => {
    let list = employees.data ?? [];
    if (department !== 'all') list = list.filter((e) => e.department === department);
    if (presence !== 'all') list = list.filter((e) => (presence === 'inside' ? isInside(e) : !isInside(e)));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.data, department, presence, world.version]);

  const stats = useMemo(() => {
    const list = employees.data ?? [];
    const inside = list.filter(isInside).length;
    const subscribed = list.filter((e) => e.subscription !== 'none').length;
    const expiring = list.filter(
      (e) => e.subscriptionExpiry && e.subscriptionExpiry < Date.now() + 14 * 86_400_000,
    ).length;
    return { total: list.length, inside, subscribed, expiring };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.data, world.version]);

  const exportCsv = () => {
    const header = 'employee_id,name,department,designation,plate,vehicle_class,subscription,status,inside\n';
    const body = rows
      .map((e) =>
        [e.id, e.name, e.department, e.designation, e.plate, e.vehicleClass, e.subscription, e.status, isInside(e)].join(','),
      )
      .join('\n');
    downloadBlob(new Blob([header + body], { type: 'text/csv' }), `employees-${Date.now()}.csv`);
    toast({ title: 'Export ready', description: `${rows.length} employee records written`, variant: 'success' });
  };

  const columns: Column<Employee>[] = [
    {
      key: 'name', header: 'Employee',
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={e.name} seed={e.photoSeed} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-foreground">{e.name}</p>
            <p className="truncate text-[10.5px] text-subtle">
              {e.id} · {e.designation}
            </p>
          </div>
        </div>
      ),
      sortValue: (e) => e.name,
    },
    {
      key: 'department', header: 'Department', hideBelow: 'md',
      cell: (e) => e.department,
      sortValue: (e) => e.department,
    },
    {
      key: 'plate', header: 'Vehicle', width: '160px',
      cell: (e) => (
        <div className="flex items-center gap-2">
          <PlateTag plate={e.plate} size="sm" />
          {e.vehicleClass === 'car' ? (
            <Car className="h-3 w-3 text-subtle" />
          ) : (
            <Bike className="h-3 w-3 text-info" />
          )}
        </div>
      ),
      sortValue: (e) => e.plate,
    },
    {
      key: 'presence', header: 'Presence', width: '150px',
      cell: (e) => {
        const v = world.vehicles[e.plate];
        return v?.inside ? (
          <span className="inline-flex items-center gap-1.5">
            <Badge tone="success" size="sm">
              Inside
            </Badge>
            <span className="font-mono text-[10.5px] text-subtle">{v.spaceCode}</span>
          </span>
        ) : (
          <Badge tone="neutral" size="sm">
            Outside
          </Badge>
        );
      },
      sortValue: (e) => (world.vehicles[e.plate]?.inside ? 0 : 1),
    },
    {
      key: 'subscription', header: 'Subscription', width: '130px', hideBelow: 'lg',
      cell: (e) => (
        <Badge tone={SUB_TONE[e.subscription]} size="sm">
          {e.subscription}
        </Badge>
      ),
      sortValue: (e) => e.subscription,
    },
    {
      key: 'expiry', header: 'Expires', width: '110px', hideBelow: 'xl',
      cell: (e) =>
        e.subscriptionExpiry ? (
          <span
            className={cn(
              'tnum',
              e.subscriptionExpiry < Date.now()
                ? 'text-danger'
                : e.subscriptionExpiry < Date.now() + 14 * 86_400_000
                  ? 'text-warning'
                  : '',
            )}
          >
            {fmtDate(e.subscriptionExpiry)}
          </span>
        ) : (
          <span className="text-subtle">—</span>
        ),
      sortValue: (e) => e.subscriptionExpiry ?? Infinity,
    },
    {
      key: 'status', header: 'Status', width: '104px',
      cell: (e) => (
        <Badge tone={e.status === 'active' ? 'success' : e.status === 'suspended' ? 'warning' : 'neutral'} size="sm">
          {e.status}
        </Badge>
      ),
      sortValue: (e) => e.status,
    },
  ];

  return (
    <Page className="h-full min-h-0">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile label="Employees" value={num(stats.total)} icon={Users} caption="synchronised from HR" />
        <StatTile label="Currently Inside" value={num(stats.inside)} icon={Car} tone="primary" />
        <StatTile label="Active Subscriptions" value={num(stats.subscribed)} icon={CreditCard} tone="success" />
        <StatTile
          label="Expiring in 14 Days"
          value={num(stats.expiring)}
          icon={TriangleAlert}
          tone={stats.expiring ? 'warning' : 'neutral'}
        />
      </div>

      <Toolbar className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Name, employee ID or plate…"
          size="sm"
          className="w-[250px]"
        />

        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={presence} onValueChange={(v) => setPresence(v as typeof presence)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All presence</SelectItem>
            <SelectItem value="inside">Inside plaza</SelectItem>
            <SelectItem value="outside">Outside</SelectItem>
          </SelectContent>
        </Select>

        <StatusPill tone="neutral">{num(rows.length)} records</StatusPill>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => employees.refetch()}>
            <RefreshCw className={cn('h-3.5 w-3.5', employees.isRefreshing && 'animate-spin')} />
            Sync HR
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </Toolbar>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.id}
          onRowClick={setSelected}
          selectedKey={selected?.id}
          loading={employees.status === 'loading'}
          error={employees.status === 'error' ? employees.error : undefined}
          onRetry={employees.refetch}
          pageSize={25}
          emptyTitle="No employees match these filters"
          emptyDescription="Try a different department, or clear the search."
          className="h-full"
        />
      </Card>

      <EmployeePanel employee={selected} onClose={() => setSelected(null)} />
    </Page>
  );
}

function EmployeePanel({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const world = useWorld();
  if (!employee) return null;

  const vehicle = world.vehicles[employee.plate];
  const visits = world.events
    .filter((e) => e.plate === employee.plate)
    .slice(0, 8)
    .map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail,
      ts: e.ts,
      tone: e.type === 'vehicle_entered' ? ('success' as const) : ('neutral' as const),
    }));

  const expiry = employee.subscriptionExpiry;
  const expired = expiry ? expiry < Date.now() : false;
  const daysLeft = expiry ? Math.round((expiry - Date.now()) / 86_400_000) : 0;

  return (
    <SidePanel open={Boolean(employee)} onOpenChange={(o) => !o && onClose()}>
      <SidePanelContent width="460px">
        <SidePanelHeader
          title={employee.name}
          subtitle={`${employee.id} · ${employee.designation}`}
          badge={
            <Badge tone={employee.status === 'active' ? 'success' : 'warning'}>{employee.status}</Badge>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3.5 p-4">
            <Avatar name={employee.name} seed={employee.photoSeed} size={54} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">{employee.department}</p>
              <p className="truncate text-[11.5px] text-subtle">{employee.email}</p>
              <p className="tnum truncate text-[11.5px] text-subtle">{employee.phone}</p>
            </div>
          </div>

          <Separator />

          <div className="p-4">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
              Registered vehicle
            </h4>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-inset p-3.5">
              <div className="flex items-center gap-3">
                <PlateTag plate={employee.plate} size="lg" />
                <div>
                  <p className="text-[12px] capitalize text-foreground">{employee.vehicleClass}</p>
                  <p className="text-[11px] text-subtle">{vehicle?.make ?? 'Unregistered model'}</p>
                </div>
              </div>
              <StatusPill tone={vehicle?.inside ? 'success' : 'neutral'} pulse={vehicle?.inside}>
                {vehicle?.inside ? `Inside · ${vehicle.spaceCode}` : 'Outside'}
              </StatusPill>
            </div>
          </div>

          <Separator />

          <div className="p-4">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Subscription</h4>
            {employee.subscription === 'none' ? (
              <div className="rounded-xl border border-border bg-surface-inset px-4 py-5 text-center">
                <p className="text-[12.5px] text-muted">No parking subscription</p>
                <p className="mt-1 text-[11.5px] text-subtle">This employee is billed per visit at the staff rate.</p>
                <Button variant="primary" size="sm" className="mt-3">
                  <CreditCard className="h-3.5 w-3.5" />
                  Enrol in monthly plan
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-inset p-3.5">
                <div className="flex items-center justify-between">
                  <Badge tone={SUB_TONE[employee.subscription]}>{employee.subscription} plan</Badge>
                  <span className={cn('tnum text-[11.5px]', expired ? 'text-danger' : daysLeft < 14 ? 'text-warning' : 'text-subtle')}>
                    {expired ? 'Expired' : `${daysLeft} days left`}
                  </span>
                </div>
                <Meter
                  className="mt-3"
                  value={expired ? 100 : Math.max(4, Math.min(100, 100 - (daysLeft / 365) * 100))}
                  tone={expired ? 'danger' : daysLeft < 14 ? 'warning' : 'success'}
                />
                <div className="mt-3 flex items-center justify-between text-[11.5px]">
                  <span className="text-subtle">Renews on</span>
                  <span className="tnum text-foreground">{expiry ? fmtDate(expiry) : '—'}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="text-subtle">Monthly fee</span>
                  <span className="tnum text-foreground">{currency(4500)}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="p-4">
            <DefList
              columns={2}
              items={[
                { label: 'Employee ID', value: <span className="font-mono">{employee.id}</span> },
                { label: 'Access level', value: <span className="capitalize">{employee.accessLevel}</span> },
                { label: 'Department', value: employee.department },
                { label: 'Designation', value: employee.designation },
                {
                  label: 'Avg dwell',
                  value: <span className="tnum">{duration(7.4 * 3_600_000)}</span>,
                },
                { label: 'Vehicle class', value: <span className="capitalize">{employee.vehicleClass}</span> },
              ]}
            />
          </div>

          <Separator />

          <div className="p-4">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">
              Parking history
            </h4>
            {visits.length ? (
              <Timeline items={visits} />
            ) : (
              <p className="rounded-lg border border-border bg-surface-inset px-3 py-6 text-center text-[11.5px] text-subtle">
                No parking events recorded in the current window.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-border bg-surface px-4 py-3">
          <Button variant="secondary" size="sm" className="flex-1">
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
          <Button variant="secondary" size="sm" className="flex-1">
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            {employee.status === 'active' ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Suspend
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reinstate
              </>
            )}
          </Button>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
