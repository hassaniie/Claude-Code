/**
 * Tenant Portal — Organization. The tenant's own profile: contacts, offices,
 * meters, users and the contract/configuration summary. Read-only, scoped to
 * the signed-in tenant.
 */

import { Building2, Gauge, Mail, Phone, UserRound } from 'lucide-react';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { PageHeader, KeyValue } from '../../components/common';
import { Avatar, IconBox, StatusBadge, TenantMark } from '../../components/ui/primitives';
import { DefList } from '../../components/ui/data';
import { TenantStatusBadge, MeterStatusBadge } from '../../components/status';
import { USER_ROLE } from '../../lib/meta';
import { ORG_TYPE_LABEL } from '../../data/catalog';
import { useSession } from '../../store/session';
import { useLive } from '../../data/live';
import { area, ago, fmtDateFull } from '../../lib/utils';

export default function Organization() {
  const { tenantId } = useSession();
  const data = useLive((w) => {
    const t = w.tenantById[tenantId];
    return {
      tenant: t,
      building: w.buildingById[t?.buildingId ?? '']?.name ?? '—',
      floors: (t?.floorIds ?? []).map((f) => w.floorById[f]?.name ?? '—'),
      offices: w.offices.filter((o) => o.tenantId === tenantId),
      meters: w.meters.filter((m) => m.tenantId === tenantId),
      users: w.users.filter((u) => u.tenantId === tenantId),
    };
  });
  const t = data.tenant;
  if (!t) return null;
  const totalArea = data.offices.reduce((s, o) => s + o.areaSqft, 0);

  return (
    <Page>
      <PageHeader title="Organization" description="Your organization profile, spaces and users." />

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <TenantMark name={t.name} hue={t.brandHue} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">{t.name}</h2>
              <TenantStatusBadge status={t.status} />
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted">{t.legalName} · {ORG_TYPE_LABEL[t.organizationType]}</p>
            <p className="mt-1 text-[12px] text-subtle">{data.building} · {data.floors.join(', ')}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" icon={<IconBox icon={Building2} tone="primary" size="sm" />} />
          <CardBody>
            <DefList columns={2} items={[
              { label: 'Registration', value: t.registrationNo ?? '—' },
              { label: 'NTN / Tax ID', value: t.ntn ?? '—' },
              { label: 'Contract start', value: t.contractStart ? fmtDateFull(t.contractStart) : '—' },
              { label: 'Contract end', value: t.contractEnd ? fmtDateFull(t.contractEnd) : '—' },
              { label: 'Total area', value: area(totalArea) },
              { label: 'Offices', value: String(data.offices.length) },
            ]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Primary Contact" icon={<IconBox icon={UserRound} tone="primary" size="sm" />} />
          <CardBody className="flex flex-col gap-1">
            <KeyValue label="Name" value={t.primaryContact.name} />
            <KeyValue label="Designation" value={t.primaryContact.designation} />
            <KeyValue label={<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>} value={t.primaryContact.email} />
            <KeyValue label={<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />Phone</span>} value={t.primaryContact.phone} mono />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Offices & Meters" icon={<IconBox icon={Gauge} tone="energy" size="sm" />} />
          <CardBody className="flex flex-col gap-2">
            {data.offices.map((o) => {
              const meter = data.meters.find((m) => m.id === o.meterId);
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground">{o.label} · {o.code}</p>
                    <p className="text-[11px] text-subtle">{area(o.areaSqft)}{meter ? ` · ${meter.serial}` : ' · not metered'}</p>
                  </div>
                  {meter && <MeterStatusBadge status={meter.status} size="sm" />}
                </div>
              );
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Users" subtitle={`${data.users.length} users`} icon={<IconBox icon={UserRound} tone="visitor" size="sm" />} />
          <CardBody className="flex flex-col gap-2">
            {data.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
                <Avatar name={u.name} seed={u.avatarSeed} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-foreground">{u.name}</p>
                  <p className="truncate text-[11px] text-subtle">{USER_ROLE[u.role]} · {u.lastActiveAt ? `active ${ago(u.lastActiveAt)}` : u.status}</p>
                </div>
                <StatusBadge tone={u.status === 'active' ? 'success' : u.status === 'invited' ? 'info' : 'neutral'} size="sm">{u.status}</StatusBadge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
