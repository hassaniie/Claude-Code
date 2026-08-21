/**
 * Admin — Users. The administrative account and the role architecture. One
 * Admin role today; the model is designed so more roles slot in without a
 * redesign. A park-wide view of tenant portal users is included for oversight.
 */

import { ShieldCheck, UserRound } from 'lucide-react';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { PageHeader } from '../../components/common';
import { Avatar, IconBox, StatusBadge } from '../../components/ui/primitives';
import { DataTable, type Column } from '../../components/ui/data';
import { USER_ROLE } from '../../lib/meta';
import { useSession } from '../../store/session';
import { useLive } from '../../data/live';
import { ago } from '../../lib/utils';

const FUTURE_ROLES = ['Building Admin', 'Energy Manager', 'Finance Manager', 'Receptionist', 'Maintenance Manager', 'Technician', 'Tenant Manager', 'Read-only Executive'];

export default function Users() {
  const { admin } = useSession();
  const users = useLive((w) => w.users.map((u) => ({ ...u, tenantName: w.tenantById[u.tenantId]?.name ?? '—' })));

  const columns: Column<(typeof users)[number]>[] = [
    { key: 'name', header: 'User', cell: (u) => <div className="flex items-center gap-2.5"><Avatar name={u.name} seed={u.avatarSeed} size={28} /><div><p className="font-medium text-foreground">{u.name}</p><p className="text-[11px] text-subtle">{u.email}</p></div></div>, sortValue: (u) => u.name },
    { key: 'tenant', header: 'Tenant', cell: (u) => u.tenantName, sortValue: (u) => u.tenantName, hideBelow: 'md' },
    { key: 'role', header: 'Role', cell: (u) => <StatusBadge tone={u.role === 'primary' ? 'primary' : 'neutral'} size="sm" dot={false}>{USER_ROLE[u.role]}</StatusBadge>, sortValue: (u) => u.role },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge tone={u.status === 'active' ? 'success' : u.status === 'invited' ? 'info' : 'neutral'} size="sm">{u.status}</StatusBadge> },
    { key: 'last', header: 'Last active', cell: (u) => <span className="text-subtle">{u.lastActiveAt ? ago(u.lastActiveAt) : '—'}</span>, hideBelow: 'lg' },
  ];

  return (
    <Page>
      <PageHeader title="Users" description="Administrative accounts and the role architecture." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Administrators" subtitle="Full access to Tenant Operations" icon={<IconBox icon={ShieldCheck} tone="primary" size="sm" />} />
          <CardBody>
            <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#312e81] text-[13px] font-semibold text-white">AR</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-foreground">{admin.name}</p>
                <p className="text-[11.5px] text-subtle">{admin.role} · {admin.org}</p>
              </div>
              <StatusBadge tone="success" size="sm">Active</StatusBadge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Role Architecture" subtitle="One role today, designed to scale" icon={<IconBox icon={ShieldCheck} tone="neutral" size="sm" />} />
          <CardBody>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-muted/30 p-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-[12.5px] text-foreground"><span className="font-medium">Admin</span> — the only active role in this release.</span>
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Planned roles</p>
            <div className="flex flex-wrap gap-1.5">
              {FUTURE_ROLES.map((r) => <span key={r} className="rounded-lg border border-border bg-surface-inset px-2.5 py-1 text-[11.5px] text-muted">{r}</span>)}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tenant Portal Users" subtitle={`${users.length} users across all tenants`} icon={<IconBox icon={UserRound} tone="visitor" size="sm" />} />
        <DataTable rows={users} columns={columns} rowKey={(u) => u.id} pageSize={12} />
      </Card>
    </Page>
  );
}
