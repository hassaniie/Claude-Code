/**
 * Notifications center (§32), shared by admin and the portal. Categories across
 * Energy, Visitors and Service; in-app today with the architecture ready for
 * email / SMS / push. Mark read and jump to source. Portal scope is strictly
 * tenant-isolated.
 */

import { Bell, CheckCheck, Filter } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, StatGrid } from '../components/ui/page';
import { Card, CardBody, CardHeader } from '../components/ui/card';
import { PageHeader, StatCard } from '../components/common';
import { Button, IconBox } from '../components/ui/primitives';
import { Segmented } from '../components/ui/tabs';
import { EmptyState } from '../components/ui/data';
import { MODULE_ICON, MODULE_TONE } from '../components/status';
import { simulation, useLive } from '../data/live';
import { useSession } from '../store/session';
import { ago, cn, num } from '../lib/utils';
import type { NotificationDomain } from '../data/types';

export function NotificationsPage({ scope }: { scope: 'admin' | 'tenant' }) {
  const { tenantId } = useSession();
  const navigate = useNavigate();
  const [domain, setDomain] = useState<NotificationDomain | 'all'>('all');

  const all = useLive((w) => w.notifications.filter((n) => (scope === 'tenant' ? n.tenantId === tenantId : true)).map((n) => ({ ...n, tenantName: n.tenantId ? w.tenantById[n.tenantId]?.name : undefined })));
  const shown = all.filter((n) => domain === 'all' || n.domain === domain);
  const unread = all.filter((n) => !n.read).length;

  const byDomain = (d: NotificationDomain) => all.filter((n) => n.domain === d).length;

  return (
    <Page>
      <PageHeader
        title="Notifications"
        description={scope === 'tenant' ? 'Updates for your organization across energy, visitors and service.' : 'Ecosystem notifications across every tenant.'}
        actions={unread > 0 ? <Button variant="secondary" size="sm" onClick={() => simulation.markAllNotificationsRead(scope === 'tenant' ? tenantId : undefined)}><CheckCheck className="h-4 w-4" />Mark all read</Button> : undefined}
      />

      <StatGrid cols={4}>
        <StatCard label="Unread" value={num(unread)} icon={Bell} tone={unread ? 'primary' : 'success'} />
        <StatCard label="Energy" value={num(byDomain('energy'))} icon={MODULE_ICON.energy} tone="energy" />
        <StatCard label="Visitors" value={num(byDomain('visitor'))} icon={MODULE_ICON.visitor} tone="visitor" />
        <StatCard label="Service" value={num(byDomain('service'))} icon={MODULE_ICON.service} tone="service" />
      </StatGrid>

      <Card>
        <CardHeader
          title="All Notifications"
          subtitle={`${shown.length} shown`}
          icon={<IconBox icon={Filter} tone="primary" size="sm" />}
          actions={<Segmented value={domain} onChange={setDomain} options={[{ value: 'all', label: 'All' }, { value: 'energy', label: 'Energy' }, { value: 'visitor', label: 'Visitors' }, { value: 'service', label: 'Service' }]} size="sm" />}
        />
        <CardBody className="flex flex-col gap-1.5">
          {shown.length === 0 ? (
            <EmptyState title="You're all caught up" description="No notifications for this filter." icon={<Bell className="h-5 w-5" />} />
          ) : (
            shown.map((n) => (
              <button
                key={n.id}
                onClick={() => { simulation.markNotificationRead(n.id); if (n.href) navigate(n.href.replace('/admin', scope === 'tenant' ? '/portal' : '/admin').replace('/portal/energy/alerts', '/portal/energy/alerts')); }}
                className={cn('flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors', n.read ? 'border-border-subtle bg-surface hover:border-border-strong' : 'border-primary/20 bg-primary-muted/20 hover:border-primary/40')}
              >
                <IconBox icon={MODULE_ICON[n.domain]} tone={MODULE_TONE[n.domain]} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{n.body}</p>
                  <p className="mt-1 text-[10.5px] text-subtle">{(n as { tenantName?: string }).tenantName && scope === 'admin' ? `${(n as { tenantName?: string }).tenantName} · ` : ''}{ago(n.ts)}</p>
                </div>
              </button>
            ))
          )}
        </CardBody>
      </Card>

      <p className="text-center text-[11px] text-subtle">In-app notifications today. Email, SMS and push channels are architecturally supported and can be enabled per category.</p>
    </Page>
  );
}
