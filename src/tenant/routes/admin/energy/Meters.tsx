/**
 * Admin — Meters (§12). The registry, with infrastructure mains and tenant
 * sub-meters clearly distinguished, a live electrical snapshot per meter, and a
 * detail drawer exposing the full parameter set.
 */

import { Gauge, Building2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, StatGrid, Toolbar } from '../../../components/ui/page';
import { Card } from '../../../components/ui/card';
import { PageHeader, StatCard, KeyValue } from '../../../components/common';
import { IconBox, StatusBadge } from '../../../components/ui/primitives';
import { SearchInput } from '../../../components/ui/form';
import { Segmented } from '../../../components/ui/tabs';
import { DataTable, DefList, type Column } from '../../../components/ui/data';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '../../../components/ui/overlay';
import { MeterStatusBadge } from '../../../components/status';
import { useLive } from '../../../data/live';
import { ago, num } from '../../../lib/utils';

export default function Meters() {
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<'all' | 'main' | 'sub'>('all');
  const [search, setSearch] = useState('');
  const meters = useLive((w) => w.meters.map((m) => ({ ...m, tenantName: m.tenantId ? w.tenantById[m.tenantId]?.name ?? '—' : 'Infrastructure' })));
  const openId = params.get('open');
  const open = openId ? meters.find((m) => m.id === openId) ?? null : null;

  const filtered = meters.filter((m) => {
    if (kind !== 'all' && m.kind !== kind) return false;
    const t = search.trim().toLowerCase();
    if (t && !(m.serial.toLowerCase().includes(t) || m.name.toLowerCase().includes(t) || m.tenantName.toLowerCase().includes(t))) return false;
    return true;
  });

  const total = meters.length;
  const online = meters.filter((m) => m.status === 'online').length;
  const offline = meters.filter((m) => m.status === 'offline').length;
  const subs = meters.filter((m) => m.kind === 'sub').length;

  const columns: Column<(typeof meters)[number]>[] = [
    { key: 'serial', header: 'Serial', cell: (m) => <span className="tnum font-medium text-foreground">{m.serial}</span>, sortValue: (m) => m.serial },
    { key: 'name', header: 'Meter', cell: (m) => <span>{m.name}</span>, hideBelow: 'md' },
    { key: 'kind', header: 'Type', cell: (m) => <StatusBadge tone={m.kind === 'main' ? 'primary' : 'neutral'} size="sm" dot={false}>{m.kind === 'main' ? 'Main' : 'Sub-meter'}</StatusBadge>, sortValue: (m) => m.kind },
    { key: 'owner', header: 'Assigned to', cell: (m) => <span className={m.kind === 'main' ? 'text-subtle' : 'text-muted'}>{m.tenantName}</span>, hideBelow: 'lg' },
    { key: 'load', header: 'Load', align: 'right', cell: (m) => <span className="tnum">{num(m.live.powerKw, 1)} kW</span>, sortValue: (m) => m.live.powerKw },
    { key: 'pf', header: 'PF', align: 'right', cell: (m) => <span className="tnum">{m.live.powerFactor.toFixed(2)}</span>, hideBelow: 'xl' },
    { key: 'status', header: 'Status', cell: (m) => <MeterStatusBadge status={m.status} size="sm" /> },
  ];

  return (
    <Page>
      <PageHeader title="Meters" description="Infrastructure mains and tenant sub-meters across the park." />

      <StatGrid cols={4}>
        <StatCard label="Total Meters" value={num(total)} icon={Gauge} tone="primary" />
        <StatCard label="Sub-meters" value={num(subs)} icon={Gauge} tone="energy" caption={`${total - subs} main incomers`} />
        <StatCard label="Online" value={num(online)} icon={Gauge} tone="success" />
        <StatCard label="Offline" value={num(offline)} icon={Gauge} tone={offline ? 'critical' : 'success'} />
      </StatGrid>

      <Card>
        <div className="border-b border-border-subtle p-3.5">
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by serial, name or tenant…" className="w-full sm:w-[300px]" />
            <div className="flex-1" />
            <Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'main', label: 'Main' }, { value: 'sub', label: 'Sub' }]} />
          </Toolbar>
        </div>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(m) => m.id}
          onRowClick={(m) => setParams({ open: m.id })}
          selectedKey={openId ?? undefined}
          emptyTitle="No meters match"
          pageSize={14}
        />
      </Card>

      <Drawer open={Boolean(open)} onOpenChange={(o) => !o && setParams({})}>
        <DrawerContent width="480px">
          {open && (
            <>
              <DrawerHeader
                title={open.name}
                subtitle={`Serial ${open.serial} · ${open.model}`}
                badge={<MeterStatusBadge status={open.status} size="sm" />}
              />
              <DrawerBody className="flex flex-col gap-5">
                <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
                  <IconBox icon={open.kind === 'main' ? Building2 : Gauge} tone={open.kind === 'main' ? 'primary' : 'energy'} size="md" />
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground">{open.kind === 'main' ? 'Floor main incomer' : `Tenant sub-meter · ${open.tenantName}`}</p>
                    <p className="text-[11.5px] text-subtle">Last reading {ago(open.lastReadingAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Live electrical snapshot</p>
                  <DefList columns={2} items={[
                    { label: 'Active power', value: `${num(open.live.powerKw, 1)} kW` },
                    { label: 'Apparent power', value: `${num(open.live.apparentKva, 1)} kVA` },
                    { label: 'Reactive power', value: `${num(open.live.reactiveKvar, 1)} kVAr` },
                    { label: 'Power factor', value: open.live.powerFactor.toFixed(3) },
                    { label: 'Voltage', value: `${num(open.live.voltage, 1)} V` },
                    { label: 'Current', value: `${num(open.live.current, 1)} A` },
                    { label: 'Frequency', value: `${open.live.frequency.toFixed(2)} Hz` },
                    { label: 'Max demand', value: `${num(open.live.maxDemandKw, 1)} kW` },
                  ]} />
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Registers & metadata</p>
                  <KeyValue label="Cumulative import" value={`${num(open.totalKwh)} kWh`} mono />
                  <KeyValue label="CT ratio" value={open.ctRatio} />
                  <KeyValue label="Model" value={open.model} />
                  <KeyValue label="Peak demand" value={`${num(open.live.peakDemandKw, 1)} kW`} />
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </Page>
  );
}
