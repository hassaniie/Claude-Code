/**
 * Admin — Buildings & Spaces. The physical catalogue: buildings, their floors
 * (each with its infrastructure main meter), occupancy and leasable area.
 */

import { Building2, Gauge, Layers } from 'lucide-react';
import { Page, StatGrid } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { PageHeader, StatCard } from '../../components/common';
import { IconBox, ProgressBar, StatusBadge } from '../../components/ui/primitives';
import { useLive } from '../../data/live';
import { area, num } from '../../lib/utils';

export default function Buildings() {
  const data = useLive((w) => ({
    buildings: w.buildings.map((b) => {
      const floors = w.floors.filter((f) => f.buildingId === b.id);
      const offices = w.offices.filter((o) => o.buildingId === b.id);
      const tenants = new Set(offices.map((o) => o.tenantId).filter(Boolean));
      const subMeters = w.meters.filter((m) => m.buildingId === b.id && m.kind === 'sub');
      const load = subMeters.reduce((s, m) => s + m.live.powerKw, 0);
      return {
        building: b,
        floors: floors.map((f) => ({ floor: f, mainSerial: w.meterById[f.mainMeterId]?.serial ?? '—', offices: offices.filter((o) => o.floorId === f.id) })),
        officeCount: offices.length,
        occupied: offices.filter((o) => o.status === 'occupied').length,
        tenantCount: tenants.size,
        load,
      };
    }),
  }));

  const totalArea = data.buildings.reduce((s, b) => s + b.building.grossAreaSqft, 0);
  const totalFloors = data.buildings.reduce((s, b) => s + b.floors.length, 0);
  const totalTenants = data.buildings.reduce((s, b) => s + b.tenantCount, 0);

  return (
    <Page>
      <PageHeader title="Buildings & Spaces" description="The physical catalogue of the NASTP park." />

      <StatGrid cols={4}>
        <StatCard label="Buildings" value={num(data.buildings.length)} icon={Building2} tone="primary" />
        <StatCard label="Floors" value={num(totalFloors)} icon={Layers} tone="neutral" />
        <StatCard label="Tenants" value={num(totalTenants)} icon={Building2} tone="success" />
        <StatCard label="Leasable Area" value={area(totalArea)} icon={Building2} tone="neutral" />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.buildings.map((b) => {
          const occPct = b.officeCount ? Math.round((b.occupied / b.officeCount) * 100) : 0;
          return (
            <Card key={b.building.id}>
              <CardHeader
                title={b.building.name}
                subtitle={b.building.address}
                icon={<IconBox icon={Building2} tone="primary" size="md" />}
                actions={<StatusBadge tone="neutral" size="sm" dot={false}>{b.building.code}</StatusBadge>}
              />
              <CardBody className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <Mini label="Floors" value={String(b.floors.length)} />
                  <Mini label="Tenants" value={String(b.tenantCount)} />
                  <Mini label="Load" value={`${num(b.load, 0)} kW`} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11.5px]"><span className="text-subtle">Occupancy</span><span className="tnum font-medium text-foreground">{b.occupied}/{b.officeCount} offices</span></div>
                  <ProgressBar value={occPct} tone={occPct > 85 ? 'warning' : 'success'} className="mt-1.5" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {b.floors.map((f) => (
                    <div key={f.floor.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Layers className="h-4 w-4 text-subtle" />
                        <div>
                          <p className="text-[12.5px] font-medium text-foreground">{f.floor.name}</p>
                          <p className="text-[10.5px] text-subtle">{f.offices.length} offices · {area(f.floor.netLeasableSqft)} leasable</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1 text-[10.5px] text-muted"><Gauge className="h-3 w-3 text-energy" />Main {f.mainSerial}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-2.5 text-center">
      <p className="tnum text-[16px] font-semibold text-foreground">{value}</p>
      <p className="text-[9.5px] uppercase tracking-[0.08em] text-subtle">{label}</p>
    </div>
  );
}
