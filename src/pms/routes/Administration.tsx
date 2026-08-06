/**
 * Administration.
 *
 * Everything that configures the plaza rather than operates it: operator
 * accounts and roles, the published tariff, the device registry, integrations,
 * and the audit trail. Destructive controls are visible but gated on role.
 */

import {
  Building2, Cable, Cctv, CircleCheck, KeyRound, Plug, Plus, ScrollText,
  ShieldCheck, ShieldQuestion, SlidersHorizontal, Trash2, UserCog, Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, ago, currency, fmtDateTime, num } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader } from '../components/ui/card';
import { Avatar, Badge, Button, Separator, StatusPill } from '../components/ui/primitives';
import { Field, Input, SettingRow, Switch } from '../components/ui/form';
import { DataTable, DefList, type Column } from '../components/ui/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '../components/ui/overlay';
import { TARIFF } from '../components/pms/VisitorRegistration';
import { useCameras, useBarriers, useWorld } from '../store/live';
import { useSession } from '../store/session';

interface OperatorAccount {
  id: string;
  name: string;
  role: 'Operator' | 'Supervisor' | 'Administrator' | 'Viewer';
  shift: string;
  lastSeen: number;
  status: 'active' | 'disabled';
  seed: number;
}

const ACCOUNTS: OperatorAccount[] = [
  { id: 'OP-114', name: 'S. Malik', role: 'Supervisor', shift: 'Shift B · 14:00–22:00', lastSeen: Date.now() - 60_000, status: 'active', seed: 3 },
  { id: 'OP-209', name: 'A. Raza', role: 'Operator', shift: 'Shift A · 06:00–14:00', lastSeen: Date.now() - 4 * 3600_000, status: 'active', seed: 11 },
  { id: 'OP-077', name: 'F. Khan', role: 'Operator', shift: 'Shift C · 22:00–06:00', lastSeen: Date.now() - 11 * 3600_000, status: 'active', seed: 27 },
  { id: 'SUP-011', name: 'N. Hussain', role: 'Administrator', shift: 'On call', lastSeen: Date.now() - 2 * 86_400_000, status: 'active', seed: 41 },
  { id: 'OP-303', name: 'H. Sheikh', role: 'Viewer', shift: 'Reporting only', lastSeen: Date.now() - 9 * 86_400_000, status: 'disabled', seed: 58 },
];

const PERMISSIONS: Array<{ capability: string; viewer: boolean; operator: boolean; supervisor: boolean; admin: boolean }> = [
  { capability: 'View dashboards and reports', viewer: true, operator: true, supervisor: true, admin: true },
  { capability: 'Search vehicles and visitors', viewer: true, operator: true, supervisor: true, admin: true },
  { capability: 'Register visitors', viewer: false, operator: true, supervisor: true, admin: true },
  { capability: 'Open / close barriers', viewer: false, operator: true, supervisor: true, admin: true },
  { capability: 'Override bay state', viewer: false, operator: false, supervisor: true, admin: true },
  { capability: 'Engage emergency release', viewer: false, operator: false, supervisor: true, admin: true },
  { capability: 'Edit tariffs and devices', viewer: false, operator: false, supervisor: false, admin: true },
  { capability: 'Manage operator accounts', viewer: false, operator: false, supervisor: false, admin: true },
];

export default function Administration() {
  const world = useWorld();
  const cameras = useCameras('all');
  const barriers = useBarriers();
  const { operator, toast } = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tariff, setTariff] = useState(TARIFF);
  const isAdmin = operator.role === 'Administrator';

  const auditRows = useMemo(
    () =>
      world.events
        .filter((e) => e.actor && e.actor !== 'System (AUTO)')
        .slice(0, 60)
        .map((e) => ({ id: e.id, ts: e.ts, actor: e.actor!, action: e.title, detail: e.detail })),
    [world.events],
  );

  const auditColumns: Column<(typeof auditRows)[number]>[] = [
    { key: 'ts', header: 'Time', width: '150px', cell: (r) => <span className="tnum">{fmtDateTime(r.ts)}</span>, sortValue: (r) => r.ts },
    { key: 'actor', header: 'Operator', width: '180px', cell: (r) => r.actor, sortValue: (r) => r.actor },
    { key: 'action', header: 'Action', width: '180px', cell: (r) => <span className="text-foreground">{r.action}</span>, sortValue: (r) => r.action },
    { key: 'detail', header: 'Detail', cell: (r) => r.detail },
  ];

  const devices = useMemo(
    () => [
      { kind: 'Bay cameras', count: cameras.filter((c) => c.role === 'bay').length, healthy: cameras.filter((c) => c.role === 'bay' && c.health === 'online').length, icon: Cctv },
      { kind: 'Lane / perimeter cameras', count: cameras.filter((c) => c.role !== 'bay').length, healthy: cameras.filter((c) => c.role !== 'bay' && c.health === 'online').length, icon: Cctv },
      { kind: 'Barrier controllers', count: barriers.length, healthy: barriers.filter((b) => b.connection === 'healthy').length, icon: ShieldCheck },
      { kind: 'Payment terminals', count: 3, healthy: 2, icon: Wallet },
      { kind: 'ANPR engines', count: 4, healthy: 4, icon: Cable },
      { kind: 'Bay sensor gateways', count: 12, healthy: 11, icon: Plug },
    ],
    [cameras, barriers],
  );

  return (
    <Page>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            <UserCog className="h-3.5 w-3.5" />
            Accounts &amp; roles
          </TabsTrigger>
          <TabsTrigger value="tariffs">
            <Wallet className="h-3.5 w-3.5" />
            Tariffs
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Cable className="h-3.5 w-3.5" />
            Device registry
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="h-3.5 w-3.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText className="h-3.5 w-3.5" />
            Audit log
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------- accounts */}
        <TabsContent value="accounts" className="mt-3.5 flex flex-col gap-3.5">
          <Card>
            <CardHeader
              title="Operator accounts"
              subtitle={`${ACCOUNTS.filter((a) => a.status === 'active').length} active of ${ACCOUNTS.length}`}
              icon={<UserCog className="h-3.5 w-3.5" />}
              actions={
                <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Invite operator
                </Button>
              }
            />
            <ul className="divide-y divide-border-subtle">
              {ACCOUNTS.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={a.name} seed={a.seed} size={34} />
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[12.5px] font-medium text-foreground">
                      {a.name}
                      {a.id === operator.id && (
                        <Badge tone="primary" size="sm" className="ml-2">
                          You
                        </Badge>
                      )}
                    </p>
                    <p className="tnum text-[10.5px] text-subtle">
                      {a.id} · {a.shift}
                    </p>
                  </div>
                  <Badge tone={a.role === 'Administrator' ? 'danger' : a.role === 'Supervisor' ? 'primary' : 'neutral'} size="sm">
                    {a.role}
                  </Badge>
                  <span className="tnum w-28 text-right text-[11px] text-subtle">last seen {ago(a.lastSeen)}</span>
                  <StatusPill tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status}</StatusPill>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" disabled={!isAdmin}>
                      <KeyRound className="h-3 w-3" />
                      Reset
                    </Button>
                    <Button variant="ghost" size="xs" disabled={!isAdmin || a.id === operator.id}>
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {!isAdmin && (
              <div className="flex items-center gap-2 border-t border-border-subtle bg-surface-inset px-4 py-2.5">
                <ShieldQuestion className="h-3.5 w-3.5 shrink-0 text-subtle" />
                <p className="text-[11.5px] text-subtle">
                  You are signed in as a {operator.role}. Account changes require the Administrator role.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Role permissions" subtitle="What each role can do in this module" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-subtle">Capability</th>
                    {['Viewer', 'Operator', 'Supervisor', 'Administrator'].map((r) => (
                      <th key={r} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.09em] text-subtle">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((p) => (
                    <tr key={p.capability} className="border-b border-border-subtle last:border-0">
                      <td className="px-4 py-2.5 text-[12px] text-muted">{p.capability}</td>
                      {[p.viewer, p.operator, p.supervisor, p.admin].map((allowed, i) => (
                        <td key={i} className="px-3 py-2.5 text-center">
                          {allowed ? (
                            <CircleCheck className="mx-auto h-3.5 w-3.5 text-success" />
                          ) : (
                            <span className="text-disabled">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------- tariffs */}
        <TabsContent value="tariffs" className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
          {(['car', 'motorcycle'] as const).map((cls) => (
            <Card key={cls}>
              <CardHeader
                title={`${cls === 'car' ? 'Car' : 'Motorcycle'} tariff`}
                subtitle="Applies to visitor parking; employees are billed by subscription"
                icon={<Wallet className="h-3.5 w-3.5" />}
              />
              <div className="flex flex-col gap-3 p-4">
                <Field label="First hour (PKR)">
                  <Input
                    type="number"
                    value={tariff[cls].firstHour}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setTariff((t) => ({ ...t, [cls]: { ...t[cls], firstHour: Number(e.target.value) } }))
                    }
                    className="tnum"
                  />
                </Field>
                <Field label="Each additional hour (PKR)">
                  <Input
                    type="number"
                    value={tariff[cls].perHour}
                    disabled={!isAdmin}
                    onChange={(e) => setTariff((t) => ({ ...t, [cls]: { ...t[cls], perHour: Number(e.target.value) } }))}
                    className="tnum"
                  />
                </Field>
                <Field label="Daily cap (PKR)" hint="Charges never exceed this in a 24-hour period">
                  <Input
                    type="number"
                    value={tariff[cls].dailyCap}
                    disabled={!isAdmin}
                    onChange={(e) => setTariff((t) => ({ ...t, [cls]: { ...t[cls], dailyCap: Number(e.target.value) } }))}
                    className="tnum"
                  />
                </Field>

                <Separator />

                <div className="rounded-lg border border-border bg-surface-inset px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">Worked example</p>
                  {[1, 3, 6, 12].map((h) => (
                    <div key={h} className="mt-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="text-muted">{h}-hour visit</span>
                      <span className="tnum font-medium text-foreground">
                        {currency(
                          Math.min(
                            tariff[cls].dailyCap,
                            tariff[cls].firstHour + (h - 1) * tariff[cls].perHour,
                          ),
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => toast({ title: `${cls} tariff published`, description: 'New rates apply to visits starting now.', variant: 'success' })}
                >
                  Publish tariff
                </Button>
              </div>
            </Card>
          ))}

          <Card className="lg:col-span-2">
            <CardHeader title="Subscription plans" subtitle="Employee parking products" icon={<SlidersHorizontal className="h-3.5 w-3.5" />} />
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              {[
                { name: 'Monthly', price: 4500, holders: world.employees.filter((e) => e.subscription === 'monthly').length },
                { name: 'Quarterly', price: 12000, holders: world.employees.filter((e) => e.subscription === 'quarterly').length },
                { name: 'Annual', price: 42000, holders: world.employees.filter((e) => e.subscription === 'annual').length },
              ].map((p) => (
                <div key={p.name} className="rounded-xl border border-border bg-surface-inset p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-medium text-foreground">{p.name}</p>
                    <Badge tone="outline" size="sm">
                      {num(p.holders)} holders
                    </Badge>
                  </div>
                  <p className="tnum mt-2 text-[20px] font-semibold text-foreground">{currency(p.price)}</p>
                  <p className="mt-0.5 text-[11px] text-subtle">per vehicle, unlimited entries</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------- devices */}
        <TabsContent value="devices" className="mt-3.5 flex flex-col gap-3.5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {devices.map((d) => {
              const healthy = d.healthy === d.count;
              return (
                <Card key={d.kind} className="gap-2.5 p-3.5">
                  <div className="flex items-start justify-between">
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                      <d.icon className="h-3.5 w-3.5 text-subtle" />
                      {d.kind}
                    </span>
                    <Badge tone={healthy ? 'success' : 'warning'} size="sm">
                      {healthy ? 'Healthy' : `${d.count - d.healthy} degraded`}
                    </Badge>
                  </div>
                  <p className="tnum text-[22px] font-semibold text-foreground">{num(d.count)}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
                    <div
                      className={cn('h-full rounded-full', healthy ? 'bg-success' : 'bg-warning')}
                      style={{ width: `${(d.healthy / d.count) * 100}%` }}
                    />
                  </div>
                  <p className="tnum text-[10.5px] text-subtle">
                    {num(d.healthy)} of {num(d.count)} reporting normally
                  </p>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Site configuration" subtitle="Physical layout registered with the controller" icon={<Building2 className="h-3.5 w-3.5" />} />
            <div className="p-4">
              <DefList
                columns={3}
                items={[
                  { label: 'Site', value: 'Nexus Corporate Plaza' },
                  { label: 'Levels', value: `${world.floors.length}` },
                  { label: 'Total bays', value: num(world.spaceIds.length) },
                  {
                    label: 'Car bays',
                    value: num(world.floors.reduce((s, f) => s + f.carCapacity, 0)),
                  },
                  {
                    label: 'Motorcycle bays',
                    value: num(world.floors.reduce((s, f) => s + f.motorcycleCapacity, 0)),
                  },
                  { label: 'Bays per camera', value: '6 (3 per side)' },
                  { label: 'Cameras', value: num(cameras.length) },
                  { label: 'Barriers', value: num(barriers.length) },
                  { label: 'Zones per level', value: '3 car + 1 motorcycle' },
                ]}
              />
            </div>
          </Card>
        </TabsContent>

        {/* --------------------------------------------- integrations */}
        <TabsContent value="integrations" className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Upstream systems" subtitle="Where this module gets and sends data" icon={<Plug className="h-3.5 w-3.5" />} />
            <div className="divide-y divide-border-subtle">
              {[
                { name: 'HR directory (employee sync)', endpoint: 'https://hr.nexus-corp.com/api/v2', status: 'connected', cadence: 'Every 15 minutes' },
                { name: 'Parking controller (bay state)', endpoint: 'wss://pms-controller.local/stream', status: 'connected', cadence: 'Streaming' },
                { name: 'ANPR engine', endpoint: 'https://anpr.local/v1/reads', status: 'connected', cadence: 'Streaming' },
                { name: 'Payment gateway', endpoint: 'https://pay.nexus-corp.com/v3', status: 'degraded', cadence: 'On demand' },
                { name: 'BMS event bus', endpoint: 'amqp://bms-bus.local/pms', status: 'connected', cadence: 'Publish only' },
              ].map((i) => (
                <div key={i.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[200px] flex-1">
                    <p className="text-[12.5px] font-medium text-foreground">{i.name}</p>
                    <p className="truncate font-mono text-[10.5px] text-subtle">{i.endpoint}</p>
                  </div>
                  <span className="text-[11px] text-subtle">{i.cadence}</span>
                  <StatusPill tone={i.status === 'connected' ? 'success' : 'warning'} pulse={i.status !== 'connected'}>
                    {i.status}
                  </StatusPill>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Automation rules" subtitle="Actions the system takes without an operator" />
            <div className="divide-y divide-border-subtle px-4">
              <SettingRow
                title="Auto-open on recognised plate"
                description="Entry barriers open when ANPR confidence exceeds 72%"
                control={<Switch defaultChecked disabled={!isAdmin} />}
              />
              <SettingRow
                title="Launch visitor registration on failed read"
                description="Opens the registration form at the lane console automatically"
                control={<Switch defaultChecked disabled={!isAdmin} />}
              />
              <SettingRow
                title="Divert arrivals when a level fills"
                description="Ramp signage sends drivers to the next level at 99% occupancy"
                control={<Switch defaultChecked disabled={!isAdmin} />}
              />
              <SettingRow
                title="Auto-close after vehicle clears loop"
                description="Barrier closes as soon as the ground loop reports clear"
                control={<Switch defaultChecked disabled={!isAdmin} />}
              />
              <SettingRow
                title="Overstay penalty after 8 hours"
                description="Applies the visitor overstay tariff at the exit terminal"
                control={<Switch disabled={!isAdmin} />}
              />
            </div>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- audit */}
        <TabsContent value="audit" className="mt-3.5">
          <Card className="overflow-hidden">
            <CardHeader
              title="Audit log"
              subtitle="Every operator action taken in this module"
              icon={<ScrollText className="h-3.5 w-3.5" />}
              actions={<Badge tone="outline" size="sm">Retained 2 years</Badge>}
            />
            <DataTable
              rows={auditRows}
              columns={auditColumns}
              rowKey={(r) => r.id}
              pageSize={20}
              dense
              emptyTitle="No operator actions recorded yet"
              emptyDescription="Barrier commands, bay overrides and plate overrides appear here as they happen."
            />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="sm">
          <DialogHeader
            icon={<UserCog className="h-4 w-4" />}
            title="Invite an operator"
            description="They will receive an email to set a password and enrol a second factor."
          />
          <DialogBody className="flex flex-col gap-3">
            <Field label="Full name" required>
              <Input placeholder="e.g. R. Iqbal" />
            </Field>
            <Field label="Work email" required>
              <Input type="email" placeholder="name@nexus-corp.com" />
            </Field>
            <Field label="Role" hint="Roles can be changed later from this screen">
              <Input defaultValue="Operator" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setInviteOpen(false);
                toast({ title: 'Invitation sent', description: 'The account is pending until they enrol.', variant: 'success' });
              }}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
